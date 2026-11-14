import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FilePlus2,
  GitBranch,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  CATEGORY_TO_DEPARTMENT,
  type ComplaintCategory,
  type DashboardStats,
  type PublicComplaintView,
} from '../types/complaint';
import { PrioritySignal, StatusSignal } from './StatusSignals';

export type AppView = 'home' | 'submit' | 'track' | 'admin';

interface HomePageProps {
  stats: DashboardStats | null;
  demoComplaints: PublicComplaintView[];
  onNavigate: (view: AppView, trackId?: string) => void;
}

const WORKFLOW_OVERVIEW = [
  {
    num: '01.',
    title: 'Receive & Validate',
    desc: 'Captures reporter details, location, and multi-language descriptions with a unique tracking ID.',
  },
  {
    num: '02.',
    title: 'AI Understanding',
    desc: 'Gemini analyzes English, Kannada, or Hindi submissions, detects sentiment, and checks duplicates.',
  },
  {
    num: '03.',
    title: 'Category & Priority',
    desc: 'Classifies into 8 campus domains and assigns Low, Medium, High, or Critical priority with reasoning.',
  },
  {
    num: '04.',
    title: 'Department Routing',
    desc: 'Maps issues deterministically to IT, Maintenance, Security, Hostel, Academic, or Admin teams.',
  },
  {
    num: '05.',
    title: 'Auto Assignment',
    desc: 'Creates the departmental ticket immediately with an AI-suggested action plan for technicians.',
  },
  {
    num: '06.',
    title: 'SLA Monitoring',
    desc: 'Continuously tracks open ticket age and transitions against departmental response thresholds.',
  },
  {
    num: '07.',
    title: 'Critical Escalation',
    desc: 'Flags Critical hazards and overdue issues for immediate human administrator review.',
  },
  {
    num: '08.',
    title: 'Closure Summary',
    desc: 'After admin resolution confirmation, Gemini drafts a clear closure summary for the user.',
  },
];

export function HomePage({ stats, demoComplaints, onNavigate }: HomePageProps) {
  const [imgError, setImgError] = useState(false);

  const routingPairs = Object.entries(CATEGORY_TO_DEPARTMENT) as [
    ComplaintCategory,
    string,
  ][];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Split */}
      <section className="pt-4 lg:pt-8">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
          <div className="flex flex-col justify-center space-y-6 lg:col-span-6">
            <div className="text-sm font-medium text-violet-700">
              Agentic AI Complaint Triage &amp; Resolution Platform
            </div>

            <div className="space-y-4">
              <h1
                className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl"
                style={{ textWrap: 'balance' }}
              >
                Your Complaint, Our Priority.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                ResolveAI replaces manual inbox sorting with an 8-stage Gemini AI triage pipeline.
                Every complaint is understood in English, Kannada, or Hindi, prioritized with clear
                reasoning, routed to the right department, and tracked transparently through closure.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('submit')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FilePlus2 className="h-4 w-4" />
                Submit Complaint
              </button>
              <button
                type="button"
                onClick={() => onNavigate('track')}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="h-4 w-4" />
                Track Complaint
              </button>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/70 px-5 py-3 text-sm font-semibold text-violet-800 transition-colors hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Dashboard
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-slate-500">
              <span>Structured Gemini JSON Triage</span>
              <span aria-hidden="true">·</span>
              <span>Automated Department Routing</span>
              <span aria-hidden="true">·</span>
              <span>Human-Confirmed Closure</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              {!imgError ? (
                <img
                  src="/src/assets/images/hero_resolveai_triage_1794632992157.jpg"
                  alt="ResolveAI campus complaint routing and automated AI triage workspace"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-64 w-full object-cover sm:h-80 lg:h-full"
                />
              ) : (
                <div className="flex h-full min-h-72 flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50 p-8 text-center">
                  <GitBranch className="mb-3 h-10 w-10 text-blue-600" />
                  <p className="font-display text-lg font-semibold text-slate-900">
                    ResolveAI Triage Hub
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-slate-600">
                    Automated classification, department assignment, and resolution tracking.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Full-width 4-Column Live KPI Strip */}
      <section aria-label="Live complaint metrics">
        <div className="grid grid-cols-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500">Total Complaints</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.total : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Persisted across sessions</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500">In Progress &amp; Assigned</p>
            <p className="mt-2 font-display text-3xl font-bold text-blue-600 tabular-nums">
              {stats ? stats.assigned + stats.inProgress : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Active with departments</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500">Resolved Cases</p>
            <p className="mt-2 font-display text-3xl font-bold text-emerald-600 tabular-nums">
              {stats ? stats.resolved : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">With AI closure summaries</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500">Critical Escalated</p>
            <p className="mt-2 font-display text-3xl font-bold text-rose-600 tabular-nums">
              {stats ? stats.escalated : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Flagged for human review</p>
          </div>
        </div>
      </section>

      {/* How the 8-Stage Agentic System Works */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              How the Agentic AI Workflow Works
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Every submission executes real backend actions across eight verifiable stages without fabricating steps.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('submit')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Test live submission
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_OVERVIEW.map((item) => (
            <div
              key={item.num}
              className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-200"
            >
              <div className="font-mono text-xs font-semibold text-violet-700">{item.num}</div>
              <h3 className="mt-2 font-display text-base font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Automated Routing & Live Demo Cases */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center gap-2 text-slate-900">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="font-display text-xl font-bold">Automatic Department Routing</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Validated Gemini categories map deterministically to the responsible operational team.
          </p>

          <div className="mt-5 divide-y divide-slate-100">
            {routingPairs.map(([category, dept]) => (
              <div
                key={category}
                className="flex items-center justify-between gap-4 py-2.5 text-sm"
              >
                <span className="font-medium text-slate-800">{category}</span>
                <span className="text-slate-400" aria-hidden="true">
                  →
                </span>
                <span className="text-right font-medium text-blue-700">{dept}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Sample Demonstration Complaints
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Clearly labelled demo cases showing different AI categories, priorities, and resolution stages.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('track')}
              className="text-sm font-semibold text-violet-700 hover:text-violet-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Tracker →
            </button>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {demoComplaints.map((demo) => (
              <div
                key={demo.id}
                className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-blue-700">{demo.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{demo.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{demo.assignedDepartment}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-900">{demo.title}</p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <PrioritySignal priority={demo.priority} />
                  <StatusSignal status={demo.status} />
                  <button
                    type="button"
                    onClick={() => onNavigate('track', demo.id)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              Critical tickets automatically flag for human review
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Admin confirmation required before resolution
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
