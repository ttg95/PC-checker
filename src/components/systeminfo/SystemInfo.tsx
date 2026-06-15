import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { SystemInfoEntry, RiskLevel } from '../../types';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { Monitor, ShieldAlert, Users, HardDrive } from 'lucide-react';

const catLabels: Record<string, string> = {
  hwid: 'HWID', user_account: 'User Account', install_date: 'Install Date', defender_exclusion: 'Defender Exclusion',
  defender_history: 'Defender History', nvidia_program: 'NVIDIA Program', driver_list: 'Driver', tasklist: 'Process',
  bios_info: 'BIOS', disk_volume: 'Disk Volume', cipher_status: 'Cipher', restore_point: 'Restore Point', doskey_history: 'CMD History',
};

export default function SystemInfoPage() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<SystemInfoEntry | null>(null);

  const categories = useMemo(() => ['all', ...Array.from(new Set(results.systemInfo.map(s => s.category)))], [results.systemInfo]);

  const filtered = useMemo(() => {
    return results.systemInfo.filter(item => {
      if (search && !item.label.toLowerCase().includes(search.toLowerCase()) && !item.value.toLowerCase().includes(search.toLowerCase()) && !item.detail.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [results.systemInfo, search, riskFilter, flagFilter, categoryFilter]);

  const defenderIssues = results.systemInfo.filter(s => s.category === 'defender_exclusion' || s.category === 'defender_history');
  const hwidEntries = results.systemInfo.filter(s => s.category === 'hwid' || s.category === 'bios_info');
  const userAccounts = results.systemInfo.filter(s => s.category === 'user_account');

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: SystemInfoEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: SystemInfoEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'category', label: 'Category', sortable: true, render: (item: SystemInfoEntry) => <CatBadge cat={item.category} /> },
    { key: 'label', label: 'Item', sortable: true, render: (item: SystemInfoEntry) => <span className="font-semibold text-slate-200">{item.label}</span> },
    { key: 'value', label: 'Value', render: (item: SystemInfoEntry) => <span className="font-mono text-xs text-slate-300 break-all block">{item.value}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: SystemInfoEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('systemInfo', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Monitor className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">System Information</h1>
          <p className="text-sm text-slate-400">HWID, user accounts, Defender exclusions, driver list, disk volumes, and more</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <MiniCard icon={<ShieldAlert className="w-4 h-4 text-red-400" />} label="Defender Issues" value={defenderIssues.length} />
        <MiniCard icon={<HardDrive className="w-4 h-4 text-amber-400" />} label="HWID Entries" value={hwidEntries.length} />
        <MiniCard icon={<Users className="w-4 h-4 text-cyan-400" />} label="User Accounts" value={userAccounts.length} />
        <MiniCard icon={<Monitor className="w-4 h-4 text-slate-400" />} label="Total Items" value={filtered.length} />
      </div>

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : (catLabels[c] || c.replace(/_/g, ' '))}</option>)}
          </select>
        }
      />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button>
            </div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Category" value={catLabels[selected.category] || selected.category} />
              <Field label="Label" value={selected.label} />
              <Field label="Value" value={selected.value} mono />
              <Field label="Detail / Source" value={selected.detail} />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('systemInfo', selected.id, s)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    hwid: 'bg-red-500/20 text-red-300', user_account: 'bg-cyan-500/20 text-cyan-300', install_date: 'bg-slate-600/20 text-slate-400',
    defender_exclusion: 'bg-red-500/20 text-red-300', defender_history: 'bg-amber-500/20 text-amber-300', nvidia_program: 'bg-emerald-500/20 text-emerald-300',
    driver_list: 'bg-blue-500/20 text-blue-300', tasklist: 'bg-teal-500/20 text-teal-300', bios_info: 'bg-amber-500/20 text-amber-300',
    disk_volume: 'bg-blue-500/20 text-blue-300', cipher_status: 'bg-red-500/20 text-red-300', restore_point: 'bg-slate-600/20 text-slate-400',
    doskey_history: 'bg-cyan-500/20 text-cyan-300',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors[cat] || 'bg-slate-600/20 text-slate-400'}`}>{catLabels[cat] || cat}</span>;
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
