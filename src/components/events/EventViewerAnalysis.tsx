import { useState, useMemo } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { EventLogEntry, RiskLevel } from '../../types';
import { formatTimestamp } from '../../utils/id';
import SearchFilter from '../common/SearchFilter';
import DataTable from '../common/DataTable';
import { RiskBadge, RiskScoreBar, FlagButton } from '../common/RiskBadge';
import { FileText, Clock } from 'lucide-react';
import { isUsbEvent } from '../../utils/usb';

export default function EventViewerAnalysis() {
  const { results, updateFlagStatus } = useScan();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged' | 'dismissed'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<EventLogEntry | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const nonUsbEvents = useMemo(() => results.events.filter(item => !isUsbEvent(item)), [results.events]);
  const channels = useMemo(() => ['all', ...Array.from(new Set(nonUsbEvents.map(e => e.logChannel)))], [nonUsbEvents]);
  const eventCats = useMemo(() => ['all', ...Array.from(new Set(nonUsbEvents.map(e => e.eventCategory)))], [nonUsbEvents]);

  const filtered = useMemo(() => {
    return nonUsbEvents.filter(item => {
      if (search && !item.message.toLowerCase().includes(search.toLowerCase()) && !item.source.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (flagFilter !== 'all' && item.flagStatus !== flagFilter) return false;
      if (channelFilter !== 'all' && item.logChannel !== channelFilter) return false;
      if (categoryFilter !== 'all' && item.eventCategory !== categoryFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [nonUsbEvents, search, riskFilter, flagFilter, channelFilter, categoryFilter]);

  const columns = [
    { key: 'timestamp', label: 'Time', sortable: true, render: (item: EventLogEntry) => <span className="text-xs text-slate-400 whitespace-nowrap">{formatTimestamp(item.timestamp)}</span> },
    { key: 'riskLevel', label: 'Risk', render: (item: EventLogEntry) => <RiskBadge level={item.riskLevel} /> },
    { key: 'logChannel', label: 'Channel', sortable: true, render: (item: EventLogEntry) => <span className="font-mono text-xs text-cyan-300">{item.logChannel}</span> },
    { key: 'eventId', label: 'Event ID', sortable: true, render: (item: EventLogEntry) => <span className="font-mono text-xs text-slate-300">{item.eventId}</span> },
    { key: 'eventCategory', label: 'Category', sortable: true, render: (item: EventLogEntry) => <CatBadge cat={item.eventCategory} /> },
    { key: 'message', label: 'Message', render: (item: EventLogEntry) => <span className="text-xs text-slate-300 line-clamp-2">{item.message}</span> },
    { key: 'flagStatus', label: 'Flag', render: (item: EventLogEntry) => <FlagButton status={item.flagStatus} onFlag={s => updateFlagStatus('events', item.id, s)} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Event Viewer Analysis</h1>
          <p className="text-sm text-slate-400">Defender operational, service events, application events, and USN journal activity. USB activity is in the USB tab.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>Table</button>
        <button onClick={() => setViewMode('timeline')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'timeline' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}><Clock className="w-3 h-3" /> Timeline</button>
      </div>

      <SearchFilter
        search={search} onSearchChange={setSearch}
        riskFilter={riskFilter} onRiskFilterChange={setRiskFilter}
        flagFilter={flagFilter} onFlagFilterChange={setFlagFilter}
        resultCount={filtered.length}
        extraFilters={
          <>
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
              {channels.map(c => <option key={c} value={c}>{c === 'all' ? 'All Channels' : c}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50">
              {eventCats.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.replace(/_/g, ' ')}</option>)}
            </select>
          </>
        }
      />

      {viewMode === 'table' ? (
        <DataTable data={filtered} columns={columns} keyExtractor={item => item.id} onRowClick={setSelected} selectedId={selected?.id} />
      ) : (
        <TimelineView events={filtered} onFlag={(id, s) => updateFlagStatus('events', id, s)} />
      )}

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-50 overflow-auto">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">Event Detail</h3><button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">X</button></div>
            <div className="flex items-center gap-2"><RiskBadge level={selected.riskLevel} /><RiskScoreBar score={selected.riskScore} /></div>
            <div className="space-y-3">
              <Field label="Timestamp" value={formatTimestamp(selected.timestamp)} />
              <Field label="Channel" value={selected.logChannel} />
              <Field label="Event ID" value={String(selected.eventId)} />
              <Field label="Category" value={selected.eventCategory.replace(/_/g, ' ')} />
              <Field label="Source" value={selected.source} />
              <Field label="Message" value={selected.message} />
            </div>
            <div className="pt-3 border-t border-slate-700"><FlagButton status={selected.flagStatus} onFlag={s => updateFlagStatus('events', selected.id, s)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = { usb_connect: 'bg-blue-500/20 text-blue-300', usb_disconnect: 'bg-slate-600/20 text-slate-400', device_config: 'bg-amber-500/20 text-amber-300', device_delete: 'bg-red-500/20 text-red-300', defender_threat: 'bg-red-500/20 text-red-300', defender_exclusion: 'bg-red-600/20 text-red-200', app_crash: 'bg-amber-500/20 text-amber-300', journal_delete: 'bg-red-500/20 text-red-300', service_event: 'bg-amber-500/20 text-amber-300', other: 'bg-slate-600/20 text-slate-400' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors[cat] || colors.other}`}>{cat.replace(/_/g, ' ')}</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p><p className="text-sm text-slate-200 break-all">{value}</p></div>;
}

function TimelineView({ events, onFlag }: { events: EventLogEntry[]; onFlag: (id: string, s: 'flagged' | 'unflagged' | 'dismissed') => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, EventLogEntry[]>();
    for (const e of events) {
      const day = new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([day, items]) => (
        <div key={day}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{day}</h3>
          <div className="relative pl-6 space-y-3">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />
            {items.map(item => (
              <div key={item.id} className="relative flex items-start gap-3">
                <div className={`absolute left-[-18px] top-2 w-3 h-3 rounded-full border-2 ${item.riskLevel === 'high' ? 'border-red-500 bg-red-500/30' : item.riskLevel === 'medium' ? 'border-amber-500 bg-amber-500/30' : 'border-slate-600 bg-slate-800'}`} />
                <div className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={item.riskLevel} />
                    <span className="font-mono text-[10px] text-cyan-300">{item.logChannel}</span>
                    <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-slate-300">{item.message}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <RiskScoreBar score={item.riskScore} />
                    <FlagButton status={item.flagStatus} onFlag={s => onFlag(item.id, s)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {events.length === 0 && <p className="text-center text-slate-500 py-8">No events to display</p>}
    </div>
  );
}
