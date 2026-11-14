import { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { DashboardStats, PublicComplaintView } from './types/complaint';
import { HomePage, type AppView } from './components/HomePage';
import { SubmitComplaintPage } from './components/SubmitComplaintPage';
import { TrackComplaintPage } from './components/TrackComplaintPage';
import { AdminDashboardPage } from './components/AdminDashboardPage';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [trackTargetId, setTrackTargetId] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [demoComplaints, setDemoComplaints] = useState<PublicComplaintView[]>([]);

  const loadPublicSummary = useCallback(async () => {
    try {
      const [statsRes, demoRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/demo-complaints'),
      ]);
      if (statsRes.ok) {
        const s = (await statsRes.json()) as DashboardStats;
        setStats(s);
      }
      if (demoRes.ok) {
        const d = (await demoRes.json()) as { complaints: PublicComplaintView[] };
        setDemoComplaints(d.complaints);
      }
    } catch {
      // Keep previous stats on transient failure
    }
  }, []);

  useEffect(() => {
    void loadPublicSummary();
  }, [loadPublicSummary]);

  const navigateTo = (nextView: AppView, complaintId?: string) => {
    setView(nextView);
    if (complaintId) {
      setTrackTargetId(complaintId);
    } else if (nextView !== 'track') {
      setTrackTargetId(undefined);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems: { id: AppView; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'submit', label: 'Submit' },
    { id: 'track', label: 'Track' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Zone 1: Single-element wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="font-display text-xl font-bold tracking-tight text-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            ResolveAI
          </button>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {navItems.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-blue-600 text-blue-700 font-semibold'
                      : 'border-transparent hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary action button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('submit')}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Submit Complaint
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    view === item.id
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {view === 'home' && (
              <HomePage
                stats={stats}
                demoComplaints={demoComplaints}
                onNavigate={navigateTo}
              />
            )}
            {view === 'submit' && (
              <SubmitComplaintPage
                onSubmitted={() => void loadPublicSummary()}
                onNavigate={navigateTo}
              />
            )}
            {view === 'track' && (
              <TrackComplaintPage
                initialComplaintId={trackTargetId}
                demoComplaints={demoComplaints}
              />
            )}
            {view === 'admin' && (
              <AdminDashboardPage onDataChanged={() => void loadPublicSummary()} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p className="font-medium text-slate-700">
            ResolveAI · Your Complaint, Our Priority.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigateTo('submit')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Submit Complaint
            </button>
            <button
              type="button"
              onClick={() => navigateTo('track')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Track Complaint
            </button>
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Admin Dashboard
            </button>
            <a
              href="/ResolveAI_Presentation_Guide.pdf"
              download="ResolveAI_Presentation_Guide.pdf"
              className="font-semibold text-blue-700 hover:underline"
            >
              Presentation PDF
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
