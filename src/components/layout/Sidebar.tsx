import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  FileText,
  History,
  Cpu,
  ListChecks,
  Activity,
  FileDown,
  HardDrive,
  Monitor,
  UserCog,
  Cable,
  LogIn,
  Crown,
} from 'lucide-react';
import { useAccounts } from '../../utils/AccountContext';
import { useNavigationOrder, type NavItemId } from '../../utils/NavigationContext';

const navIcons: Record<NavItemId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  registry: Database,
  events: FileText,
  apphistory: History,
  services: Cpu,
  usb: Cable,
  dma: HardDrive,
  filesystem: HardDrive,
  systeminfo: Monitor,
  tasks: ListChecks,
  processes: Activity,
  reports: FileDown,
  accounts: LogIn,
  master: Crown,
  admin: UserCog,
};

export default function Sidebar() {
  const { activeAccount } = useAccounts();
  const { orderedItems } = useNavigationOrder();
  const isMaster = activeAccount?.role === 'master';
  const visibleNavItems = orderedItems.filter(item => !item.masterOnly || isMaster);

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-700/50 flex flex-col shrink-0">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-700/50">
        <img src="app-icon.png" alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
        <div>
          <h1 className="text-base font-bold text-white leading-tight">PC Checker</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Forensic Check Tool</p>
        </div>
      </div>
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-auto">
        {visibleNavItems.map(({ id, to, label }) => {
          const Icon = navIcons[id];
          return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {label}
          </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-600 text-center">Read-only analysis only</p>
        <p className="text-[10px] text-slate-600 text-center">Requires admin for full access</p>
      </div>
    </aside>
  );
}
