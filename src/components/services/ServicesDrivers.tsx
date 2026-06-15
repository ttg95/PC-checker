import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { ServiceEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import { Cpu, AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react';

export default function ServicesDrivers() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'driver'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ServiceEntry | null>(null);

  const filtered = useMemo(() => {
    return results.services.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.displayName.toLowerCase().includes(search.toLowerCase()) && !item.path.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [results.services, search, riskFilter, flagFilter, typeFilter, statusFilter]);

  const recentCount = filtered.filter(i => i.installDate && (Date.now() - new Date(i.installDate).getTime()) < 7 * 86400000).length;
  const unsignedCount = filtered.filter(i => i.isSigned === false).length;
  const disabledCount = filtered.filter(i => i.status === 'disabled').length;

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: ServiceEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: ServiceEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'type', label: 'Type', sortable: true, render: (item: ServiceEntry) => <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${item.type === 'driver' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>{item.type}</span> },
    { key: 'name', label: 'Name', sortable: true, render: (item: ServiceEntry) => <span className="font-mono text-xs text-cyan-300">{item.name}</span> },
    { key: 'displayName', label: 'Display Name', sortable: true, render: (item: ServiceEntry) => <span className="text-sm text-slate-200">{item.displayName}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (item: ServiceEntry) => <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${item.status === 'running' ? 'bg-emerald-500/20 text-emerald-300' : item.status === 'disabled' ? 'bg-red-500/20 text-red-300' : 'bg-slate-600/20 text-slate-400'}`}>{item.status}</span> },
    { key: 'isSigned', label: 'Signed', render: (item: ServiceEntry) => item.isSigned === true ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : item.isSigned === false ? <ShieldX className="w-4 h-4 text-red-400" /> : <span className="text-xs text-slate-500">Unknown</span> },
    { key: 'startType', label: 'Start', sortable: true, render: (item: ServiceEntry) => <span className="text-xs text-slate-400 capitalize">{item.startType}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: ServiceEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('services', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Cpu className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Services & Drivers</h1>
          <p className="text-sm text-slate-400">Installed services and kernel drivers enumeration</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <HighlightCard icon={<AlertTriangle className="w-4 h-4 text-red-400" />} label="Recently Installed (7d)" count={recentCount} bg="bg-red-500/10" />
        <HighlightCard icon={<ShieldX className="w-4 h-4 text-amber-400" />} label="Unsigned" count={unsignedCount} bg="bg-amber-500/10" />
        <HighlightCard icon={<Cpu className="w-4 h-4 text-slate-400" />} label="Disabled Services" count={disabledCount} bg="bg-slate-500/10" />
      </div>

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
              <option value="all">All Types</option><option value="service">Services</option><option value="driver">Drivers</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
              <option value="all">All Statuses</option><option value="running">Running</option><option value="stopped">Stopped</option><option value="disabled">Disabled</option>
            </select>
          </>
        }
      />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Service Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button>
            </div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Name" value={selected.name} mono />
              <Field label="Display Name" value={selected.displayName} />
              <Field label="Type" value={selected.type} />
              <Field label="Status" value={selected.status} />
              <Field label="Start Type" value={selected.startType} />
              <Field label="Path" value={selected.path} mono />
              <Field label="Install Date" value={selected.installDate ? formatTimestamp(selected.installDate) : 'Unknown'} />
              <Field label="Digitally Signed" value={selected.isSigned === true ? 'Yes' : selected.isSigned === false ? 'No' : 'Unknown'} />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('services', selected.id, s)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightCard({ icon, label, count, bg }: { icon: React.ReactNode; label: string; count: number; bg: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
      <div><p className="text-lg font-bold text-white">{count}</p><p className="text-xs text-slate-400">{label}</p></div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
