import { useEffect, useState } from 'react';
import { useScan } from '../../utils/ScanContext';
import { useAccounts } from '../../utils/AccountContext';
import { RiskBadge } from '../common/RiskBadge';
import { isKnownCheatProvider } from '../../utils/riskEngine';
import { getMachineName, formatTimestamp } from '../../utils/id';
import { fetchScanReports, uploadScanReport } from '../../utils/reportStorage';
import type { ScanReportRow, ScanReviewStatus } from '../../utils/supabase';
import { Shield, AlertTriangle, CheckCircle2, Play, Loader2, ChevronRight, ShieldX, UploadCloud, Database, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  console.log('Dashboard component rendering');
  const [showAllCheatMatches, setShowAllCheatMatches] = useState(false);
  const [scanName, setScanName] = useState('');
  const [uploadedReports, setUploadedReports] = useState<ScanReportRow[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { progress, isScanning, startScan, getStats, results } = useScan();
  const { activeAccount, canRunScan, creditLabel, isSupabaseBacked } = useAccounts();
  const stats = getStats();
  const scanComplete = stats.scansComplete === stats.totalScans;
  const hasResults = Object.values(results).some(arr => arr.length > 0);
  const riskTriggerTotal = stats.highRisk + stats.mediumRisk + stats.lowRisk;
  const scanPercent = progress.length > 0
    ? Math.round(progress.reduce((sum, item) => sum + item.progress, 0) / progress.length)
    : 0;
  const scanError = progress.find(item => item.status === 'error')?.error;

  const unsignedRegCount = results.registry.filter(r => r.isSigned === false).length;
  const cheatProviderHits = [
    ...results.registry, ...results.appHistory, ...results.processes, ...results.fileSystem,
  ].filter(i => isKnownCheatProvider(`${(i as unknown as Record<string, unknown>).path || ''} ${(i as unknown as Record<string, unknown>).name || ''} ${(i as unknown as Record<string, unknown>).keyName || ''} ${(i as unknown as Record<string, unknown>).valueData || ''}`));
  const visibleCheatProviderHits = showAllCheatMatches ? cheatProviderHits : cheatProviderHits.slice(0, 5);

  const loadUploadedReports = async () => {
    if (!activeAccount || !isSupabaseBacked) {
      setUploadedReports([]);
      return;
    }

    setIsLoadingReports(true);
    try {
      const rows = await fetchScanReports();
      setUploadedReports(rows.filter(row => row.owner_id === activeAccount.id));
    } catch {
      setUploadedReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    void loadUploadedReports();
  }, [activeAccount, isSupabaseBacked]);

  const handleUploadScan = async () => {
    setUploadStatus(null);
    setUploadError(null);

    if (!activeAccount) {
      setUploadError('Sign in before uploading a scan.');
      return;
    }
    if (!isSupabaseBacked) {
      setUploadError('Database uploads need Supabase to be configured.');
      return;
    }
    if (!hasResults) {
      setUploadError('Run a scan before uploading.');
      return;
    }

    const displayName = scanName.trim();
    if (displayName.length < 2) {
      setUploadError('Name this scan before uploading.');
      return;
    }

    setIsUploading(true);
    try {
      const scanTimestamp = new Date().toISOString();
      const report = await uploadScanReport({
        accountId: activeAccount.id,
        displayName,
        machineName: getMachineName(),
        scanTimestamp,
        summary: stats,
        payload: {
          reportHeader: {
            tool: 'PC Checker',
            version: '1.0.0',
            displayName,
            machineName: getMachineName(),
            submittedBy: activeAccount.email,
            scanTimestamp,
            summary: stats,
            disclaimer: 'Risk scores indicate "Requires Review" only. This tool never automatically labels software as cheating.',
          },
          results,
        },
      });
      setScanName('');
      setUploadedReports(prev => [report, ...prev.filter(item => item.id !== report.id)]);
      setUploadStatus(`Uploaded "${displayName}" for master review.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not upload scan.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">PC forensic check for tournament anti-cheat review</p>
        </div>
        <button
          onClick={startScan}
          disabled={isScanning || !canRunScan}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
            isScanning || !canRunScan ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
          }`}
        >
          {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Play className="w-4 h-4" /> {!activeAccount ? 'Account Required' : !canRunScan ? 'No Credits' : hasResults ? 'Rescan System' : 'Start Full Scan'}</>}
        </button>
      </div>

      <div className={`border rounded-lg p-4 flex items-center justify-between gap-4 ${canRunScan ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Account</p>
          <p className="text-sm text-slate-200">{activeAccount ? activeAccount.email : 'No account signed in'}</p>
        </div>
        <p className={`text-sm font-semibold ${canRunScan ? 'text-cyan-300' : 'text-amber-300'}`}>{creditLabel}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Shield className="w-5 h-5 text-cyan-400" />} label="Total Potential Risks/Triggers" value={riskTriggerTotal} accent="cyan" />
        <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />} label="High Risk" value={stats.highRisk} accent="red" />
        <StatCard icon={<ShieldX className="w-5 h-5 text-amber-400" />} label="SIGN.MEDIA Fails" value={unsignedRegCount} accent="amber" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="Scans Complete" value={`${stats.scansComplete}/${stats.totalScans}`} accent="emerald" />
      </div>

      {hasResults && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-4 gap-3">
            <RiskBucket label="High" count={stats.highRisk} color="bg-red-500" total={stats.totalFindings} />
            <RiskBucket label="Medium" count={stats.mediumRisk} color="bg-amber-500" total={stats.totalFindings} />
            <RiskBucket label="Low" count={stats.lowRisk} color="bg-yellow-500" total={stats.totalFindings} />
            <RiskBucket label="Clean" count={stats.totalFindings - riskTriggerTotal} color="bg-slate-600" total={stats.totalFindings} />
          </div>
        </div>
      )}

      {hasResults && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Upload to Database</h2>
          </div>
          {(uploadStatus || uploadError) && (
            <div className={`border rounded-lg px-3 py-2 text-sm ${uploadError ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
              {uploadError || uploadStatus}
            </div>
          )}
          <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-3">
            <input
              value={scanName}
              onChange={e => setScanName(e.target.value)}
              placeholder="Scan name, player name, match ID, or ticket number"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              type="button"
              onClick={() => void handleUploadScan()}
              disabled={!activeAccount || !isSupabaseBacked || isUploading}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-sm font-medium text-white hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isUploading ? 'Uploading...' : 'Upload Scan'}
            </button>
          </div>
          {!isSupabaseBacked && <p className="text-xs text-amber-300">Database uploads are disabled until Supabase environment keys are configured.</p>}
        </div>
      )}

      {uploadedReports.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Uploaded Scan Reviews</h2>
            <button
              type="button"
              onClick={() => void loadUploadedReports()}
              disabled={isLoadingReports}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:border-cyan-500/40 disabled:opacity-50"
            >
              {isLoadingReports && <Loader2 className="w-4 h-4 animate-spin" />}
              Refresh
            </button>
          </div>
          <div className="space-y-2">
            {uploadedReports.slice(0, 5).map(report => (
              <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-slate-100">{report.display_name}</p>
                  <p className="text-xs text-slate-500">{formatTimestamp(report.created_at)} - {report.machine_name}</p>
                </div>
                <ReviewBadge status={report.review_status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cheat Provider Hits */}
      {cheatProviderHits.length > 0 && (
        <div className="bg-slate-900/60 border border-red-500/30 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-red-400">Known Cheat Provider Matches - Requires Review</h2>
            {cheatProviderHits.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllCheatMatches(value => !value)}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-200 hover:bg-red-500/20"
              >
                {showAllCheatMatches ? 'Show Less' : `Display All (${cheatProviderHits.length})`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {visibleCheatProviderHits.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <RiskBadge level="high" />
                <span className="text-sm text-slate-300 flex-1 truncate">{String((item as unknown as Record<string, unknown>).path || (item as unknown as Record<string, unknown>).keyName || (item as unknown as Record<string, unknown>).name || '')}</span>
              </div>
            ))}
            {cheatProviderHits.length > 5 && !showAllCheatMatches && <p className="text-xs text-slate-500 text-center pt-2">...and {cheatProviderHits.length - 5} more matches</p>}
          </div>
        </div>
      )}

      {progress.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Scan Progress</h2>
            <span className={`text-4xl font-bold ${scanError ? 'text-red-400' : scanPercent >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>{scanPercent}%</span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scanError ? 'bg-red-500' : scanPercent >= 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
              style={{ width: `${scanPercent}%` }}
            />
          </div>
          {scanError && <p className="text-sm text-red-300 mt-3">{scanError}</p>}
        </div>
      )}

      {!hasResults && !isScanning && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="w-16 h-16 text-slate-700 mb-4" />
          <h2 className="text-lg font-semibold text-slate-400">No Scan Data Yet</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md">Click "Start Full Scan" to begin a comprehensive PC forensic check. All analysis is read-only and requires consent.</p>
        </div>
      )}

      {scanComplete && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { to: '/registry', label: 'Registry Analysis', count: results.registry.length, highlight: unsignedRegCount },
            { to: '/events', label: 'Event Viewer', count: results.events.length },
            { to: '/apphistory', label: 'Application History', count: results.appHistory.length },
            { to: '/services', label: 'Services & Drivers', count: results.services.length },
            { to: '/dma', label: 'DMA / PCIe', count: results.dmaDevices.length },
            { to: '/filesystem', label: 'File System', count: results.fileSystem.length },
            { to: '/systeminfo', label: 'System Info', count: results.systemInfo.length },
            { to: '/processes', label: 'Running Processes', count: results.processes.length },
            { to: '/tasks', label: 'Scheduled Tasks', count: results.scheduledTasks.length },
          ].map(({ to, label, count, highlight }) => (
            <Link key={to} to={to} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-700/50 rounded-lg hover:border-cyan-500/30 transition-colors group">
              <div>
                <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">{label}</p>
                <p className="text-xs text-slate-500">{count} triggers{highlight ? ` (${highlight} unsigned)` : ''}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewBadge({ status }: { status: ScanReviewStatus }) {
  if (status === 'confirmed_clean') {
    return <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300"><CheckCircle2 className="w-4 h-4" /> Clean</span>;
  }

  if (status === 'confirmed_cheating') {
    return <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300"><XCircle className="w-4 h-4" /> Failed</span>;
  }

  return <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300"><Clock className="w-4 h-4" /> Pending</span>;
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  const bgClass = accent === 'cyan' ? 'bg-cyan-500/10' : accent === 'red' ? 'bg-red-500/10' : accent === 'amber' ? 'bg-amber-500/10' : 'bg-emerald-500/10';
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${bgClass}`}>{icon}</div><div><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs text-slate-400">{label}</p></div></div>
    </div>
  );
}

function RiskBucket({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (<div className="text-center"><div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div><p className="text-lg font-bold text-white">{count}</p><p className="text-xs text-slate-400">{label}</p></div>);
}
