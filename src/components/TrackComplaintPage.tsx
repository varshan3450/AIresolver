import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { PublicComplaintView } from '../types/complaint';
import {
  PrioritySignal,
  SentimentSignal,
  StatusSignal,
  formatDateTime,
} from './StatusSignals';

interface TrackComplaintPageProps {
  initialComplaintId?: string;
  demoComplaints: PublicComplaintView[];
}

function getStoredToken(id: string): string {
  try {
    const raw = localStorage.getItem('resolveai_tokens');
    if (!raw) return '';
    const map = JSON.parse(raw) as Record<string, string>;
    return map[id.trim().toUpperCase()] || '';
  } catch {
    return '';
  }
}

function getRecentSubmittedIds(): string[] {
  try {
    const raw = localStorage.getItem('resolveai_recent_ids');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function TrackComplaintPage({
  initialComplaintId,
  demoComplaints,
}: TrackComplaintPageProps) {
  const [complaintId, setComplaintId] = useState(initialComplaintId || '');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<PublicComplaintView | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getRecentSubmittedIds());
  }, []);

  const lookupComplaint = async (idToFind: string, emailOverride?: string) => {
    const cleanId = idToFind.trim().toUpperCase();
    if (!cleanId) {
      setError('Please enter a Complaint ID.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/complaints/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: cleanId,
          email: (emailOverride ?? verificationEmail).trim(),
          trackingToken: getStoredToken(cleanId),
        }),
      });
      const data = (await res.json()) as {
        complaint?: PublicComplaintView;
        error?: string;
        requiresVerification?: boolean;
      };

      if (!res.ok || !data.complaint) {
        if (data.requiresVerification) {
          setNeedsEmailVerification(true);
        } else {
          setNeedsEmailVerification(false);
        }
        setComplaint(null);
        setError(data.error || 'Complaint not found.');
        return;
      }

      setNeedsEmailVerification(false);
      setComplaint(data.complaint);
    } catch {
      setError('Network error while looking up complaint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialComplaintId) {
      setComplaintId(initialComplaintId);
      void lookupComplaint(initialComplaintId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialComplaintId]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void lookupComplaint(complaintId);
  };

  const latestHistory =
    complaint && complaint.statusHistory.length > 0
      ? complaint.statusHistory[complaint.statusHistory.length - 1]
      : null;

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Track Your Complaint
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Enter your Complaint ID to inspect AI routing details, real progress milestones, administrator updates, and closure summaries.
        </p>
      </div>

      {/* Lookup Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                placeholder="Enter Complaint ID (e.g. CMP-DEMO-101 or CMP-2026-1006)"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-4 pl-10 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            {needsEmailVerification && (
              <div className="relative sm:w-72">
                <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-violet-500" />
                <input
                  type="email"
                  value={verificationEmail}
                  onChange={(e) => setVerificationEmail(e.target.value)}
                  placeholder="Reporter email to verify"
                  className="w-full rounded-lg border border-violet-300 bg-violet-50/40 py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-500 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Track Status
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
            >
              {error}
            </div>
          )}
        </form>

        {/* Quick Demo & Recent IDs */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-500">Demo Tickets:</span>
          {demoComplaints.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setComplaintId(d.id);
                setNeedsEmailVerification(false);
                void lookupComplaint(d.id);
              }}
              className={`rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                complaint?.id === d.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {d.id}
            </button>
          ))}

          {recentIds.length > 0 && (
            <>
              <span className="ml-2 text-xs font-semibold text-violet-700">Your Submissions:</span>
              {recentIds.map((rid) => (
                <button
                  key={rid}
                  type="button"
                  onClick={() => {
                    setComplaintId(rid);
                    setNeedsEmailVerification(false);
                    void lookupComplaint(rid);
                  }}
                  className={`rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    complaint?.id === rid
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-violet-200 bg-violet-50/50 text-violet-700 hover:bg-violet-100'
                  }`}
                >
                  {rid}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Complaint Details */}
      {complaint ? (
        <div className="space-y-6">
          {/* Closure Summary Banner when Resolved */}
          {complaint.status === 'Resolved' && complaint.closureSummary && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-800">
                    <span>AI Resolution Closure Summary</span>
                    {complaint.resolvedBy && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Confirmed by {complaint.resolvedBy}</span>
                      </>
                    )}
                    {complaint.resolvedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatDateTime(complaint.resolvedAt)}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-900">
                    {complaint.closureSummary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Dossier */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-blue-700">{complaint.id}</span>
                    {complaint.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-violet-700">Demo Sample</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Submitted {formatDateTime(complaint.createdAt)}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {complaint.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <PrioritySignal priority={complaint.priority} />
                  <StatusSignal status={complaint.status} />
                </div>
              </div>

              {complaint.needsHumanReview && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <span className="font-semibold">Escalated for Human Review:</span>{' '}
                    {complaint.escalationReason || 'Priority critical hazard requires immediate review.'}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Category</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{complaint.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Assigned Department</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {complaint.assignedDepartment}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Location</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {complaint.location}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Reporter &amp; Sentiment</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-800">
                    <span>{complaint.fullName}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <SentimentSignal sentiment={complaint.sentiment} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Complaint Description</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-800">
                    {complaint.description}
                  </p>
                </div>

                {complaint.detectedLanguage !== 'English' && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                      <Globe className="h-3.5 w-3.5" />
                      AI Translation ({complaint.detectedLanguage} → English)
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{complaint.englishTranslation}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500">Priority Assignment Reasoning</p>
                  <p className="mt-1 text-sm text-slate-700">{complaint.priorityReason}</p>
                </div>

                {complaint.possibleDuplicateOf && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Linked as possible duplicate of{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setComplaintId(complaint.possibleDuplicateOf!);
                          void lookupComplaint(complaint.possibleDuplicateOf!);
                        }}
                        className="font-mono font-bold underline cursor-pointer"
                      >
                        {complaint.possibleDuplicateOf}
                      </button>
                      {complaint.duplicateReason ? ` (${complaint.duplicateReason})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Latest Update & Resolution Comments */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">
                    Latest Update &amp; Resolution Comments
                  </p>
                  {latestHistory && (
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      Updated {formatDateTime(latestHistory.timestamp)}
                    </span>
                  )}
                </div>

                {latestHistory && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                    <span className="font-semibold">{latestHistory.step}:</span> {latestHistory.note}
                  </div>
                )}

                {complaint.adminComments.length > 0 ? (
                  <div className="space-y-2.5">
                    {complaint.adminComments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-slate-200 bg-white p-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-900">
                            {c.authorName} · {c.authorRole}
                          </span>
                          <span className="font-mono tabular-nums">
                            {formatDateTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-slate-800">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No administrator comments posted yet. Your complaint is queued with{' '}
                    {complaint.assignedDepartment}.
                  </p>
                )}
              </div>
            </div>

            {/* Visual Progress Timeline (ONLY steps that have actually occurred!) */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Progress Timeline
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Verified chronological milestones — displays only stages that have actually occurred.
                </p>

                <ol className="mt-5 space-y-5 border-l border-blue-200 pl-5">
                  {complaint.statusHistory.map((entry, idx) => {
                    const isLatest = idx === complaint.statusHistory.length - 1;
                    return (
                      <li key={`${entry.step}-${entry.timestamp}-${idx}`} className="relative">
                        <span
                          className={`absolute -left-[25px] top-1 flex h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                            entry.status === 'Resolved'
                              ? 'bg-emerald-600'
                              : entry.status === 'Escalated'
                                ? 'bg-rose-600'
                                : isLatest
                                  ? 'bg-blue-600'
                                  : 'bg-violet-500'
                          }`}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {entry.step}
                          </span>
                          <span className="font-mono text-xs text-slate-500 tabular-nums">
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          Actor: {entry.actor}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{entry.note}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <h3 className="font-display text-base font-bold text-slate-900">
                    AI Suggested Action Plan
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {complaint.suggestedResolution}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-display text-base font-semibold text-slate-900">
            Enter a Complaint ID or select a demo ticket above
          </p>
          <p className="mt-1 text-sm text-slate-500">
            For example, try <span className="font-mono font-semibold">CMP-DEMO-103</span> to view a resolved complaint with an AI closure summary, or <span className="font-mono font-semibold">CMP-DEMO-104</span> to inspect a critical electrical escalation.
          </p>
        </div>
      )}
    </div>
  );
}
