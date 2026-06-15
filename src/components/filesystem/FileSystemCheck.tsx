import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { FileSystemEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { HardDrive, FolderSearch, FileWarning } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  prefetch: 'Prefetch', recent: 'Recent Files', crash_dump: 'Crash Dump', recycle_bin: 'Recycle Bin',
  psreadline: 'PSReadline', usn_journal: 'USN Journal', encrypted: 'Encrypted', efi_partition: 'EFI Partition',
  dll_openwith: 'DLL OpenWith', winrar_history: 'WinRAR History', hidden_folder: 'Hidden Folder',
  restore_point: 'Restore Point', doskey_history: 'CMD History',
};

export default function FileSystemCheck() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<FileSystemEntry | null>(null);

  const categories = useMemo(() => ['all', ...Array.from(new Set(results.fileSystem.map(f => f.category)))], [results.fileSystem]);

  const filtered = useMemo(() => {
    return results.fileSystem.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.path.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [results.fileSystem, search, riskFilter, flagFilter, categoryFilter]);

  const suspiciousCount = filtered.filter(f => f.isSigned === false || f.category === 'prefetch' || f.category === 'usn_journal').length;

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: FileSystemEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: FileSystemEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'category', label: 'Category', sortable: true, render: (item: FileSystemEntry) => <CatBadge category={item.category} /> },
    { key: 'name', label: 'Name', sortable: true, render: (item: FileSystemEntry) => <span className="font-semibold text-slate-200">{item.name}</span> },
    { key: 'path', label: 'Path', render: (item: FileSystemEntry) => <span className="font-mono text-xs text-slate-400 break-all block">{item.path}</span> },
    { key: 'timestamp', label: 'Time', sortable: true, render: (item: FileSystemEntry) => <span className="text-xs text-slate-400">{formatTimestamp(item.timestamp)}</span> },
    { key: 'isSigned', label: 'Signed', render: (item: FileSystemEntry) => item.isSigned === true ? <span className="text-xs text-emerald-400">Yes</span> : item.isSigned === false ? <span className="text-xs text-red-400">No</span> : <span className="text-xs text-slate-500">N/A</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: FileSystemEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('fileSystem', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <HardDrive className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">File System Check</h1>
          <p className="text-sm text-slate-400">Prefetch, recent files, crash dumps, USN journal, recycle bin, encrypted volumes</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <MiniCard icon={<FolderSearch className="w-4 h-4 text-cyan-400" />} label="Total Items" value={filtered.length} />
        <MiniCard icon={<FileWarning className="w-4 h-4 text-red-400" />} label="Suspicious" value={suspiciousCount} />
        <MiniCard icon={<HardDrive className="w-4 h-4 text-amber-400" />} label="Prefetch Files" value={filtered.filter(f => f.category === 'prefetch').length} />
        <MiniCard icon={<FolderSearch className="w-4 h-4 text-blue-400" />} label="USN Journal" value={filtered.filter(f => f.category === 'usn_journal').length} />
      </div>

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : (categoryLabels[c] || c.replace(/_/g, ' '))}</option>)}
          </select>
        }
      />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">File Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button>
            </div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Name" value={selected.name} />
              <Field label="Category" value={categoryLabels[selected.category] || selected.category} />
              <Field label="Path" value={selected.path} mono />
              <Field label="Timestamp" value={formatTimestamp(selected.timestamp)} />
              <Field label="Size" value={selected.size ? `${(selected.size / 1024).toFixed(1)} KB` : 'N/A'} />
              <Field label="Signed" value={selected.isSigned === true ? 'Yes' : selected.isSigned === false ? 'No' : 'N/A'} />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('fileSystem', selected.id, s)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    prefetch: 'bg-blue-500/20 text-blue-300', recent: 'bg-emerald-500/20 text-emerald-300', crash_dump: 'bg-red-500/20 text-red-300',
    recycle_bin: 'bg-slate-600/20 text-slate-400', psreadline: 'bg-cyan-500/20 text-cyan-300', usn_journal: 'bg-amber-500/20 text-amber-300',
    encrypted: 'bg-red-500/20 text-red-300', efi_partition: 'bg-teal-500/20 text-teal-300', dll_openwith: 'bg-red-500/20 text-red-300',
    winrar_history: 'bg-amber-500/20 text-amber-300', hidden_folder: 'bg-amber-500/20 text-amber-300', restore_point: 'bg-slate-600/20 text-slate-400',
    doskey_history: 'bg-cyan-500/20 text-cyan-300',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors[category] || 'bg-slate-600/20 text-slate-400'}`}>{categoryLabels[category] || category}</span>;
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3 flex items-center gap-2">
      {icon}
      <div><p className="text-lg font-bold text-white">{value}</p><p className="text-[10px] text-slate-400">{label}</p></div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
