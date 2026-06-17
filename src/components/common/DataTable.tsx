import { useState, type MouseEvent, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ShieldCheck, Ban } from 'lucide-react';
import { useAccounts } from '../../utils/AccountContext';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedId?: string;
}

export default function DataTable<T>({ data, columns, keyExtractor, onRowClick, selectedId }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { activeAccount, addExclusion, exclusions } = useAccounts();
  const isMaster = activeAccount?.role === 'master';

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey];
        const bv = (b as Record<string, unknown>)[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
        const as = String(av);
        const bs = String(bv);
        return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
      })
    : data;
  const excludeFromFutureScans = async (event: MouseEvent, item: T) => {
    event.stopPropagation();
    const term = getExclusionTerm(item);
    if (!term) return;

    try {
      await addExclusion(term);
    } catch {
      // Duplicate exclusions are already safe for future scans.
    }
  };

  return (
    <div className="overflow-auto max-h-[72vh] rounded-lg border border-slate-700/50">
      <table className="w-full min-w-[2400px] text-sm table-auto">
        <thead>
          <tr className="bg-slate-800/80">
            {isMaster && (
              <th className="min-w-44 px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Exclude
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                className={`min-w-48 px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-slate-200 select-none' : ''} ${col.className || ''}`}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {sorted.map(item => {
            const id = keyExtractor(item);
            const exclusionTerm = getExclusionTerm(item);
            const isExcluded = exclusionTerm
              ? exclusions.some(exclusion => exclusion.term.toLowerCase() === exclusionTerm.toLowerCase())
              : false;
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                  selectedId === id ? 'bg-cyan-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                {isMaster && (
                  <td className="min-w-44 px-6 py-4 align-top text-slate-300">
                    <button
                      type="button"
                      onClick={(event) => void excludeFromFutureScans(event, item)}
                      disabled={!exclusionTerm || isExcluded}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                        isExcluded
                          ? 'bg-slate-700/60 text-slate-400'
                          : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40'
                      }`}
                      title={isExcluded ? 'This item is already excluded from future scans' : 'Add this exact item to the exclusion list for future scans'}
                    >
                      {isExcluded ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      {isExcluded ? 'Excluded' : 'Exclude'}
                    </button>
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className={`min-w-48 px-6 py-4 align-top text-slate-300 ${col.className || ''}`}>
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length + (isMaster ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                No results found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function getExclusionTerm<T>(item: T): string | null {
  const row = item as Record<string, unknown>;
  const candidates = [
    row.executablePath,
    row.path,
    row.location,
    row.label,
    row.valueData,
    row.keyName,
    row.programName,
    row.name,
    row.displayName,
    row.deviceName,
    row.message,
    row.deviceId,
    row.value,
    row.detail,
  ];

  const value = candidates.find(candidate => typeof candidate === 'string' && candidate.trim().length >= 2);
  return typeof value === 'string' ? value.trim() : null;
}
