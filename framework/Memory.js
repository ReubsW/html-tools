/**
 * Memory.js
 * Two-layer memory abstraction.
 *
 * Layer 1 (local):  localStorage — synchronous, always available, survives offline.
 * Layer 2 (cloud):  Supabase — async, requires auth, survives device changes.
 *
 * Tools always get a scoped memory object so keys don't collide:
 *   memory.get('rate')  →  reads 'tool-id:rate'  from storage
 *
 * Behaviour:
 *   - Reads always try local first (fast path), then cloud if user is signed in.
 *   - Writes go to local immediately; cloud write is async (fire-and-forget).
 *   - Tools never need to await a write unless they explicitly want confirmation.
 *   - Cloud data is synced down to local on first read (hydration).
 */

import { Auth }     from './Auth.js';
import { Supabase } from './Supabase.js';

// ── Internal helpers ─────────────────────────────────────────────

function localKey(toolId, memory_key) {
  return `ht:${toolId}:${memory_key}`;
}

function localGet(toolId, memory_key) {
  try {
    const raw = localStorage.getItem(localKey(toolId, memory_key));
    return raw !== null ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function localSet(toolId, memory_key, value) {
  try {
    localStorage.setItem(localKey(toolId, memory_key), JSON.stringify(value));
  } catch (err) {
    console.warn('[Memory] localStorage write failed:', err);
  }
}

function localDelete(toolId, memory_key) {
  localStorage.removeItem(localKey(toolId, memory_key));
}

function localKeys(toolId) {
  const prefix = `ht:${toolId}:`;
  return Object.keys(localStorage)
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length));
}

// ── Cloud helpers (Supabase) ──────────────────────────────────────
// Table: tool_memory (user_id, tool_id, key, value)

async function cloudGet(toolId, memory_key) {
  const db = Supabase.client();
  if (!db || !Auth.user) return undefined;

  const { data, error } = await db
    .from('tool_memory')
    .select('value')
    .eq('user_id', Auth.user.id)
    .eq('tool_id', toolId)
    .eq('key', memory_key)
    .maybeSingle();

  if (error) { console.warn('[Memory] cloud get error:', error.message); return undefined; }
  return data?.value; // already JSON in DB
}

async function cloudSet(toolId, memory_key, value) {
  const db = Supabase.client();
  if (!db || !Auth.user) return;

  const { error } = await db
    .from('tool_memory')
    .upsert(
      { user_id: Auth.user.id, tool_id: toolId, key, value },
      { onConflict: 'user_id,tool_id,key' }
    );

  if (error) console.warn('[Memory] cloud set error:', error.message);
}

async function cloudDelete(toolId, memory_key) {
  const db = Supabase.client();
  if (!db || !Auth.user) return;

  const { error } = await db
    .from('tool_memory')
    .delete()
    .eq('user_id', Auth.user.id)
    .eq('tool_id', toolId)
    .eq('key', memory_key);

  if (error) console.warn('[Memory] cloud delete error:', error.message);
}

// ── Public API (scoped) ───────────────────────────────────────────

function createScope(toolId) {
  return {
    /**
     * Get a value. Returns local immediately; optionally hydrates from cloud.
     * @param {string} key
     * @param {Object} [opts]
     * @param {boolean} [opts.cloud=false]  Force a cloud fetch (async)
     * @returns {any|Promise<any>}
     */
    get(memory_key, { cloud = false } = {}) {
      if (cloud && Auth.user) {
        return cloudGet(toolId, memory_key).then(cloudVal => {
          if (cloudVal !== undefined) {
            localSet(toolId, memory_key, cloudVal); // hydrate local
            return cloudVal;
          }
          return localGet(toolId, memory_key);
        });
      }
      return localGet(toolId, memory_key);
    },

    /**
     * Set a value. Writes to local immediately; queues cloud write.
     * @param {string} key
     * @param {any} value
     */
    set(memory_key, value) {
      localSet(toolId, memory_key, value);
      if (Auth.user) cloudSet(toolId, memory_key, value); // fire-and-forget
    },

    /**
     * Delete a value from both layers.
     * @param {string} key
     */
    delete(memory_key) {
      localDelete(toolId, memory_key);
      if (Auth.user) cloudDelete(toolId, memory_key);
    },

    /**
     * List all keys stored locally for this tool.
     * @returns {string[]}
     */
    keys() {
      return localKeys(toolId);
    },

    /**
     * Clear all local keys for this tool.
     */
    clear() {
      for (const key of localKeys(toolId)) {
        localDelete(toolId, memory_key);
      }
    },
  };
}

export const Memory = {
  /**
   * Returns a memory scope for a given toolId.
   * Tools call: context.memory.get(key) etc.
   */
  scope(toolId) {
    return createScope(toolId);
  },
};
