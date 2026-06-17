import { createClient } from '@supabase/supabase-js';

export type UserProfile = {
  id: string;
  email: string;
  credits: number;
  is_master: boolean;
  created_at: string;
  updated_at: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = supabase !== null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Account service is not configured. Check the app environment, then restart the app.');
  }

  return supabase;
}
