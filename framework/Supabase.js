/**
 * Supabase.js
 * Singleton wrapper. Reads config from window.ENV (set in env.js)
 * or directly from the constants below if you prefer to hardcode them
 * during development.
 *
 * The actual supabase-js library is loaded via CDN in index.html
 * and available as window.supabase.
 */

const CONFIG = {
  url:     window.ENV?.SUPABASE_URL     ?? '',
  anonKey: window.ENV?.SUPABASE_ANON_KEY ?? '',
};

let _client = null;

function init() {
  if (!CONFIG.url || !CONFIG.anonKey) {
    console.warn('[Supabase] URL or anon key not set — cloud features disabled. See env.js.');
    return null;
  }

  if (!window.supabase) {
    console.warn('[Supabase] supabase-js not loaded');
    return null;
  }

  _client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);
  return _client;
}

export const Supabase = {
  /** Call once during app init. Returns client or null if not configured. */
  init,

  /** Returns the client, or null if Supabase is not configured. */
  client() {
    return _client;
  },
};
