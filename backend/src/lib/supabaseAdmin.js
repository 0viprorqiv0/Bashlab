import { createClient } from '@supabase/supabase-js';

const stateless = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };

// Service-role client for server-side use only. Never expose this key to the frontend.
export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key, stateless);
}

// Anon-key client used to act *as a user* (sign in, sign up, reset email).
// A NEW client per call on purpose: even with persistSession off, supabase-js
// keeps the last signed-in session in memory, so a shared instance could hand
// one user's session to the next request.
export function createSupabaseAnonFactory() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  return () => createClient(url, key, stateless);
}
