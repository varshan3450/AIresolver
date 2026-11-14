import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Send,
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
import type { AppView } from './HomePage';

interface SubmitComplaintPageProps {
  onSubmitted: () => void;
  onNavigate: (view: AppView, trackId?: string) => void;
}

const MULTILINGUAL_PRESETS = [
  {
    label: 'English · Critical Electrical',
    fullName: 'Karthik Rao',
    email: 'karthik.rao@campus.edu',
    title: 'Main fuse box emitting smoke in Mechanical Workshop',
    location: 'Mechanical Workshop Bay 2',
    description:
      'Thick smoke and sparking noises are coming from the 440V three-phase breaker panel near Lathe Machine 4. Power has tripped twice and workers have stepped outside for safety.',
  },
  {
    label: 'Kannada (ಕನ್ನಡ) · Hostel Water',
    fullName: 'Deepak Gowda',
    email: 'deepak.gowda@campus.edu',
    title: 'ಹಾಸ್ಟೆಲ್ ನೀರಿನ ಪೈಪ್ ಒಡೆದು ನೀರು ಸೋರುತ್ತಿದೆ',
    location: 'Cauvery Boys Hostel, 2nd Floor',
    description:
      'ನಮ್ಮ ಕಾವೇರಿ ಹಾಸ್ಟೆಲ್ ಎರಡನೇ ಮಹಡಿಯ ಸ್ನಾನಗೃಹದಲ್ಲಿ ಬೆಳಿಗ್ಗೆಯಿಂದ ನೀರಿನ ಪೈಪ್ ಒಡೆದು ನಿರಂತರವಾಗಿ ನೀರು ಸೋರುತ್ತಿದೆ. ಕಾರಿಡಾರ್ ತುಂಬಾ ನೀರು ತುಂಬಿದ್ದು ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಓಡಾಡಲು ತೊಂದರೆಯಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಸರಿಪಡಿಸಿ.',
  },
  {
    label: 'Hindi (हिन्दी) · Classroom Wi-Fi',
    fullName: 'Neha Verma',
    email: 'neha.verma@campus.edu',
    title: 'कक्षा 305 में वाई-फाई और इंटरनेट काम नहीं कर रहा है',
    location: 'Academic Block C, Room 305',
    description:
      'पिछले दो दिनों से अकादमिक ब्लॉक C के कमरा नंबर 305 में कॉलेज वाई-फाई बिल्कुल काम नहीं कर रहा है। ऑनलाइन परीक्षा और लैब प्रोजेक्ट अपलोड करने में छात्रों को बहुत परेशानी हो रही है।',
  },
];

export function saveTrackingAccess(complaintId: string, token: string) {
  try {
    const rawTokens = localStorage.getItem('resolveai_tokens');
    const tokenMap = rawTokens ? (JSON.parse(rawTokens) as Record<string, string>) : {};
    tokenMap[complaintId.toUpperCase()] = token;
    localStorage.setItem('resolveai_tokens', JSON.stringify(tokenMap));

    const rawRecent = localStorage.getItem('resolveai_recent_ids');
    const recent = rawRecent ? (JSON.parse(rawRecent) as string[]) : [];
    const updated = [complaintId, ...recent.filter((id) => id !== complaintId)].slice(0, 6);
    localStorage.setItem('resolveai_recent_ids', JSON.stringify(updated));
  } catch {
    // Ignore storage quota issues
  }
}

export function SubmitComplaintPage({ onSubmitted, onNavigate }: SubmitComplaintPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicComplaintView | null>(null);
  const [copied, setCopied] = useState(false);

  const applyPreset = (preset: (typeof MULTILINGUAL_PRESETS)[number]) => {
    setFullName(preset.fullName);
    setEmail(preset.email);
    setTitle(preset.title);
    setLocation(preset.location);
    setDescription(preset.description);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (title.trim().length < 5) {
      setError('Please enter a clear complaint title (at least 5 characters).');
      return;
    }
    if (location.trim().length < 2) {
      setError('Please specify the campus or hostel location.');
      return;
    }
    if (description.trim().length < 15) {
      setError('Please provide a detailed description (at least 15 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          title: title.trim(),
          location: location.trim(),
          description: description.trim(),
        }),
      });
      const data = (await res.json()) as {
        complaint?: PublicComplaintView;
        trackingToken?: string;
        error?: string;
      };
      if (!res.ok || !data.complaint) {
        setError(data.error || 'Unable to submit complaint. Please try again.');
        return;
      }
      if (data.trackingToken) {
        saveTrackingAccess(data.complaint.id, data.trackingToken);
      }
      setResult(data.complaint);
      onSubmitted();
    } catch {
      setError('Network error while connecting to the ResolveAI backend.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const resetForm = () => {
    setResult(null);
    setFullName('');
    setEmail('');
    setTitle('');
    setLocation('');
    setDescription('');
    setError(null);
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Submit a Complaint
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Describe your issue in English, Kannada, or Hindi. ResolveAI automatically analyzes severity, detects sentiment, checks duplicates, and routes it to the responsible department.
        </p>
      </div>

      {result ? (
        <div className="space-y-6">
          {/* Success Confirmation Header */}
          <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Complaint Submitted &amp; Analysed Successfully
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Save your Complaint ID below to track live updates and view the final resolution summary.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 shrink-0">
                <span className="font-mono text-base font-bold text-blue-800 tabular-nums">
                  {result.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="rounded p-1 text-blue-700 hover:bg-blue-100 cursor-pointer"
                  aria-label="Copy Complaint ID"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {result.needsHumanReview && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <span className="font-semibold">Immediate Human Review Flagged:</span>{' '}
                  {result.escalationReason ||
                    'Classified as Critical priority and escalated to administrators immediately.'}
                </div>
              </div>
            )}

            {result.possibleDuplicateOf && (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <span className="font-semibold">Possible Duplicate Detected:</span> Similar to{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('track', result.possibleDuplicateOf || undefined)}
                    className="font-mono font-semibold underline hover:text-amber-950 cursor-pointer"
                  >
                    {result.possibleDuplicateOf}
                  </button>
                  {result.duplicateReason ? ` — ${result.duplicateReason}` : ''}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('track', result.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap cursor-pointer"
              >
                Track This Complaint
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                Submit Another Complaint
              </button>
            </div>
          </div>

          {/* AI Triage Breakdown + Workflow Stages */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Gemini AI Analysis &amp; Routing Result
                  </h3>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Engine: {result.aiAnalysisStatus === 'gemini' ? 'Gemini AI' : 'Fallback Classifier'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Classified Category</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{result.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Assigned Department</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {result.assignedDepartment}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Priority Level</p>
                  <div className="mt-1 flex items-center gap-2">
                    <PrioritySignal priority={result.priority} />
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      Urgency {result.urgencyScore}/10
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Current Status &amp; Sentiment</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2.5">
                    <StatusSignal status={result.status} />
                    <SentimentSignal sentiment={result.sentiment} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Why This Priority Was Assigned</p>
                  <p className="mt-1 text-slate-800">{result.priorityReason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Sentiment Reasoning</p>
                  <p className="mt-1 text-slate-700">{result.sentimentReason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    AI Suggested Resolution (For {result.assignedDepartment})
                  </p>
                  <p className="mt-1 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-slate-800">
                    {result.suggestedResolution}
                  </p>
                </div>
                {result.detectedLanguage !== 'English' && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                      Detected Language: {result.detectedLanguage} — English Summary
                    </p>
                    <p className="mt-1 text-slate-800">{result.englishTranslation}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Executed Agentic Workflow
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Only stages actually completed by the backend are marked executed.
              </p>

              <div className="mt-4 divide-y divide-slate-100">
                {result.workflowStages.map((stage) => (
                  <div key={stage.stage} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <span className="font-mono text-xs text-slate-400">
                          0{stage.stage}.
                        </span>
                        <span>{stage.name}</span>
                      </div>
                      {stage.outcome && (
                        <p className="mt-0.5 pl-6 text-xs text-slate-600">{stage.outcome}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {stage.executed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Done
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                      {stage.executedAt && (
                        <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {formatDateTime(stage.executedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8"
          >
            {/* Quick Multilingual Demo Presets */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <p className="text-xs font-semibold text-slate-500">
                Quick-Fill Test Samples (English, Kannada &amp; Hindi)
              </p>
              <div className="flex flex-wrap gap-2">
                {MULTILINGUAL_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-800">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ananya Deshmukh"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-800">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  maxLength={120}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ananya@campus.edu"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-800">
                  Complaint Title <span className="text-rose-600">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary of the issue"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-slate-800">
                  Location <span className="text-rose-600">*</span>
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="location"
                    type="text"
                    required
                    maxLength={160}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Building, room, or hostel wing"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3.5 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="description" className="block text-sm font-medium text-slate-800">
                  Detailed Complaint Description <span className="text-rose-600">*</span>
                </label>
                <span className="text-xs text-slate-500 tabular-nums">
                  {description.length}/3000
                </span>
              </div>
              <textarea
                id="description"
                required
                rows={5}
                maxLength={3000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, when it started, and any safety or academic impact. Supports English, ಕನ್ನಡ (Kannada), and हिन्दी (Hindi)."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Your email is kept private and used only to verify tracking access.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing with Gemini AI...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Complaint
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Column Guidance */}
          <aside className="space-y-5 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="font-display text-base font-bold">What Happens Next</h2>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li>
                  <span className="font-semibold text-slate-900">1. Instant Triage:</span> Gemini reads your complaint (including Kannada &amp; Hindi) and classifies category, priority, and sentiment.
                </li>
                <li>
                  <span className="font-semibold text-slate-900">2. Auto-Routing:</span> The system assigns the ticket to IT, Maintenance, Security, Hostel, Academic, or Administration.
                </li>
                <li>
                  <span className="font-semibold text-slate-900">3. Safety Escalation:</span> Critical hazards are automatically flagged for immediate human review.
                </li>
                <li>
                  <span className="font-semibold text-slate-900">4. Verified Closure:</span> Only an authorized department lead or admin can mark a complaint resolved and trigger your AI closure summary.
                </li>
              </ol>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
