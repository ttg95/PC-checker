import type { DashboardStats } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

interface UploadReportInput {
  accountId: string;
  machineName: string;
  scanTimestamp: string;
  summary: DashboardStats;
  payload: unknown;
}

export async function uploadScanReport({
  accountId,
  machineName,
  scanTimestamp,
  summary,
  payload,
}: UploadReportInput): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const timestamp = Date.now();
  const safeMachine = machineName.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'machine';
  const filePath = `${accountId}/${timestamp}-${safeMachine}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

  const { error: uploadError } = await supabase.storage
    .from('scan-reports')
    .upload(filePath, blob, {
      contentType: 'application/json',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: insertError } = await supabase
    .from('scan_reports')
    .insert({
      owner_id: accountId,
      machine_name: machineName,
      scan_timestamp: scanTimestamp,
      summary,
      report_type: 'json',
      file_path: filePath,
    });

  if (insertError) {
    throw insertError;
  }

  return filePath;
}
