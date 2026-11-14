import crypto from 'node:crypto';
import {
  CATEGORY_TO_DEPARTMENT,
  COMPLAINT_STATUSES,
  DEPARTMENTS,
  type AdminUserSession,
  type ComplaintRecord,
  type ComplaintStatus,
  type DepartmentName,
  type PublicComplaintView,
} from '../src/types/complaint.ts';
import {
  analyzeComplaintWithGemini,
  generateResolutionSummaryWithGemini,
} from './aiAgent.ts';
import { mutateDb, readDb } from './db.ts';

export function toPublicComplaintView(c: ComplaintRecord): PublicComplaintView {
  const [local, domain] = c.email.split('@');
  const maskedLocal =
    local && local.length > 2
      ? `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 2))}`
      : '***';
  const emailMasked = domain ? `${maskedLocal}@${domain}` : '***';

  const { trackingToken: _token, email: _email, ...rest } = c;
  return {
    ...rest,
    emailMasked,
  };
}

export async function submitAndAnalyzeComplaint(input: {
  fullName: string;
  email: string;
  title: string;
  description: string;
  location: string;
}): Promise<{ complaint: ComplaintRecord; trackingToken: string }> {
  const now1 = new Date().toISOString();
  const snapshot = await readDb();
  const openComplaints = snapshot.complaints.filter((c) => c.status !== 'Resolved');

  // Stage 2 & 3: Understand, analyse, classify category, priority, sentiment & duplicates
  const analysis = await analyzeComplaintWithGemini({
    title: input.title,
    description: input.description,
    location: input.location,
    recentOpenComplaints: openComplaints,
  });

  // Stage 4: Deterministic department selection from validated category
  const assignedDepartment: DepartmentName = CATEGORY_TO_DEPARTMENT[analysis.category];

  // Stage 5 & 7: Auto-assign, and flag/escalate Critical complaints for immediate human review
  const isCritical = analysis.priority === 'Critical';
  const initialStatus: ComplaintStatus = isCritical ? 'Escalated' : 'Assigned';
  const trackingToken = crypto.randomBytes(18).toString('hex');

  const now2 = new Date(Date.now() + 100).toISOString();
  const now3 = new Date(Date.now() + 200).toISOString();
  const now4 = new Date(Date.now() + 300).toISOString();

  const statusHistory: ComplaintRecord['statusHistory'] = [
    {
      step: 'Complaint Submitted',
      status: 'Submitted',
      actor: input.fullName,
      note: 'Complaint received and validated by ResolveAI backend.',
      timestamp: now1,
    },
    {
      step: 'AI Analysed',
      status: 'AI Analysed',
      actor:
        analysis.aiAnalysisStatus === 'gemini'
          ? 'Gemini AI Triage Agent'
          : 'ResolveAI Fallback Classifier',
      note: `Classified as ${analysis.category} · Priority: ${analysis.priority} · Sentiment: ${analysis.sentiment} (${analysis.detectedLanguage}).`,
      timestamp: now2,
    },
    {
      step: 'Assigned',
      status: 'Assigned',
      actor: 'ResolveAI Routing Engine',
      note: `Automatically assigned to ${assignedDepartment}.`,
      timestamp: now3,
    },
  ];

  if (isCritical) {
    statusHistory.push({
      step: 'Escalated',
      status: 'Escalated',
      actor: 'ResolveAI Escalation Guard',
      note: 'Critical priority detected — flagged for immediate human review.',
      timestamp: now4,
    });
  }

  const workflowStages: ComplaintRecord['workflowStages'] = [
    {
      stage: 1,
      name: 'Receive Complaint',
      executed: true,
      executedAt: now1,
      outcome: 'Validated and persisted to database.',
    },
    {
      stage: 2,
      name: 'Understand & Analyse',
      executed: true,
      executedAt: now2,
      outcome: `Language: ${analysis.detectedLanguage} · Sentiment: ${analysis.sentiment}`,
    },
    {
      stage: 3,
      name: 'Classify Category & Urgency',
      executed: true,
      executedAt: now2,
      outcome: `${analysis.category} · ${analysis.priority} (${analysis.urgencyScore}/10)`,
    },
    {
      stage: 4,
      name: 'Select Department',
      executed: true,
      executedAt: now3,
      outcome: assignedDepartment,
    },
    {
      stage: 5,
      name: 'Create Assignment',
      executed: true,
      executedAt: now3,
      outcome: `Assigned to ${assignedDepartment} queue`,
    },
    {
      stage: 6,
      name: 'Monitor Status',
      executed: true,
      executedAt: now3,
      outcome: isCritical ? 'Immediate SLA alert active' : 'SLA monitor active',
    },
    {
      stage: 7,
      name: 'Escalate Critical / Overdue',
      executed: isCritical,
      executedAt: isCritical ? now4 : undefined,
      outcome: isCritical ? 'Escalated for immediate human review' : undefined,
    },
    {
      stage: 8,
      name: 'Generate Closure Summary',
      executed: false,
    },
  ];

  const created = await mutateDb((db) => {
    db.sequence += 1;
    const id = `CMP-2026-${db.sequence}`;
    const record: ComplaintRecord = {
      id,
      isDemo: false,
      trackingToken,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      title: input.title,
      description: input.description,
      location: input.location,
      detectedLanguage: analysis.detectedLanguage,
      englishTranslation: analysis.englishTranslation,
      category: analysis.category,
      priority: analysis.priority,
      urgencyScore: analysis.urgencyScore,
      sentiment: analysis.sentiment,
      sentimentReason: analysis.sentimentReason,
      priorityReason: analysis.priorityReason,
      assignedDepartment,
      status: initialStatus,
      needsHumanReview: isCritical,
      escalationReason: isCritical
        ? 'Critical severity classified by AI triage — requires immediate human verification.'
        : null,
      suggestedResolution: analysis.suggestedResolution,
      possibleDuplicateOf: analysis.possibleDuplicateOf,
      duplicateReason: analysis.duplicateReason,
      aiAnalysisStatus: analysis.aiAnalysisStatus,
      adminComments: [],
      closureSummary: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: now1,
      updatedAt: isCritical ? now4 : now3,
      statusHistory,
      workflowStages,
    };
    db.complaints.unshift(record);
    return record;
  });

  return { complaint: created, trackingToken };
}

// Stage 6 & 7: Monitor open complaints and escalate overdue or unflagged critical items
export async function runOverdueAndCriticalMonitor(actorName = 'ResolveAI SLA Monitor'): Promise<{
  checkedCount: number;
  escalatedIds: string[];
}> {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const HIGH_SLA_MS = 24 * 60 * 60 * 1000;
  const MEDIUM_SLA_MS = 48 * 60 * 60 * 1000;

  return mutateDb((db) => {
    const escalatedIds: string[] = [];
    let checkedCount = 0;

    for (const c of db.complaints) {
      if (c.status === 'Resolved') continue;
      checkedCount++;

      const ageMs = nowMs - new Date(c.createdAt).getTime();
      const isOverdueHigh = c.priority === 'High' && ageMs > HIGH_SLA_MS;
      const isOverdueMed = c.priority === 'Medium' && ageMs > MEDIUM_SLA_MS;
      const isUnflaggedCritical = c.priority === 'Critical' && c.status !== 'Escalated';

      if ((isUnflaggedCritical || isOverdueHigh || isOverdueMed) && c.status !== 'Escalated') {
        const reason = isUnflaggedCritical
          ? 'Critical priority ticket escalated for immediate human review.'
          : `SLA threshold exceeded (${Math.round(ageMs / 3600000)}h open for ${c.priority} priority).`;

        c.status = 'Escalated';
        c.needsHumanReview = true;
        c.escalationReason = reason;
        c.updatedAt = nowIso;
        c.statusHistory.push({
          step: 'Escalated',
          status: 'Escalated',
          actor: actorName,
          note: reason,
          timestamp: nowIso,
        });

        const stage6 = c.workflowStages.find((s) => s.stage === 6);
        if (stage6) {
          stage6.executed = true;
          stage6.executedAt = nowIso;
          stage6.outcome = 'SLA threshold breached';
        }
        const stage7 = c.workflowStages.find((s) => s.stage === 7);
        if (stage7) {
          stage7.executed = true;
          stage7.executedAt = nowIso;
          stage7.outcome = reason;
        }

        escalatedIds.push(c.id);
      }
    }

    return { checkedCount, escalatedIds };
  });
}

export async function updateComplaintByAdmin(input: {
  id: string;
  admin: AdminUserSession;
  status?: ComplaintStatus;
  assignedDepartment?: DepartmentName;
  comment?: string;
}): Promise<ComplaintRecord> {
  const nowIso = new Date().toISOString();

  return mutateDb((db) => {
    const complaint = db.complaints.find((c) => c.id === input.id);
    if (!complaint) {
      throw new Error('NOT_FOUND');
    }
    if (
      input.admin.role === 'dept_lead' &&
      complaint.assignedDepartment !== input.admin.department
    ) {
      throw new Error('FORBIDDEN');
    }

    if (input.status === 'Resolved') {
      throw new Error('USE_RESOLVE_ENDPOINT');
    }

    if (input.assignedDepartment && input.assignedDepartment !== complaint.assignedDepartment) {
      if (!DEPARTMENTS.includes(input.assignedDepartment)) {
        throw new Error('INVALID_DEPARTMENT');
      }
      const prevDept = complaint.assignedDepartment;
      complaint.assignedDepartment = input.assignedDepartment;
      complaint.statusHistory.push({
        step: 'Reassigned',
        status: complaint.status,
        actor: input.admin.name,
        note: `Manually reassigned from ${prevDept} to ${input.assignedDepartment}.`,
        timestamp: nowIso,
      });
    }

    if (input.status && input.status !== complaint.status) {
      if (!COMPLAINT_STATUSES.includes(input.status)) {
        throw new Error('INVALID_STATUS');
      }
      complaint.status = input.status;
      if (input.status !== 'Escalated') {
        complaint.needsHumanReview = false;
      }
      complaint.statusHistory.push({
        step: input.status,
        status: input.status,
        actor: input.admin.name,
        note:
          input.comment && input.comment.trim()
            ? `Status updated to ${input.status}: ${input.comment.trim()}`
            : `Status updated to ${input.status} by ${input.admin.name}.`,
        timestamp: nowIso,
      });

      const stage6 = complaint.workflowStages.find((s) => s.stage === 6);
      if (stage6) {
        stage6.executed = true;
        stage6.executedAt = nowIso;
        stage6.outcome = `Current status: ${input.status}`;
      }
      if (input.status === 'Escalated') {
        complaint.needsHumanReview = true;
        const stage7 = complaint.workflowStages.find((s) => s.stage === 7);
        if (stage7) {
          stage7.executed = true;
          stage7.executedAt = nowIso;
          stage7.outcome = `Escalated by ${input.admin.name}`;
        }
      }
    }

    if (input.comment && input.comment.trim()) {
      complaint.adminComments.push({
        id: `cmt-${crypto.randomBytes(4).toString('hex')}`,
        authorName: input.admin.name,
        authorRole:
          input.admin.role === 'super_admin'
            ? 'Super Administrator'
            : `${input.admin.department} Lead`,
        comment: input.comment.trim(),
        createdAt: nowIso,
      });
    }

    complaint.updatedAt = nowIso;
    return complaint;
  });
}

// Stage 8: Admin confirms resolution -> Gemini generates factual closure summary
export async function resolveComplaintWithSummary(input: {
  id: string;
  admin: AdminUserSession;
  resolutionComments: string;
}): Promise<ComplaintRecord> {
  const snapshot = await readDb();
  const target = snapshot.complaints.find((c) => c.id === input.id);
  if (!target) {
    throw new Error('NOT_FOUND');
  }
  if (
    input.admin.role === 'dept_lead' &&
    target.assignedDepartment !== input.admin.department
  ) {
    throw new Error('FORBIDDEN');
  }

  const closureSummary = await generateResolutionSummaryWithGemini({
    complaint: target,
    resolutionComments: input.resolutionComments,
    resolvedBy: input.admin.name,
  });

  const nowIso = new Date().toISOString();

  return mutateDb((db) => {
    const complaint = db.complaints.find((c) => c.id === input.id);
    if (!complaint) {
      throw new Error('NOT_FOUND');
    }

    complaint.adminComments.push({
      id: `cmt-${crypto.randomBytes(4).toString('hex')}`,
      authorName: input.admin.name,
      authorRole:
        input.admin.role === 'super_admin'
          ? 'Super Administrator'
          : `${input.admin.department} Lead`,
      comment: input.resolutionComments,
      createdAt: nowIso,
    });

    complaint.status = 'Resolved';
    complaint.needsHumanReview = false;
    complaint.closureSummary = closureSummary;
    complaint.resolvedBy = input.admin.name;
    complaint.resolvedAt = nowIso;
    complaint.updatedAt = nowIso;

    complaint.statusHistory.push({
      step: 'Resolved',
      status: 'Resolved',
      actor: input.admin.name,
      note: `Resolved with administrator confirmation. Closure summary generated.`,
      timestamp: nowIso,
    });

    const stage8 = complaint.workflowStages.find((s) => s.stage === 8);
    if (stage8) {
      stage8.executed = true;
      stage8.executedAt = nowIso;
      stage8.outcome = 'AI closure summary generated and persisted';
    }

    return complaint;
  });
}
