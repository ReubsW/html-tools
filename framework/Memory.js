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

function localKey(id, memory_key) {
  return `ht:${id}:${memory_key}`;
}

function localGet(id, memory_key) {
  try {
    const raw = localStorage.getItem(localKey(id, memory_key));
    return raw !== null ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function localSet(id, memory_key, memory_value) {
  try {
    localStorage.setItem(localKey(id, memory_key), JSON.stringify(memory_value));
  } catch (err) {
    console.warn('[Memory] localStorage write failed:', err);
  }
}

function localDelete(id, memory_key) {
  localStorage.removeItem(localKey(id, memory_key));
}

function localKeys(id) {
  const prefix = `ht:${id}:`;
  return Object.keys(localStorage)
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length));
}

// ── Cloud helpers (Supabase) ──────────────────────────────────────
// Table: tool_memory (user_id, id, memory_key, memory_value)

async function cloudGet(id, memory_key) {
  const db = Supabase.client();
  if (!db || !Auth.user) return undefined;

  const { data, error } = await db
    .from('tool_memory')
    .select('memory_value')
    .eq('user_id', Auth.user.id)
    .eq('id', id)
    .eq('memory_key', memory_key)
    .maybeSingle();

  if (error) { console.warn('[Memory] cloud get error:', error.message); return undefined; }
  return data?.memory_value; // already JSON in DB
}

async function cloudSet(id, memory_key, memory_value) {
  const db = Supabase.client();
  if (!db || !Auth.user) return;

  const { error } = await db
    .from('tool_memory')
    .upsert(
      { user_id: Auth.user.id, id: id, memory_key, memory_value },
      { onConflict: 'user_id,id,key' }
    );

  if (error) console.warn('[Memory] cloud set error:', error.message);
}

async function cloudDelete(id, memory_key) {
  const db = Supabase.client();
  if (!db || !Auth.user) return;

  const { error } = await db
    .from('tool_memory')
    .delete()
    .eq('user_id', Auth.user.id)
    .eq('id', id)
    .eq('memory_key', memory_key);

  if (error) console.warn('[Memory] cloud delete error:', error.message);
}

// ── Public API (scoped) ───────────────────────────────────────────

function createScope(id) {
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
        return cloudGet(id, memory_key).then(cloudVal => {
          if (cloudVal !== undefined) {
            localSet(id, memory_key, cloudVal); // hydrate local
            return cloudVal;
          }
          return localGet(id, memory_key);
        });
      }
      return localGet(id, memory_key);
    },

    /**
     * Set a value. Writes to local immediately; queues cloud write.
     * @param {string} key
     * @param {any} value
     */
    set(memory_key, memory_value) {
      localSet(id, memory_key, memory_value);
      if (Auth.user) cloudSet(id, memory_key, memory_value); // fire-and-forget
    },

    /**
     * Delete a value from both layers.
     * @param {string} key
     */
    delete(memory_key) {
      localDelete(id, memory_key);
      if (Auth.user) cloudDelete(id, memory_key);
    },

    /**
     * List all keys stored locally for this tool.
     * @returns {string[]}
     */
    keys() {
      return localKeys(id);
    },

    /**
     * Clear all local keys for this tool.
     */
    clear() {
      for (const key of localKeys(id)) {
        localDelete(id, memory_key);
      }
    },
  };
}

export const Memory = {
  /**
   * Returns a memory scope for a given id.
   * Tools call: context.memory.get(key) etc.
   */
  scope(id) {
    return createScope(id);
  },
};
