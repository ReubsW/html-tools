/**
 * env.js
 * Runtime environment config. Loaded before App.js.
 *
 * ⚠ DO NOT commit real credentials to git.
 *
 * For local development: fill in below.
 * For Vercel: set SUPABASE_URL and SUPABASE_ANON_KEY as environment
 *             variables and use the build step in vercel.json to inject them,
 *             OR use Vercel's edge config / a public API route.
 *
 * Simplest approach for a personal tool: paste your anon key here.
 * The Supabase anon key is designed to be public — it is not a secret.
 * Row-level security (RLS) in Supabase handles access control.
 */

window.ENV = {
  SUPABASE_URL:      '',   // e.g. 'https://xyz.supabase.co'
  SUPABASE_ANON_KEY: '',   // e.g. 'eyJhbGci...'
};
