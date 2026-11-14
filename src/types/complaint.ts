export const COMPLAINT_CATEGORIES = [
  'Technical Issues',
  'Electrical Issues',
  'Water and Plumbing',
  'Academic Issues',
  'Administration',
  'Security and Safety',
  'Hostel and Accommodation',
  'Other Complaints',
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const DEPARTMENTS = [
  'IT Department',
  'Maintenance Department',
  'Academic Department',
  'Administration Department',
  'Security Department',
  'Hostel Management',
  'General Support',
] as const;

export type DepartmentName = (typeof DEPARTMENTS)[number];

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const COMPLAINT_STATUSES = [
  'Pending',
  'Assigned',
  'In Progress',
  'Escalated',
  'Resolved',
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const SENTIMENT_TYPES = [
  'Calm',
  'Concerned',
  'Frustrated',
  'Distressed',
] as const;

export type SentimentType = (typeof SENTIMENT_TYPES)[number];

export const CATEGORY_TO_DEPARTMENT: Record<ComplaintCategory, DepartmentName> = {
  'Technical Issues': 'IT Department',
  'Electrical Issues': 'Maintenance Department',
  'Water and Plumbing': 'Maintenance Department',
  'Academic Issues': 'Academic Department',
  'Administration': 'Administration Department',
  'Security and Safety': 'Security Department',
  'Hostel and Accommodation': 'Hostel Management',
  'Other Complaints': 'General Support',
};

export interface StatusHistoryEntry {
  step: string;
  status: ComplaintStatus | 'Submitted' | 'AI Analysed';
  actor: string;
  note: string;
  timestamp: string;
}

export interface WorkflowStageRecord {
  stage: number;
  name: string;
  executed: boolean;
  executedAt?: string;
  outcome?: string;
}

export interface AdminComment {
  id: string;
  authorName: string;
  authorRole: string;
  comment: string;
  createdAt: string;
}

export interface ComplaintRecord {
  id: string;
  isDemo: boolean;
  trackingToken: string;
  fullName: string;
  email: string;
  title: string;
  description: string;
  location: string;
  detectedLanguage: 'English' | 'Kannada' | 'Hindi' | 'Other';
  englishTranslation: string;
  category: ComplaintCategory;
  priority: PriorityLevel;
  urgencyScore: number;
  sentiment: SentimentType;
  sentimentReason: string;
  priorityReason: string;
  assignedDepartment: DepartmentName;
  status: ComplaintStatus;
  needsHumanReview: boolean;
  escalationReason: string | null;
  suggestedResolution: string;
  possibleDuplicateOf: string | null;
  duplicateReason: string | null;
  aiAnalysisStatus: 'gemini' | 'fallback';
  adminComments: AdminComment[];
  closureSummary: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
  workflowStages: WorkflowStageRecord[];
}

export type PublicComplaintView = Omit<ComplaintRecord, 'trackingToken' | 'email'> & {
  emailMasked: string;
};

export interface DashboardStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  critical: number;
  demoCount: number;
  byCategory: Record<string, number>;
  byDepartment: Record<string, number>;
}

export interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'dept_lead';
  department: DepartmentName | 'All Departments';
}
