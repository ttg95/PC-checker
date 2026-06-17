import { Link, Outlet, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import { useScan } from '../../utils/ScanContext';
import { formatTimestamp } from '../../utils/id';

export default function Layout() {
  console.log('Layout component rendering');
  const navigate = useNavigate();
  const { activeReview, clearReviewScan } = useScan();

  const handleCloseReview = () => {
    clearReviewScan();
    navigate('/master');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {activeReview && (
          <div className="sticky top-0 z-20 border-b border-cyan-500/30 bg-cyan-950/95 px-6 py-3 shadow-lg shadow-cyan-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Reviewing Uploaded Scan</p>
                <p className="text-sm text-slate-100">
                  {activeReview.displayName} <span className="text-slate-400">/</span> {activeReview.machineName}
                  {activeReview.submittedBy && <span className="text-slate-400"> / {activeReview.submittedBy}</span>}
                  {activeReview.scanTimestamp && <span className="text-slate-400"> / scanned {formatTimestamp(activeReview.scanTimestamp)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/master"
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
                >
                  Master Settings
                </Link>
                <button
                  type="button"
                  onClick={handleCloseReview}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-500/40 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                  Close Review
                </button>
              </div>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
