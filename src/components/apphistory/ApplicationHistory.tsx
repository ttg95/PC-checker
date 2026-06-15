import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { AppHistoryEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import { History } from 'lucide-react';

export default function ApplicationHistory() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selected, setSelected] = useState<AppHistoryEntry | null>(null);

  const sources = useMemo(() => ['all', ...Array.from(new Set(results.appHistory.map(e => e.source)))], [results.appHistory]);

  const filtered = useMemo(() => {
    return results.appHistory.filter(item => {
      if (search && !item.programName.toLowerCase().includes(search.toLowerCase()) && !item.path.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      return true;
    });
  }, [results.appHistory, search, riskFilter, flagFilter, sourceFilter]);

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: AppHistoryEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: AppHistoryEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'programName', label: 'Program', sortable: true, render: (item: AppHistoryEntry) => <span className="font-semibold text-slate-200">{item.programName}</span> },
    { key: 'source', label: 'Source', sortable: true, render: (item: AppHistoryEntry) => <SourceBadge source={item.source} /> },
    { key: 'firstSeen', label: 'First Seen', sortable: true, render: (item: AppHistoryEntry) => <span className="text-xs text-slate-400">{formatTimestamp(item.firstSeen)}</span> },
    { key: 'lastSeen', label: 'Last Seen', sortable: true, render: (item: AppHistoryEntry) => <span className="text-xs text-slate-400">{formatTimestamp(item.lastSeen)}</span> },
    { key: 'executionCount', label: 'Runs', sortable: true, render: (item: AppHistoryEntry) => <span className="font-mono text-xs text-slate-300">{item.executionCount ?? '—'}</span> },
    { key: 'path', label: 'Path', render: (item: AppHistoryEntry) => <span className="font-mono text-xs text-slate-400 break-all block">{item.path}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: AppHistoryEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('appHistory', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Application History</h1>
          <p className="text-sm text-slate-400">UserAssist, RecentDocs, Amcache, and Prefetch analysis</p>
        </div>
      </div>

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
            {sources.map(s => <option key={s} value={s}>{s === 'all' ? 'All Sources' : s}</option>)}
          </select>
        }
      />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Application Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button>
            </div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Program Name" value={selected.programName} />
              <Field label="Source" value={selected.source} />
              <Field label="Path" value={selected.path} mono />
              <Field label="First Seen" value={formatTimestamp(selected.firstSeen)} />
              <Field label="Last Seen" value={formatTimestamp(selected.lastSeen)} />
              <Field label="Execution Count" value={selected.executionCount != null ? String(selected.executionCount) : 'Not available'} />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('appHistory', selected.id, s)} />
            </div>
            <p className="text-[10px] text-slate-600 italic">Risk scores indicate "Requires Review" only.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = { UserAssist: 'bg-cyan-500/20 text-cyan-300', RecentDocs: 'bg-emerald-500/20 text-emerald-300', Amcache: 'bg-amber-500/20 text-amber-300', Prefetch: 'bg-blue-500/20 text-blue-300' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors[source] || 'bg-slate-600/20 text-slate-400'}`}>{source}</span>;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
