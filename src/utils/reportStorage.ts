import type { DashboardStats } from '../types';
import { isSupabaseConfigured, supabase, type ScanReportRow, type ScanReviewStatus } from './supabase';

interface UploadReportInput {
  accountId: string;
  displayName: string;
  machineName: string;
  scanTimestamp: string;
  summary: DashboardStats;
  payload: unknown;
}

export async function uploadScanReport({
  accountId,
  displayName,
  machineName,
  scanTimestamp,
  summary,
  payload,
}: UploadReportInput): Promise<ScanReportRow> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Account storage is not configured.');
  }

  const timestamp = Date.now();
  const safeName = displayName.trim() || `Scan ${new Date(scanTimestamp).toLocaleString()}`;
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

  const { data, error: insertError } = await supabase
    .from('scan_reports')
    .insert({
      owner_id: accountId,
      display_name: safeName,
      machine_name: machineName,
      scan_timestamp: scanTimestamp,
      summary,
      report_type: 'json',
      file_path: filePath,
      review_status: 'pending',
    })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return data as ScanReportRow;
}

export async function fetchScanReports({ includeHidden = false }: { includeHidden?: boolean } = {}): Promise<ScanReportRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  let query = supabase
    .from('scan_reports')
    .select('*, profiles:owner_id(email)')
    .order('created_at', { ascending: false });

  if (!includeHidden) {
    query = query.is('hidden_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as ScanReportRow[];
}

export async function updateScanReportReview(reportId: string, status: Exclude<ScanReviewStatus, 'pending'>, reviewerId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Account storage is not configured.');
  }

  const { error } = await supabase
    .from('scan_reports')
    .update({
      review_status: status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) {
    throw error;
  }
}

export async function hideScanReport(reportId: string, masterAccountId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Account storage is not configured.');
  }

  const { error } = await supabase
    .from('scan_reports')
    .update({
      hidden_by: masterAccountId,
      hidden_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) {
    throw error;
  }
}

export async function downloadStoredScanReport(filePath: string): Promise<Blob> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Account storage is not configured.');
  }

  const { data, error } = await supabase.storage
    .from('scan-reports')
    .download(filePath);

  if (error) {
    throw error;
  }

  return data;
}
