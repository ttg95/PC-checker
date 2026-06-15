import { useEffect, useState } from 'react';
import { Lock, RefreshCw, ShieldAlert, ShieldCheck, Terminal } from 'lucide-react';

const fallbackInfo: AdminInfo = {
  isAdmin: false,
  isPackaged: false,
  platform: 'win32',
  userDataPath: 'Unavailable outside Electron',
  executablePath: 'Unavailable outside Electron',
};

export default function AdminPanel() {
  const [info, setInfo] = useState<AdminInfo>(fallbackInfo);
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminInfo = async () => {
    setIsLoading(true);
    try {
      if (window.electron?.getAdminInfo) {
        setInfo(await window.electron.getAdminInfo());
      } else {
        setInfo({ ...fallbackInfo, platform: navigator.platform.toLowerCase().includes('win') ? 'win32' : 'linux' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminInfo();
  }, []);

  const status = info.isAdmin
    ? {
        icon: ShieldCheck,
        title: 'Administrator session active',
        detail: 'Full local scan permissions are available for this PC.',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      }
    : {
        icon: ShieldAlert,
        title: 'Administrator session required',
        detail: 'Packaged Windows builds relaunch through UAC before the scanner opens.',
        className: 'border-red-500/30 bg-red-500/10 text-red-300',
      };
  const StatusIcon = status.icon;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-slate-400 mt-1">Runtime privilege and packaged scanner status</p>
        </div>
        <button
          onClick={() => void loadAdminInfo()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:border-cyan-500/40 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <section className={`border rounded-xl p-5 ${status.className}`}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-slate-950/40">
            <StatusIcon className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{status.title}</h2>
            <p className="text-sm mt-1">{status.detail}</p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        <StatusCard label="Privilege" value={info.isAdmin ? 'Elevated' : 'Standard'} icon={<Lock className="w-5 h-5" />} />
        <StatusCard label="Runtime" value={info.isPackaged ? 'Packaged' : 'Development'} icon={<Terminal className="w-5 h-5" />} />
        <StatusCard label="Platform" value={info.platform} icon={<ShieldCheck className="w-5 h-5" />} />
      </div>

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Execution Context</h2>
        <InfoRow label="Executable" value={info.executablePath} />
        <InfoRow label="User data" value={info.userDataPath} />
        <InfoRow label="Elevation policy" value="Windows packaged builds request requireAdministrator and relaunch through UAC when needed." />
      </section>
    </div>
  );
}

function StatusCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3 text-cyan-400">
        <div className="p-2 rounded-lg bg-cyan-500/10">{icon}</div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid md:grid-cols-[140px_1fr] gap-2 py-3 border-t border-slate-800 first:border-t-0">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm text-slate-300 break-all">{value}</span>
    </div>
  );
}
