/**
 * Auth.js
 * Google OAuth via Supabase Auth.
 *
 * Auth is optional. All tools work without it; they just won't
 * persist to the cloud layer.
 */

import { Supabase } from './Supabase.js';

let _user      = null;
const _listeners = [];

export const Auth = {
  get user() { return _user; },

  async init() {
    // Init Supabase first
    Supabase.init();

    const db = Supabase.client();
    if (!db) return;

    // Restore session if one exists
    const { data: { session } } = await db.auth.getSession();
    _user = session?.user ?? null;

    // Listen for future auth state changes
    db.auth.onAuthStateChange((_event, session) => {
      _user = session?.user ?? null;
      _listeners.forEach(fn => fn(_user));
    });
  },

  async signInWithGoogle() {
    const db = Supabase.client();
    if (!db) { console.warn('[Auth] Supabase not configured'); return; }

    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });

    if (error) console.error('[Auth] sign-in error:', error.message);
  },

  async signOut() {
    const db = Supabase.client();
    if (!db) return;

    const { error } = await db.auth.signOut();
    if (error) console.error('[Auth] sign-out error:', error.message);
  },

  /** Register a callback for auth state changes. */
  onChange(fn) {
    _listeners.push(fn);
  },
};
