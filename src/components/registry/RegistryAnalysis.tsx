import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { RegistryEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import { Database, ShieldX } from 'lucide-react';

const catLabels: Record<string, string> = {
  primary: 'Primary Key', secondary: 'Secondary Key', startup: 'Startup', uninstall: 'Uninstall', sign_media: 'SIGN.MEDIA',
};

export default function RegistryAnalysis() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<RegistryEntry | null>(null);

  const categories = useMemo(() => ['all', ...Array.from(new Set(results.registry.map(r => r.category)))], [results.registry]);

  const filtered = useMemo(() => {
    return results.registry.filter(item => {
      if (search && !item.path.toLowerCase().includes(search.toLowerCase()) && !item.keyName.toLowerCase().includes(search.toLowerCase()) && !item.valueData.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [results.registry, search, riskFilter, flagFilter, categoryFilter]);

  const unsignedCount = filtered.filter(i => i.isSigned === false).length;

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: RegistryEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: RegistryEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'category', label: 'Category', sortable: true, render: (item: RegistryEntry) => <CategoryBadge category={item.category} /> },
    { key: 'isSigned', label: 'Signed', render: (item: RegistryEntry) => item.isSigned === true ? <span className="text-xs text-emerald-400">Yes</span> : item.isSigned === false ? <span className="flex items-center gap-1 text-xs text-red-400"><ShieldX className="w-3 h-3" /> No</span> : <span className="text-xs text-slate-500">N/A</span> },
    { key: 'path', label: 'Registry Path', sortable: true, render: (item: RegistryEntry) => <span className="font-mono text-xs text-cyan-300">{item.path}</span> },
    { key: 'keyName', label: 'Key', sortable: true, render: (item: RegistryEntry) => <span className="font-semibold text-slate-200">{item.keyName}</span> },
    { key: 'valueData', label: 'Value', render: (item: RegistryEntry) => <span className="font-mono text-xs text-slate-400 break-all block">{item.valueData}</span> },
    { key: 'lastWriteTime', label: 'Last Write', sortable: true, render: (item: RegistryEntry) => <span className="text-xs text-slate-400">{formatTimestamp(item.lastWriteTime)}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: RegistryEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('registry', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Registry Analysis</h1>
          <p className="text-sm text-slate-400">Primary/secondary registry keys, SIGN.MEDIA check, MuiCache, CompatAssistant, BAM, Defender exclusions</p>
        </div>
      </div>

      {unsignedCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <ShieldX className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300"><span className="font-bold">{unsignedCount}</span> unsigned executables found in registry (SIGN.MEDIA check) — requires manual review</p>
        </div>
      )}

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : (catLabels[c] || c.replace('_', ' '))}</option>)}
          </select>
        }
      />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onFlag={s => updateFlagStatus('registry', selected.id, s)} />}
    </div>
  );
}

function CategoryBadge({ category }: { category: RegistryEntry['category'] }) {
  const styles: Record<string, string> = {
    primary: 'bg-red-500/20 text-red-300 border-red-500/30',
    secondary: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    startup: 'bg-red-500/20 text-red-300 border-red-500/30',
    uninstall: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    sign_media: 'bg-red-600/20 text-red-200 border-red-600/30',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${styles[category]}`}>{catLabels[category] || category}</span>;
}

function DetailPanel({ item, onClose, onFlag }: { item: RegistryEntry; onClose: () => void; onFlag: (s: 'flagged' | 'unflagged' | 'dismissed') => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Registry Detail</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">X</button>
        </div>
        <div className="flex items-center gap-2"><RiskBadge level={item.riskLevel} /><RiskScoreBar score={item.riskScore} /></div>
        <div className="space-y-3">
          <Field label="Category" value={catLabels[item.category] || item.category} />
          <Field label="Digitally Signed" value={item.isSigned === true ? 'Yes (Verified)' : item.isSigned === false ? 'No — SIGN.MEDIA Check Failed' : 'Unknown'} />
          <Field label="Registry Path" value={item.path} mono />
          <Field label="Key Name" value={item.keyName} />
          <Field label="Value Data" value={item.valueData} mono />
          <Field label="Last Write Time" value={formatTimestamp(item.lastWriteTime)} />
        </div>
        <div className="pt-3 border-t border-slate-700"><FlagButton status={item.flagStatus} onFlag={onFlag} /></div>
        <p className="text-[10px] text-slate-600 italic">SIGN.MEDIA: Check MuiCache for executables without digital signatures. Unsigned entries may indicate cheat software.</p>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
