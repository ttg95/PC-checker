import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { ScheduledTaskEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import { ListChecks } from 'lucide-react';

export default function ScheduledTasks() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ScheduledTaskEntry | null>(null);

  const filtered = useMemo(() => {
    return results.scheduledTasks.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.executablePath.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [results.scheduledTasks, search, riskFilter, flagFilter, statusFilter]);

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: ScheduledTaskEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: ScheduledTaskEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'name', label: 'Task Name', sortable: true, render: (item: ScheduledTaskEntry) => <span className="font-semibold text-slate-200">{item.name}</span> },
    { key: 'executablePath', label: 'Executable', render: (item: ScheduledTaskEntry) => <span className="font-mono text-xs text-slate-400 break-all block">{item.executablePath}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (item: ScheduledTaskEntry) => {
      const s: Record<string, string> = { ready: 'bg-emerald-500/20 text-emerald-300', running: 'bg-blue-500/20 text-blue-300', disabled: 'bg-red-500/20 text-red-300', queued: 'bg-amber-500/20 text-amber-300' };
      return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${s[item.status] || 'bg-slate-600/20 text-slate-400'}`}>{item.status}</span>;
    }},
    { key: 'creationDate', label: 'Created', sortable: true, render: (item: ScheduledTaskEntry) => <span className="text-xs text-slate-400">{formatTimestamp(item.creationDate)}</span> },
    { key: 'lastRunTime', label: 'Last Run', sortable: true, render: (item: ScheduledTaskEntry) => <span className="text-xs text-slate-400">{item.lastRunTime ? formatTimestamp(item.lastRunTime) : 'Never'}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: ScheduledTaskEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('scheduledTasks', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <ListChecks className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduled Tasks</h1>
          <p className="text-sm text-slate-400">Windows Task Scheduler enumeration and analysis</p>
        </div>
      </div>

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
            <option value="all">All Statuses</option><option value="ready">Ready</option><option value="running">Running</option><option value="disabled">Disabled</option><option value="queued">Queued</option>
          </select>
        }
      />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Task Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button>
            </div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Task Name" value={selected.name} />
              <Field label="Task Path" value={selected.path} mono />
              <Field label="Executable Path" value={selected.executablePath} mono />
              <Field label="Status" value={selected.status} />
              <Field label="Creation Date" value={formatTimestamp(selected.creationDate)} />
              <Field label="Last Run Time" value={selected.lastRunTime ? formatTimestamp(selected.lastRunTime) : 'Never'} />
              <Field label="Next Run Time" value={selected.nextRunTime ? formatTimestamp(selected.nextRunTime) : 'Not scheduled'} />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('scheduledTasks', selected.id, s)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
