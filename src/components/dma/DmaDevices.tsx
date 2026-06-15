import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { DmaDeviceEntry, RiskLevel } from '../../types';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { Cpu, ShieldCheck, ShieldX, Eye } from 'lucide-react';
import { isUsbDevice } from '../../utils/usb';

export default function DmaDevices() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [busFilter, setBusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<DmaDeviceEntry | null>(null);
  const nonUsbDevices = useMemo(() => results.dmaDevices.filter(item => !isUsbDevice(item)), [results.dmaDevices]);

  const filtered = useMemo(() => {
    return nonUsbDevices.filter(item => {
      if (search && !item.deviceName.toLowerCase().includes(search.toLowerCase()) && !item.deviceId.toLowerCase().includes(search.toLowerCase()) && !item.vendorId.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (busFilter !== 'all' && item.busType !== busFilter) return false;
      return true;
    });
  }, [nonUsbDevices, search, riskFilter, flagFilter, busFilter]);

  const unknownDevices = nonUsbDevices.filter(d => !d.driverInstalled || d.isHidden || d.isSigned === false);

  const columns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: DmaDeviceEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: DmaDeviceEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'deviceName', label: 'Device', sortable: true, render: (item: DmaDeviceEntry) => <span className="font-semibold text-slate-200">{item.deviceName}</span> },
    { key: 'vendorId', label: 'Vendor ID', sortable: true, render: (item: DmaDeviceEntry) => <span className="font-mono text-xs text-cyan-300">{item.vendorId}</span> },
    { key: 'deviceId', label: 'Device ID', sortable: true, render: (item: DmaDeviceEntry) => <span className="font-mono text-xs text-slate-300">{item.deviceId}</span> },
    { key: 'busType', label: 'Bus', sortable: true, render: (item: DmaDeviceEntry) => <BusBadge type={item.busType} /> },
    { key: 'isSigned', label: 'Signed', render: (item: DmaDeviceEntry) => item.isSigned === true ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : item.isSigned === false ? <ShieldX className="w-4 h-4 text-red-400" /> : <span className="text-xs text-slate-500">N/A</span> },
    { key: 'isHidden', label: 'Hidden', render: (item: DmaDeviceEntry) => item.isHidden ? <Eye className="w-4 h-4 text-amber-400" /> : <span className="text-xs text-slate-500">No</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: DmaDeviceEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('dmaDevices', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Cpu className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">DMA / PCIe Devices</h1>
          <p className="text-sm text-slate-400">PCIe and Thunderbolt device enumeration for DMA hardware detection. USB devices are in the USB tab.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <HighlightCard label="Unknown/Unsigned Devices" count={unknownDevices.length} accent="red" />
        <HighlightCard label="Hidden Devices" count={nonUsbDevices.filter(d => d.isHidden).length} accent="amber" />
        <HighlightCard label="PCIe Devices" count={nonUsbDevices.filter(d => d.busType === 'PCIe').length} accent="cyan" />
      </div>

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <select value={busFilter} onChange={e => setBusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
            <option value="all">All Bus Types</option><option value="PCIe">PCIe</option><option value="Thunderbolt">Thunderbolt</option><option value="Unknown">Unknown</option>
          </select>
        }
      />

      <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Device Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button>
            </div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Device Name" value={selected.deviceName} />
              <Field label="Vendor ID" value={selected.vendorId} mono />
              <Field label="Device ID" value={selected.deviceId} mono />
              <Field label="Full PCI ID" value={`${selected.vendorId}&${selected.deviceId}`} mono />
              <Field label="Bus Type" value={selected.busType} />
              <Field label="Location" value={selected.location} />
              <Field label="Driver Installed" value={selected.driverInstalled ? 'Yes' : 'No'} />
              <Field label="Hidden Device" value={selected.isHidden ? 'Yes' : 'No'} />
              <Field label="Digitally Signed" value={selected.isSigned === true ? 'Yes' : selected.isSigned === false ? 'No' : 'N/A'} />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('dmaDevices', selected.id, s)} />
            </div>
            <p className="text-[10px] text-slate-600 italic">Verify Vendor/Device IDs via Google or pci-ven.com. Unknown PCIe DMA devices may indicate cheat hardware.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BusBadge({ type }: { type: string }) {
  const s: Record<string, string> = { PCIe: 'bg-red-500/20 text-red-300', USB: 'bg-blue-500/20 text-blue-300', Thunderbolt: 'bg-amber-500/20 text-amber-300', Unknown: 'bg-slate-600/20 text-slate-400' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${s[type] || s.Unknown}`}>{type}</span>;
}

function HighlightCard({ label, count, accent }: { label: string; count: number; accent: string }) {
  const bg = accent === 'red' ? 'bg-red-500/10' : accent === 'amber' ? 'bg-amber-500/10' : 'bg-cyan-500/10';
  const textColor = accent === 'red' ? 'text-red-400' : accent === 'amber' ? 'text-amber-400' : 'text-cyan-400';
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
      <div className={`p-2 rounded-lg ${bg} inline-block mb-2`}><Cpu className={`w-4 h-4 ${textColor}`} /></div>
      <p className="text-lg font-bold text-white">{count}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
