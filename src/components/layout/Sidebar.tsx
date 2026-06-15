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
  Shield,
  HardDrive,
  Monitor,
  UserCog,
  Cable,
  CreditCard,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/registry', icon: Database, label: 'Registry Analysis' },
  { to: '/events', icon: FileText, label: 'Event Viewer' },
  { to: '/apphistory', icon: History, label: 'Application History' },
  { to: '/services', icon: Cpu, label: 'Services & Drivers' },
  { to: '/usb', icon: Cable, label: 'USB Activity' },
  { to: '/dma', icon: HardDrive, label: 'DMA / PCIe' },
  { to: '/filesystem', icon: HardDrive, label: 'File System' },
  { to: '/systeminfo', icon: Monitor, label: 'System Info' },
  { to: '/tasks', icon: ListChecks, label: 'Scheduled Tasks' },
  { to: '/processes', icon: Activity, label: 'Running Processes' },
  { to: '/reports', icon: FileDown, label: 'Export Reports' },
  { to: '/accounts', icon: CreditCard, label: 'Accounts' },
  { to: '/admin', icon: UserCog, label: 'Admin Panel' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-700/50 flex flex-col shrink-0">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-700/50">
        <Shield className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="text-base font-bold text-white leading-tight">PC Checker</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Forensic Check Tool</p>
        </div>
      </div>
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
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
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-600 text-center">Read-only analysis only</p>
        <p className="text-[10px] text-slate-600 text-center">Requires admin for full access</p>
      </div>
    </aside>
  );
}
