import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Ban, CheckCircle2, Crown, Database, Download, Eye, ListChecks, Loader2, Palette, Plus, RotateCcw, ShieldCheck, Trash2, UserPlus, Users, XCircle, Clock } from 'lucide-react';
import { useAccounts, type Account } from '../../utils/AccountContext';
import { useScan } from '../../utils/ScanContext';
import { useTheme, type AppTheme } from '../../utils/ThemeContext';
import { useNavigationOrder, type NavItemId } from '../../utils/NavigationContext';
import { cheatProviders, defaultRules, nonStandardPaths } from '../../utils/riskEngine';
import { formatTimestamp } from '../../utils/id';
import { downloadStoredScanReport, fetchScanReports, updateScanReportReview } from '../../utils/reportStorage';
import type { ScanResult } from '../../types';
import type { ScanReportRow, ScanReviewStatus } from '../../utils/supabase';

export default function MasterSettings() {
  const navigate = useNavigate();
  const {
    accounts,
    activeAccount,
    exclusions,
    createAccount,
    addCredits,
    setCredits,
    addExclusion,
    removeExclusion,
    isSupabaseBacked,
  } = useAccounts();
  const { loadReviewScan } = useScan();
  const { theme, glowBorders, saveGlobalAppearance } = useTheme();
  const { orderedItems, navOrder, saveGlobalNavOrder, resetGlobalNavOrder } = useNavigationOrder();
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [initialCredits, setInitialCredits] = useState(5);
  const [creditEdits, setCreditEdits] = useState<Record<string, number>>({});
  const [exclusionTerm, setExclusionTerm] = useState('');
  const [scanReports, setScanReports] = useState<ScanReportRow[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [openingReviewId, setOpeningReviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadScanReports = async () => {
    if (!isSupabaseBacked) {
      setScanReports([]);
      return;
    }

    setIsReportsLoading(true);
    try {
      setScanReports(await fetchScanReports());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load uploaded scans.');
    } finally {
      setIsReportsLoading(false);
    }
  };

  useEffect(() => {
    void loadScanReports();
  }, [isSupabaseBacked]);

  const handleCreate = async () => {
    setMessage(null);
    setError(null);
    try {
      await createAccount({
        email: createEmail,
        password: createPassword,
        initialCredits,
      });
      setCreateEmail('');
      setCreatePassword('');
      setInitialCredits(5);
      setMessage('Account created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    }
  };

  const handleAddExclusion = async () => {
    setMessage(null);
    setError(null);
    try {
      await addExclusion(exclusionTerm);
      setExclusionTerm('');
      setMessage('Exclusion added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add exclusion.');
    }
  };

  const handleRemoveExclusion = async (id: string) => {
    setMessage(null);
    setError(null);
    try {
      await removeExclusion(id);
      setMessage('Exclusion removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove exclusion.');
    }
  };

  const handleThemeChange = async (nextTheme: AppTheme) => {
    setMessage(null);
    setError(null);
    try {
      await saveGlobalAppearance({ theme: nextTheme, glowBorders });
      setMessage('Color scheme updated for all connected copies.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update color scheme.');
    }
  };

  const handleGlowChange = async (enabled: boolean) => {
    setMessage(null);
    setError(null);
    try {
      await saveGlobalAppearance({ theme, glowBorders: enabled });
      setMessage(enabled ? 'Static glowing borders enabled.' : 'Static glowing borders disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update border glow.');
    }
  };

  const handleMoveNavItem = async (id: NavItemId, direction: -1 | 1) => {
    setMessage(null);
    setError(null);
    const index = navOrder.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= navOrder.length) return;

    const nextOrder = [...navOrder];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];

    try {
      await saveGlobalNavOrder(nextOrder);
      setMessage('Tab order updated for all connected copies.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tab order.');
    }
  };

  const handleResetNavOrder = async () => {
    setMessage(null);
    setError(null);
    try {
      await resetGlobalNavOrder();
      setMessage('Tab order reset.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset tab order.');
    }
  };

  const handleReview = async (reportId: string, status: Exclude<ScanReviewStatus, 'pending'>) => {
    if (!activeAccount) return;
    setMessage(null);
    setError(null);
    setReviewingId(`${reportId}:${status}`);
    try {
      await updateScanReportReview(reportId, status, activeAccount.id);
      await loadScanReports();
      setMessage(status === 'confirmed_clean' ? 'Scan marked clean.' : 'Scan marked failed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update scan review.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleDownloadReport = async (report: ScanReportRow) => {
    setMessage(null);
    setError(null);
    setDownloadingId(report.id);
    try {
      const blob = await downloadStoredScanReport(report.file_path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.display_name.replace(/[^a-z0-9_-]+/gi, '-') || 'scan-report'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download scan report.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenReview = async (report: ScanReportRow) => {
    setMessage(null);
    setError(null);
    setOpeningReviewId(report.id);
    try {
      const blob = await downloadStoredScanReport(report.file_path);
      const payload = JSON.parse(await blob.text()) as unknown;
      const reviewResults = extractScanResults(payload);

      loadReviewScan({
        id: report.id,
        displayName: report.display_name,
        machineName: report.machine_name,
        submittedBy: report.profiles?.email || report.owner_id,
        scanTimestamp: report.scan_timestamp,
      }, reviewResults);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open scan inside the app.');
    } finally {
      setOpeningReviewId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Crown className="w-6 h-6 text-amber-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Master Settings</h1>
          <p className="text-sm text-slate-400">Global account, credit, trigger, exclusion, and appearance controls</p>
        </div>
      </div>

      {(message || error) && (
        <div className={`border rounded-lg px-4 py-3 text-sm ${error ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
          {error || message}
        </div>
      )}

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Uploaded Scan Reviews</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadScanReports()}
            disabled={!isSupabaseBacked || isReportsLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:border-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReportsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Refresh
          </button>
        </div>

        {!isSupabaseBacked && <p className="text-sm text-amber-300">Database review is disabled until Supabase environment keys are configured.</p>}
        {isSupabaseBacked && scanReports.length === 0 && !isReportsLoading && <p className="text-sm text-slate-500">No scans have been uploaded yet.</p>}

        {scanReports.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">Scan</th>
                  <th className="text-left px-4 py-3">Account</th>
                  <th className="text-left px-4 py-3">Summary</th>
                  <th className="text-left px-4 py-3">Review</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {scanReports.map(report => {
                  const summary = getReportSummary(report);
                  return (
                    <tr key={report.id} className="bg-slate-900/40 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-100">{report.display_name}</p>
                        <p className="text-xs text-slate-500">{report.machine_name} - {formatTimestamp(report.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300 break-all">{report.profiles?.email || report.owner_id}</td>
                      <td className="px-4 py-3 text-slate-300">
                        <span>{summary.highRisk + summary.mediumRisk + summary.lowRisk} triggers</span>
                        <span className="mx-2 text-slate-600">/</span>
                        <span className="text-red-300">{summary.highRisk} high</span>
                        <span className="mx-2 text-slate-600">/</span>
                        <span className="text-amber-300">{summary.mediumRisk} medium</span>
                      </td>
                      <td className="px-4 py-3"><ReviewBadge status={report.review_status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleOpenReview(report)}
                            disabled={openingReviewId !== null}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                          >
                            {openingReviewId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownloadReport(report)}
                            disabled={downloadingId === report.id}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                          >
                            {downloadingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReview(report.id, 'confirmed_clean')}
                            disabled={reviewingId !== null}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            {reviewingId === `${report.id}:confirmed_clean` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Tick
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReview(report.id, 'confirmed_cheating')}
                            disabled={reviewingId !== null}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {reviewingId === `${report.id}:confirmed_cheating` ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Fail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Global Appearance</h2>
          </div>
          <button
            type="button"
            onClick={() => void handleGlowChange(!glowBorders)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              glowBorders ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-cyan-500/40'
            }`}
          >
            <span className={`h-3 w-3 rounded-full border ${glowBorders ? 'border-cyan-300 bg-cyan-400 shadow-lg shadow-cyan-500/30' : 'border-slate-500 bg-slate-700'}`} />
            Static glowing borders
          </button>
        </div>
        <p className="text-xs text-slate-500">Applies app background, panels, tables, borders, buttons, active highlights, and border glow across all connected copies.</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {themeOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => void handleThemeChange(option.value)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                theme === option.value ? 'border-white bg-slate-800' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-white/20">
                <span className="col-span-2" style={{ background: option.background }} />
                <span style={{ background: option.table }} />
                <span style={{ background: option.border }} />
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-100">{option.label}</span>
                <span className="block text-xs text-slate-500">{theme === option.value ? 'Active' : 'Apply globally'}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Sidebar Tab Order</h2>
          </div>
          <button
            type="button"
            onClick={() => void handleResetNavOrder()}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-cyan-500/40"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {orderedItems.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">{index + 1}. {item.label}</p>
                {item.masterOnly && <p className="text-[10px] uppercase tracking-wider text-amber-300">Master only</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleMoveNavItem(item.id, -1)}
                  disabled={index === 0}
                  className="rounded border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:border-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Move ${item.label} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleMoveNavItem(item.id, 1)}
                  disabled={index === orderedItems.length - 1}
                  className="rounded border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:border-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Move ${item.label} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Create Account</h2>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto] gap-3 items-end">
          <AccountInput label="Email" type="email" value={createEmail} onChange={setCreateEmail} />
          <AccountInput label="Password" type="password" value={createPassword} onChange={setCreatePassword} />
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Starting Credits</label>
            <input
              type="number"
              min={0}
              value={initialCredits}
              onChange={e => setInitialCredits(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button onClick={() => void handleCreate()} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400">
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Account Credits</h2>
        </div>
        <div className="space-y-3">
          {accounts.map(account => (
            <div key={account.id} className="grid xl:grid-cols-[minmax(0,1fr)_auto] gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white break-all">{account.email}</p>
                  <RoleBadge account={account} />
                  {activeAccount?.id === account.id && <span className="text-[10px] uppercase tracking-wider text-cyan-300">Active</span>}
                </div>
                <p className="text-xs text-slate-500 mt-1">Created {formatTimestamp(account.createdAt)} - Last login {account.lastLoginAt ? formatTimestamp(account.lastLoginAt) : 'Never'}</p>
                <p className="text-sm text-slate-300 mt-2">{account.credits === null ? 'Unlimited credits' : `${account.credits} scan credit${account.credits === 1 ? '' : 's'}`}</p>
              </div>
              {account.credits !== null && (
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => void addCredits(account.id, 1)} className="px-3 py-2 rounded-lg bg-slate-700 text-sm text-slate-100 hover:bg-slate-600">+1</button>
                  <button onClick={() => void addCredits(account.id, 5)} className="px-3 py-2 rounded-lg bg-slate-700 text-sm text-slate-100 hover:bg-slate-600">+5</button>
                  <input
                    type="number"
                    min={0}
                    value={creditEdits[account.id] ?? account.credits}
                    onChange={e => setCreditEdits(prev => ({ ...prev, [account.id]: Number(e.target.value) }))}
                    className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button onClick={() => void setCredits(account.id, creditEdits[account.id] ?? account.credits)} className="px-3 py-2 rounded-lg bg-cyan-500 text-sm text-white hover:bg-cyan-400">Set</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-300" />
          <h2 className="text-sm font-semibold text-slate-200">Trigger Reference and Exclusions</h2>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] gap-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rules and Corresponding Triggers</h3>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 min-w-64">Rule</th>
                    <th className="text-left px-4 py-3 min-w-80">Trigger</th>
                    <th className="text-left px-4 py-3 min-w-28">Level</th>
                    <th className="text-left px-4 py-3 min-w-24">Weight</th>
                    <th className="text-left px-4 py-3 min-w-96">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {defaultRules.map(rule => (
                    <tr key={rule.id} className="bg-slate-900/40">
                      <td className="px-4 py-3 text-slate-100 font-medium">{rule.name}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs break-all">{rule.condition}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-xs uppercase">{rule.riskLevel}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{rule.weight}</td>
                      <td className="px-4 py-3 text-slate-400">{rule.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <TriggerList title="Cheat Provider Terms" items={cheatProviders} />
            <TriggerList title="Non-standard Paths" items={nonStandardPaths} />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Exclusion List</h3>
          </div>
          <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-3">
            <input
              value={exclusionTerm}
              onChange={e => setExclusionTerm(e.target.value)}
              placeholder="Path, process name, device id, registry key, or trigger text"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
            <button onClick={() => void handleAddExclusion()} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-sm font-medium text-white hover:bg-cyan-400">
              <Plus className="w-4 h-4" />
              Add Exclusion
            </button>
          </div>
          <div className="space-y-2">
            {exclusions.map(exclusion => (
              <div key={exclusion.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <div>
                  <p className="text-sm text-slate-100 break-all">{exclusion.term}</p>
                  <p className="text-xs text-slate-500">Added {formatTimestamp(exclusion.createdAt)}</p>
                </div>
                <button onClick={() => void handleRemoveExclusion(exclusion.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10" aria-label="Remove exclusion">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {exclusions.length === 0 && <p className="text-sm text-slate-500">No exclusions have been added.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

const themeOptions: { value: AppTheme; label: string; background: string; table: string; border: string }[] = [
  { value: 'cyan', label: 'Cyan', background: '#020617', table: '#1e293b', border: '#334155' },
  { value: 'emerald', label: 'Emerald', background: '#02130f', table: '#082f25', border: '#065f46' },
  { value: 'teal', label: 'Teal', background: '#031312', table: '#134e4a', border: '#0f766e' },
  { value: 'sky', label: 'Sky', background: '#06111a', table: '#0c4a6e', border: '#0369a1' },
  { value: 'blue', label: 'Blue', background: '#07111f', table: '#172554', border: '#1d4ed8' },
  { value: 'indigo', label: 'Indigo', background: '#0b0c1d', table: '#312e81', border: '#4338ca' },
  { value: 'violet', label: 'Violet', background: '#10091f', table: '#2e1065', border: '#5b21b6' },
  { value: 'fuchsia', label: 'Fuchsia', background: '#170719', table: '#4a044e', border: '#86198f' },
  { value: 'pink', label: 'Pink', background: '#180713', table: '#50072e', border: '#be185d' },
  { value: 'rose', label: 'Rose', background: '#18070c', table: '#4c0519', border: '#9f1239' },
  { value: 'red', label: 'Red', background: '#170707', table: '#450a0a', border: '#991b1b' },
  { value: 'amber', label: 'Amber', background: '#170f03', table: '#452b08', border: '#92400e' },
  { value: 'orange', label: 'Orange', background: '#180d04', table: '#43200a', border: '#9a3412' },
  { value: 'lime', label: 'Lime', background: '#0b1304', table: '#25340a', border: '#4d7c0f' },
  { value: 'white', label: 'Steel', background: '#111827', table: '#374151', border: '#64748b' },
  { value: 'zinc', label: 'Zinc', background: '#09090b', table: '#27272a', border: '#71717a' },
];

function AccountInput({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  );
}

function RoleBadge({ account }: { account: Account }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${account.role === 'master' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-600/30 text-slate-300'}`}>
      {account.role === 'master' && <Crown className="w-3 h-3" />}
      {account.role}
    </span>
  );
}

function TriggerList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span key={item} className="px-2 py-1 rounded bg-slate-900 text-xs text-slate-300 border border-slate-700/50 break-all">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReviewBadge({ status }: { status: ScanReviewStatus }) {
  if (status === 'confirmed_clean') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
        <CheckCircle2 className="w-4 h-4" />
        Clean
      </span>
    );
  }

  if (status === 'confirmed_cheating') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300">
        <XCircle className="w-4 h-4" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300">
      <Clock className="w-4 h-4" />
      Pending
    </span>
  );
}

function getReportSummary(report: ScanReportRow) {
  const summary = report.summary && typeof report.summary === 'object'
    ? report.summary as Partial<Record<'totalFindings' | 'highRisk' | 'mediumRisk' | 'lowRisk', number>>
    : {};

  return {
    totalFindings: Number(summary.totalFindings ?? 0),
    highRisk: Number(summary.highRisk ?? 0),
    mediumRisk: Number(summary.mediumRisk ?? 0),
    lowRisk: Number(summary.lowRisk ?? 0),
  };
}

function extractScanResults(payload: unknown): ScanResult {
  const record = isRecord(payload) ? payload : null;
  const possibleResults = record && isRecord(record.results) ? record.results : record;

  if (!isScanResultShape(possibleResults)) {
    throw new Error('The uploaded report does not contain readable scan data.');
  }

  return {
    registry: possibleResults.registry,
    events: possibleResults.events,
    appHistory: possibleResults.appHistory,
    services: possibleResults.services,
    processes: possibleResults.processes,
    scheduledTasks: possibleResults.scheduledTasks,
    dmaDevices: possibleResults.dmaDevices,
    fileSystem: possibleResults.fileSystem,
    systemInfo: possibleResults.systemInfo,
  };
}

function isScanResultShape(value: unknown): value is ScanResult {
  if (!isRecord(value)) return false;

  return [
    'registry',
    'events',
    'appHistory',
    'services',
    'processes',
    'scheduledTasks',
    'dmaDevices',
    'fileSystem',
    'systemInfo',
  ].every(key => Array.isArray(value[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
