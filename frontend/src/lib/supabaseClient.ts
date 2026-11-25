/**
 * src/lib/supabaseClient.ts — Supabase JS client
 *
 * One shared client for the whole app. It manages the auth session
 * (storing/refreshing the JWT in localStorage) and is what
 * AuthContext.tsx talks to for sign in / sign up / sign out.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copy frontend/.env.example to frontend/.env and fill in your Supabase project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
