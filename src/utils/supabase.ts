import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseProjectUrl = supabaseUrl || '';
export const supabasePublicAnonKey = supabaseAnonKey || '';

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

export type ScanReviewStatus = 'pending' | 'confirmed_clean' | 'confirmed_cheating';

export interface ScanReportRow {
  id: string;
  owner_id: string;
  display_name: string;
  machine_name: string;
  scan_timestamp: string;
  summary: unknown;
  report_type: string;
  file_path: string;
  review_status: ScanReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: {
    email: string;
  } | null;
}
