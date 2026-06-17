import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseProjectUrl = supabaseUrl || '';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;

export interface ProfileRow {
  id: string;
  email: string;
  role: 'master' | 'standard';
  credits: number | null;
  created_at: string;
  last_login_at: string | null;
}

export interface ExclusionRow {
  id: string;
  term: string;
  created_at: string;
  created_by: string;
}
