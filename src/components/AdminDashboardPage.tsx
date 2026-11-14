import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  DEPARTMENTS,
  PRIORITY_LEVELS,
  type AdminUserSession,
  type ComplaintRecord,
  type ComplaintStatus,
  type DepartmentName,
} from '../types/complaint';
import {
  PrioritySignal,
  SentimentSignal,
  StatusSignal,
  formatDateTime,
} from './StatusSignals';

interface AdminDashboardPageProps {
  onDataChanged: () => void;
}

const DEMO_ACCOUNTS = [
  {
    label: 'Super Admin (All Departments)',
    email: 'admin@resolveai.edu',
    pass: 'ResolveAdmin2026!',
  },
  {
    label: 'IT Department Lead',
    email: 'it.lead@resolveai.edu',
    pass: 'DeptLead2026!',
  },
  {
    label: 'Maintenance Dept Lead',
    email: 'maintenance.lead@resolveai.edu',
    pass: 'DeptLead2026!',
  },
  {
    label: 'Security Dept Lead',
    email: 'security.lead@resolveai.edu',
    pass: 'DeptLead2026!',
  },
];

export function AdminDashboardPage({ onDataChanged }: AdminDashboardPageProps) {
  const [user, setUser] = useState<AdminUserSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard state
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [monitorNotice, setMonitorNotice] = useState<string | null>(null);
  const [runningMonitor, setRunningMonitor] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'priority' | 'newest'>('priority');

  // Selected Ticket Drawer State
  const [selected, setSelected] = useState<ComplaintRecord | null>(null);
  const [editStatus, setEditStatus] = useState<ComplaintStatus>('Assigned');
  const [editDept, setEditDept] = useState<DepartmentName>('IT Department');
  const [adminNote, setAdminNote] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Resolution State (Stage 8)
  const [resolutionComments, setResolutionComments] = useState('');
  const [resolving, setResolving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch('/api/auth/me');
      const data = (await res.json()) as { user: AdminUserSession | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const fetchAdminComplaints = useCallback(async () => {
    if (!user) return;
    setLoadingList(true);
    setListError(null);
    try {
      const params = new URLSearchParams({
        category: categoryFilter,
        department: departmentFilter,
        priority: priorityFilter,
        status: statusFilter,
        search,
        sortBy,
      });
      const res = await fetch(`/api/admin/complaints?${params.toString()}`);
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { complaints?: ComplaintRecord[]; error?: string };
      if (!res.ok || !data.complaints) {
        setListError(data.error || 'Failed to load complaints.');
        return;
      }
      setComplaints(data.complaints);
      if (selected) {
        const refreshed = data.complaints.find((c) => c.id === selected.id);
        if (refreshed) {
          setSelected(refreshed);
        }
      }
    } catch {
      setListError('Network error while loading admin complaints.');
    } finally {
      setLoadingList(false);
    }
  }, [user, categoryFilter, departmentFilter, priorityFilter, statusFilter, search, sortBy, selected]);

  useEffect(() => {
    if (user) {
      void fetchAdminComplaints();
    }
  }, [user, categoryFilter, departmentFilter, priorityFilter, statusFilter, sortBy, fetchAdminComplaints]);

  const openTicket = (ticket: ComplaintRecord) => {
    setSelected(ticket);
    setEditStatus(ticket.status);
    setEditDept(ticket.assignedDepartment);
    setAdminNote('');
    setResolutionComments('');
    setActionError(null);
    setActionSuccess(null);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = (await res.json()) as { user?: AdminUserSession; error?: string };
      if (!res.ok || !data.user) {
        setLoginError(data.error || 'Sign in failed.');
        return;
      }
      setUser(data.user);
      setDepartmentFilter('All');
    } catch {
      setLoginError('Network error during authentication.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setSelected(null);
    setComplaints([]);
  };

  const handleRunMonitor = async () => {
    setRunningMonitor(true);
    setMonitorNotice(null);
    try {
      const res = await fetch('/api/admin/monitor', { method: 'POST' });
      const data = (await res.json()) as { checkedCount?: number; escalatedIds?: string[] };
      if (res.ok) {
        const count = data.escalatedIds?.length ?? 0;
        setMonitorNotice(
          count > 0
            ? `SLA Monitor scanned ${data.checkedCount} open tickets and escalated ${count} ticket(s): ${data.escalatedIds?.join(', ')}.`
            : `SLA Monitor scanned ${data.checkedCount} open tickets — all within SLA thresholds.`
        );
        await fetchAdminComplaints();
        onDataChanged();
      }
    } finally {
      setRunningMonitor(false);
    }
  };

  const handleUpdateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setActionError(null);
    setActionSuccess(null);
    setSavingUpdate(true);
    try {
      const res = await fetch(`/api/admin/complaints/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus === 'Resolved' ? undefined : editStatus,
          assignedDepartment: editDept,
          comment: adminNote.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { complaint?: ComplaintRecord; error?: string };
      if (!res.ok || !data.complaint) {
        setActionError(data.error || 'Could not update complaint.');
        return;
      }
      setSelected(data.complaint);
      setAdminNote('');
      setActionSuccess('Complaint updated and persisted.');
      await fetchAdminComplaints();
      onDataChanged();
    } catch {
      setActionError('Network error while saving update.');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleResolveComplaint = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setActionError(null);
    setActionSuccess(null);

    if (resolutionComments.trim().length < 8) {
      setActionError(
        'Please enter clear resolution comments (at least 8 characters) to confirm resolution.'
      );
      return;
    }

    setResolving(true);
    try {
      const res = await fetch(`/api/admin/complaints/${encodeURIComponent(selected.id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionComments: resolutionComments.trim() }),
      });
      const data = (await res.json()) as { complaint?: ComplaintRecord; error?: string };
      if (!res.ok || !data.complaint) {
        setActionError(data.error || 'Could not resolve complaint.');
        return;
      }
      setSelected(data.complaint);
      setEditStatus(data.complaint.status);
      setResolutionComments('');
      setActionSuccess('Complaint confirmed as Resolved and AI Closure Summary generated.');
      await fetchAdminComplaints();
      onDataChanged();
    } catch {
      setActionError('Network error while resolving complaint.');
    } finally {
      setResolving(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6 pb-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2.5 text-slate-900">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <h1 className="font-display text-2xl font-bold">Administrator Sign In</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Role-based access control protects reporter information, department reassignment, and final complaint resolution.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {loginError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
              >
                {loginError}
              </div>
            )}

            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-800">
                Staff Email
              </label>
              <input
                id="adminEmail"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@resolveai.edu"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-slate-800">
                Password
              </label>
              <input
                id="adminPassword"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
            >
              {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign In to Admin Console
            </button>
          </form>

          {/* Hackathon Demo Credentials Helper */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-500">
              Hackathon Demo Credentials (Click to auto-fill)
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setLoginEmail(acc.email);
                    setLoginPassword(acc.pass);
                    setLoginError(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/50 cursor-pointer"
                >
                  <p className="text-xs font-semibold text-slate-900">{acc.label}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute filtered view counts
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === 'Pending' || c.status === 'Assigned').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const criticalCount = complaints.filter((c) => c.priority === 'Critical').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Admin Operations Dashboard
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-900">{user.name}</span>
            <span aria-hidden="true">·</span>
            <span className="text-violet-700 font-medium">
              {user.role === 'super_admin' ? 'Super Administrator' : `${user.department} Lead`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs text-slate-500">{user.email}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRunMonitor}
            disabled={runningMonitor}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100 whitespace-nowrap cursor-pointer"
          >
            {runningMonitor ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity className="h-3.5 w-3.5" />
            )}
            Run SLA Escalation Check
          </button>
          <button
            type="button"
            onClick={() => void fetchAdminComplaints()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 whitespace-nowrap cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {monitorNotice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {monitorNotice}
        </div>
      )}

      {/* 5-Column KPI Strip */}
      <div className="grid grid-cols-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Total Visible</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {totalCount}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Pending / Assigned</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-blue-600 tabular-nums">
            {pendingCount}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">In Progress</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-violet-700 tabular-nums">
            {inProgressCount}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Resolved</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-emerald-600 tabular-nums">
            {resolvedCount}
          </p>
        </div>
        <div className="col-span-2 p-4 sm:col-span-1 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Critical Priority</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-rose-600 tabular-nums">
            {criticalCount}
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void fetchAdminComplaints();
            }}
            placeholder="Search ID, title, reporter, location..."
            className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
        >
          <option value="All">All Categories</option>
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by department"
          value={user.role === 'dept_lead' ? user.department : departmentFilter}
          disabled={user.role === 'dept_lead'}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 focus:border-blue-600 focus:outline-none"
        >
          <option value="All">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
        >
          <option value="All">All Priorities</option>
          {PRIORITY_LEVELS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            {COMPLAINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'priority' ? 'newest' : 'priority')}
            title="Toggle sort order"
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {sortBy === 'priority' ? 'Sort: Priority' : 'Sort: Newest'}
          </button>
        </div>
      </div>

      {listError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {listError}
        </div>
      )}

      {/* Main Split: Table + Inspector Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div
          className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${
            selected ? 'lg:col-span-7' : 'lg:col-span-12'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Complaint ID</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Issue &amp; Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      No complaints match your current filter selection.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => {
                    const isSelected = selected?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => openTicket(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap tabular-nums">
                          {c.id}
                        </td>
                        <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                          <div className="font-medium">{c.fullName}</div>
                          <div className="text-xs text-slate-500">{c.sentiment}</div>
                        </td>
                        <td className="max-w-xs px-4 py-3">
                          <div className="truncate font-semibold text-slate-900">{c.title}</div>
                          <div className="text-xs text-slate-500">{c.category}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PrioritySignal priority={c.priority} />
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                          {c.assignedDepartment}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                          {formatDateTime(c.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusSignal status={c.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Complaint Inspector & Controls */}
        {selected && (
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-blue-700">{selected.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selected.category}</span>
                </div>
                <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                  {selected.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close inspector"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrioritySignal priority={selected.priority} />
              <StatusSignal status={selected.status} />
              <SentimentSignal sentiment={selected.sentiment} />
            </div>

            {selected.needsHumanReview && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  <strong>Human Review Required:</strong>{' '}
                  {selected.escalationReason || 'Critical complaint escalated.'}
                </span>
              </div>
            )}

            {selected.possibleDuplicateOf && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Duplicate Alert:</strong> Similar to {selected.possibleDuplicateOf}.{' '}
                  {selected.duplicateReason}
                </span>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">{selected.fullName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{selected.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{selected.location}</span>
              </div>
              <p className="pt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800">
                {selected.description}
              </p>

              {selected.detectedLanguage !== 'English' && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-800">
                  <p className="flex items-center gap-1 font-semibold text-blue-800">
                    <Globe className="h-3.5 w-3.5" />
                    {selected.detectedLanguage} → English Translation
                  </p>
                  <p className="mt-1">{selected.englishTranslation}</p>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/50 p-3.5 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-violet-900">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                AI Triage &amp; Recommended Action
              </p>
              <p className="text-slate-700">
                <strong>Priority Rationale:</strong> {selected.priorityReason}
              </p>
              <p className="text-slate-700">
                <strong>Suggested Resolution:</strong> {selected.suggestedResolution}
              </p>
            </div>

            {actionError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                {actionSuccess}
              </div>
            )}

            {/* Update Status, Reassign Department & Comment */}
            {selected.status !== 'Resolved' ? (
              <>
                <form
                  onSubmit={handleUpdateTicket}
                  className="space-y-3 border-t border-slate-100 pt-4"
                >
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Update Status &amp; Department
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as ComplaintStatus)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      >
                        {COMPLAINT_STATUSES.filter((s) => s !== 'Resolved').map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Department
                        </span>
                      </label>
                      <select
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value as DepartmentName)}
                        disabled={user.role === 'dept_lead'}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 focus:border-blue-600 focus:outline-none"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Progress / Action Comment (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Add technician dispatch notes or update for the reporter..."
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingUpdate}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 cursor-pointer"
                  >
                    {savingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save Ticket Update
                  </button>
                </form>

                {/* Stage 8: Admin Confirmation & AI Closure Summary */}
                <form
                  onSubmit={handleResolveComplaint}
                  className="space-y-3 border-t border-slate-200 pt-4"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Confirm Resolution &amp; Generate AI Closure Summary
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    AI cannot close tickets independently. Enter the verified resolution steps taken, and Gemini will generate the user-facing closure summary.
                  </p>
                  <textarea
                    rows={3}
                    required
                    value={resolutionComments}
                    onChange={(e) => setResolutionComments(e.target.value)}
                    placeholder="Describe exactly how the issue was fixed (e.g. Replaced burnt MCB breaker and restored 3-phase power)..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={resolving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                  >
                    {resolving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Closure Summary...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Complaint as Resolved
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800">
                  Resolved · AI Closure Summary
                </p>
                <p className="text-sm text-slate-800">{selected.closureSummary}</p>
              </div>
            )}

            {/* Existing Comments */}
            {selected.adminComments.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500">Resolution Log</p>
                {selected.adminComments.map((cmt) => (
                  <div
                    key={cmt.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {cmt.authorName} · {cmt.authorRole}
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatDateTime(cmt.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{cmt.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
