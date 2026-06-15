import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  console.log('Layout component rendering');
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
