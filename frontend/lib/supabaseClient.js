import { createClient } from '@supabase/supabase-js';
import { authClient } from './authClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Data access only (courses, lessons, progress …), always under Row Level
// Security with the signed-in user's token. Authentication is NOT done here:
// `accessToken` hands the client the token the backend API issued, and turns
// off supabase-js's own auth (supabase.auth.* deliberately throws) — sign-in,
// sign-up, password reset and profile edits go through /api/auth instead.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: () => authClient.getAccessToken(),
});
