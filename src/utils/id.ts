export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatTimestamp(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function calculateRiskLevel(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 10) return 'low';
  return 'none';
}

export function riskLevelColor(level: 'none' | 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return 'text-red-400';
    case 'medium': return 'text-amber-400';
    case 'low': return 'text-yellow-300';
    case 'none': return 'text-slate-400';
  }
}

export function riskLevelBg(level: 'none' | 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return 'bg-red-500/20 border-red-500/30';
    case 'medium': return 'bg-amber-500/20 border-amber-500/30';
    case 'low': return 'bg-yellow-500/20 border-yellow-500/30';
    case 'none': return 'bg-slate-500/20 border-slate-500/30';
  }
}

export function riskLevelBadge(level: 'none' | 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return 'bg-red-500 text-white';
    case 'medium': return 'bg-amber-500 text-black';
    case 'low': return 'bg-yellow-500 text-black';
    case 'none': return 'bg-slate-600 text-slate-200';
  }
}

export function getMachineName(): string {
  return 'DESKTOP-AUDIT';
}

declare global {
  interface Window {
    __INTEGRITY_AUDITOR__?: {
      machineName: string;
      isElevated: boolean;
    };
  }
}
