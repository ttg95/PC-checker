import { useMemo, useState } from 'react';
import { AlertTriangle, Cable, Clock, Cpu, Plug, Unplug } from 'lucide-react';
import { useScan } from '../../utils/ScanContext';
import type { DmaDeviceEntry, EventLogEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import { isUsbDevice, isUsbEvent } from '../../utils/usb';
import DataTable from '../common/DataTable';
import SearchFilter from '../common/SearchFilter';
import { FlagButton, RiskBadge, RiskScoreBar } from '../common/RiskBadge';

export default function UsbActivity() {
  const { results, updateFlagStatus } = useScan();
  const [viewMode, setViewMode] = useState<'events' | 'devices'>('events');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [selectedEvent, setSelectedEvent] = useState<EventLogEntry | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DmaDeviceEntry | null>(null);

  const usbEvents = useMemo(
    () => results.events.filter(isUsbEvent).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [results.events],
  );
  const usbDevices = useMemo(() => results.dmaDevices.filter(isUsbDevice), [results.dmaDevices]);

  const filteredEvents = useMemo(() => {
    const term = search.toLowerCase();
    return usbEvents.filter(item => {
      if (term && !`${item.logChannel} ${item.source} ${item.message}`.toLowerCase().includes(term)) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      return true;
    });
  }, [usbEvents, search, riskFilter, flagFilter]);

  const filteredDevices = useMemo(() => {
    const term = search.toLowerCase();
    return usbDevices.filter(item => {
      if (term && !`${item.deviceName} ${item.vendorId} ${item.deviceId} ${item.location}`.toLowerCase().includes(term)) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      return true;
    });
  }, [usbDevices, search, riskFilter, flagFilter]);

  const eventColumns = [
    { key: 'timestamp', label: 'Time', sortable: true, render: (item: EventLogEntry) => <span className="text-xs text-slate-400 whitespace-nowrap">{formatTimestamp(item.timestamp)}</span> },
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: EventLogEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: EventLogEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'eventCategory', label: 'Action', sortable: true, render: (item: EventLogEntry) => <ActionBadge value={item.eventCategory} /> },
    { key: 'eventId', label: 'Event ID', sortable: true, render: (item: EventLogEntry) => <span className="font-mono text-xs text-slate-300">{item.eventId}</span> },
    { key: 'message', label: 'Device/Event', render: (item: EventLogEntry) => <span className="text-xs text-slate-300 line-clamp-2">{item.message}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: EventLogEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('events', item.id, s)} /> },
  ];

  const deviceColumns = [
    { key: 'riskScore', label: 'Risk', sortable: true, render: (item: DmaDeviceEntry) => <RiskScoreBar score={item.riskScore} /> },
    { key: 'riskLevel', label: 'Level', render: (item: DmaDeviceEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'deviceName', label: 'Device', sortable: true, render: (item: DmaDeviceEntry) => <span className="font-semibold text-slate-200">{item.deviceName}</span> },
    { key: 'vendorId', label: 'Vendor', sortable: true, render: (item: DmaDeviceEntry) => <span className="font-mono text-xs text-cyan-300">{item.vendorId}</span> },
    { key: 'deviceId', label: 'Product', sortable: true, render: (item: DmaDeviceEntry) => <span className="font-mono text-xs text-slate-300">{item.deviceId}</span> },
    { key: 'driverInstalled', label: 'Driver', render: (item: DmaDeviceEntry) => <span className={item.driverInstalled ? 'text-xs text-emerald-400' : 'text-xs text-red-400'}>{item.driverInstalled ? 'Installed' : 'Missing'}</span> },
    { key: 'location', label: 'Location', render: (item: DmaDeviceEntry) => <span className="font-mono text-xs text-slate-400 break-all block">{item.location}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: DmaDeviceEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('dmaDevices', item.id, s)} /> },
  ];

  const visibleCount = viewMode === 'events' ? filteredEvents.length : filteredDevices.length;
  const insertEvents = usbEvents.filter(e => e.eventCategory === 'usb_connect' || e.eventCategory === 'device_config');
  const unplugEvents = usbEvents.filter(e => e.eventCategory === 'usb_disconnect' || e.eventCategory === 'device_delete');
  const descriptorFailures = usbEvents.filter(e => e.message.toLowerCase().includes('descriptor'));
  const recentTimeline = usbEvents.slice(0, 12);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Cable className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">USB Activity</h1>
          <p className="text-sm text-slate-400">USB input devices, connection history, removals, descriptor failures, and device inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard icon={<Clock className="w-4 h-4 text-cyan-400" />} label="USB Events" value={usbEvents.length} />
        <SummaryCard icon={<Plug className="w-4 h-4 text-blue-400" />} label="Insert/Config" value={insertEvents.length} />
        <SummaryCard icon={<Unplug className="w-4 h-4 text-red-400" />} label="Unplug/Delete" value={unplugEvents.length} />
        <SummaryCard icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} label="Descriptor Fails" value={descriptorFailures.length} />
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">USB Insert and Unplug Timeline</h2>
            <p className="text-xs text-slate-500 mt-1">{usbDevices.length} USB-like devices inventoried</p>
          </div>
          <Cpu className="w-5 h-5 text-slate-500" />
        </div>
        <div className="space-y-2">
          {recentTimeline.map(event => (
            <div key={event.id} className="grid lg:grid-cols-[170px_160px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">{formatTimestamp(event.timestamp)}</span>
              <ActionBadge value={event.eventCategory} />
              <span className="text-xs text-slate-300 line-clamp-2">{event.message || event.source}</span>
            </div>
          ))}
          {recentTimeline.length === 0 && <p className="text-sm text-slate-500">No USB insert or unplug events found in the current scan.</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setViewMode('events')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'events' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>Events</button>
        <button onClick={() => setViewMode('devices')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'devices' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>Devices</button>
      </div>

      <SearchFilter
        search={search}
        onSearchChange={setSearch}
        riskFilter={riskFilter}
        onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter}
        onFlagFilterChange={setFlagFilter}
        resultCount={visibleCount}
      />

      {viewMode === 'events' ? (
        <DataTable data={filteredEvents} columns={eventColumns} keyExtractor={item => item.id} onRowClick={setSelectedEvent} selectedId={selectedEvent?.id} />
      ) : (
        <DataTable data={filteredDevices} columns={deviceColumns} keyExtractor={item => item.id} onRowClick={setSelectedDevice} selectedId={selectedDevice?.id} />
      )}

      {selectedEvent && (
        <DetailPanel title="USB Event Detail" onClose={() => setSelectedEvent(null)}>
          <div className="flex items-center gap-2"><RiskBadge level={selectedEvent.riskLevel} /><RiskScoreBar score={selectedEvent.riskScore} /></div>
          <Field label="Timestamp" value={formatTimestamp(selectedEvent.timestamp)} />
          <Field label="Channel" value={selectedEvent.logChannel} />
          <Field label="Event ID" value={String(selectedEvent.eventId)} />
          <Field label="Action" value={selectedEvent.eventCategory.replace(/_/g, ' ')} />
          <Field label="Source" value={selectedEvent.source} />
          <Field label="Message" value={selectedEvent.message} />
          <div className="pt-3 border-t border-slate-700"><FlagButton status={selectedEvent.flagStatus} onFlag={s => updateFlagStatus('events', selectedEvent.id, s)} /></div>
        </DetailPanel>
      )}

      {selectedDevice && (
        <DetailPanel title="USB Device Detail" onClose={() => setSelectedDevice(null)}>
          <div className="flex items-center gap-2"><RiskBadge level={selectedDevice.riskLevel} /><RiskScoreBar score={selectedDevice.riskScore} /></div>
          <Field label="Device Name" value={selectedDevice.deviceName} />
          <Field label="Vendor ID" value={selectedDevice.vendorId} mono />
          <Field label="Product ID" value={selectedDevice.deviceId} mono />
          <Field label="Location" value={selectedDevice.location} mono />
          <Field label="Driver Installed" value={selectedDevice.driverInstalled ? 'Yes' : 'No'} />
          <Field label="Hidden Device" value={selectedDevice.isHidden ? 'Yes' : 'No'} />
          <div className="pt-3 border-t border-slate-700"><FlagButton status={selectedDevice.flagStatus} onFlag={s => updateFlagStatus('dmaDevices', selectedDevice.id, s)} /></div>
        </DetailPanel>
      )}
    </div>
  );
}

function ActionBadge({ value }: { value: EventLogEntry['eventCategory'] }) {
  const colors: Record<string, string> = {
    usb_connect: 'bg-blue-500/20 text-blue-300',
    usb_disconnect: 'bg-slate-600/20 text-slate-300',
    device_delete: 'bg-red-500/20 text-red-300',
    device_config: 'bg-amber-500/20 text-amber-300',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors[value] || 'bg-slate-600/20 text-slate-400'}`}>{value.replace(/_/g, ' ')}</span>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-800">{icon}</div>
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function DetailPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">X</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className={`text-sm text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
