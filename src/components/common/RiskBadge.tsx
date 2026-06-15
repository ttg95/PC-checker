import type { RiskLevel, FlagStatus } from '../../types';
import { riskLevelBadge, riskLevelColor } from '../../utils/id';
import { Flag, X, Minus } from 'lucide-react';

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${riskLevelBadge(level)}`}>
      {level === 'none' ? 'Clean' : level}
    </span>
  );
}

export function RiskScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : score >= 10 ? 'bg-yellow-500' : 'bg-slate-600';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-mono ${riskLevelColor(score >= 70 ? 'high' : score >= 40 ? 'medium' : score >= 10 ? 'low' : 'none')}`}>
        {score}
      </span>
    </div>
  );
}

export function FlagButton({ status, onFlag }: { status: FlagStatus; onFlag: (s: FlagStatus) => void }) {
  if (status === 'flagged') {
    return (
      <button onClick={() => onFlag('unflagged')} className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors" title="Unflag">
        <Flag className="w-3 h-3" /> Flagged
      </button>
    );
  }
  if (status === 'dismissed') {
    return (
      <button onClick={() => onFlag('unflagged')} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-600/20 text-slate-400 text-xs hover:bg-slate-600/30 transition-colors" title="Undismiss">
        <Minus className="w-3 h-3" /> Dismissed
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onFlag('flagged')} className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Flag for review">
        <Flag className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onFlag('dismissed')} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors" title="Dismiss">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
