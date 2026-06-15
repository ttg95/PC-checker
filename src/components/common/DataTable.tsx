import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
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

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/50">
      <table className="w-full min-w-[1800px] text-sm table-auto">
        <thead>
          <tr className="bg-slate-800/80">
            {columns.map(col => (
              <th
                key={col.key}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                className={`min-w-36 px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-slate-200 select-none' : ''} ${col.className || ''}`}
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
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                  selectedId === id ? 'bg-cyan-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`min-w-36 px-5 py-3 align-top text-slate-300 ${col.className || ''}`}>
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                No results found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
