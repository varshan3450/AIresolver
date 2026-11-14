import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  MessageSquareWarning,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type {
  ComplaintStatus,
  PriorityLevel,
  SentimentType,
} from '../types/complaint';

export function StatusSignal({ status }: { status: ComplaintStatus }) {
  switch (status) {
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          Pending
        </span>
      );
    case 'Assigned':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <UserCheck className="h-3.5 w-3.5 text-blue-600" />
          Assigned
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 whitespace-nowrap">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          In Progress
        </span>
      );
    case 'Escalated':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          Escalated
        </span>
      );
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Resolved
        </span>
      );
  }
}

export function PrioritySignal({ priority }: { priority: PriorityLevel }) {
  switch (priority) {
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
          <Flame className="h-3.5 w-3.5 text-rose-600" />
          Critical
        </span>
      );
    case 'High':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          High
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <ArrowUpCircle className="h-3.5 w-3.5 text-blue-600" />
          Medium
        </span>
      );
    case 'Low':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <Info className="h-3.5 w-3.5 text-slate-500" />
          Low
        </span>
      );
  }
}

export function SentimentSignal({ sentiment }: { sentiment: SentimentType }) {
  switch (sentiment) {
    case 'Distressed':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 whitespace-nowrap">
          <AlertOctagon className="h-3.5 w-3.5" />
          Distressed
        </span>
      );
    case 'Frustrated':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap">
          <MessageSquareWarning className="h-3.5 w-3.5" />
          Frustrated
        </span>
      );
    case 'Concerned':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 whitespace-nowrap">
          <Info className="h-3.5 w-3.5" />
          Concerned
        </span>
      );
    case 'Calm':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Calm
        </span>
      );
  }
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
