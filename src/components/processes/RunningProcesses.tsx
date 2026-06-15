import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { ProcessEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import { Activity, ShieldCheck, ShieldX } from 'lucide-react';

export default function RunningProcesses() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [selected, setSelected] = useState<ProcessEntry | null>(null);

  const filtered = useMemo(() => {
    return results.processes.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.path.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      return true;
    });
  }, [results.processes, search, riskFilter, flagFilter]);

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: ProcessEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: ProcessEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'name', label: 'Process', sortable: true, render: (item: ProcessEntry) => <span className="font-semibold text-slate-200">{item.name}</span> },
    { key: 'pid', label: 'PID', sortable: true, render: (item: ProcessEntry) => <span className="font-mono text-xs text-slate-300">{item.pid}</span> },
    { key: 'parentName', label: 'Parent', sortable: true, render: (item: ProcessEntry) => <span className="text-xs text-slate-400">{item.parentName} ({item.parentPid})</span> },
    { key: 'isSigned', label: 'Signed', render: (item: ProcessEntry) => item.isSigned ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldX className="w-4 h-4 text-red-400" /> },
    { key: 'path', label: 'Path', render: (item: ProcessEntry) => <span className="font-mono text-xs text-slate-400 break-all block">{item.path}</span> },
    { key: 'startTime', label: 'Started', sortable: true, render: (item: ProcessEntry) => <span className="text-xs text-slate-400 whitespace-nowrap">{formatTimestamp(item.startTime)}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: ProcessEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('processes', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Running Processes</h1>
          <p className="text-sm text-slate-400">Live process enumeration with signature verification</p>
        </div>
      </div>

      <SearchFilter search={search} onSearchChange={setSearch} riskFilter={riskFilter} onRiskFilterChange={setRiskFilter} flagFilter={flagFilter} onFlagFilterChange={setFlagFilter} resultCount={filtered.length} />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Process Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button>
            </div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Process Name" value={selected.name} />
              <Field label="PID" value={String(selected.pid)} />
              <Field label="Parent Process" value={`${selected.parentName} (PID: ${selected.parentPid})`} />
              <Field label="Path" value={selected.path} mono />
              <Field label="Start Time" value={formatTimestamp(selected.startTime)} />
              <Field label="Digital Signature" value={selected.isSigned ? 'Signed' : 'Unsigned / No signature'} />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('processes', selected.id, s)} />
            </div>
            <p className="text-[10px] text-slate-600 italic">Unsigned processes may warrant manual review. Not automatically indicative of cheating.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
