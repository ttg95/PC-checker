import { Search, Filter } from 'lucide-react';
import type { RiskLevel } from '../../types';

interface SearchFilterProps {
  search: string;
  onSearchChange: (v: string) => void;
  riskFilter: RiskLevel | 'all';
  onRiskFilterChange: (v: RiskLevel | 'all') => void;
  flagFilter: 'all' | 'flagged' | 'unflagged' | 'dismissed';
  onFlagFilterChange: (v: 'all' | 'flagged' | 'unflagged' | 'dismissed') => void;
  extraFilters?: React.ReactNode;
  resultCount: number;
}

export default function SearchFilter({
  search,
  onSearchChange,
  riskFilter,
  onRiskFilterChange,
  flagFilter,
  onFlagFilterChange,
  extraFilters,
  resultCount,
}: SearchFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search triggers..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={riskFilter}
            onChange={e => onRiskFilterChange(e.target.value as RiskLevel | 'all')}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
            <option value="none">Clean</option>
          </select>
          <select
            value={flagFilter}
            onChange={e => onFlagFilterChange(e.target.value as typeof flagFilter)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Flags</option>
            <option value="flagged">Flagged</option>
            <option value="unflagged">Unflagged</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        {extraFilters}
      </div>
      <p className="text-xs text-slate-500">{resultCount} result{resultCount !== 1 ? 's' : ''} found</p>
    </div>
  );
}
