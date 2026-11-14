import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ComplaintRecord, DepartmentName } from '../src/types/complaint.ts';

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'dept_lead';
  department: DepartmentName | 'All Departments';
}

interface DatabaseSchema {
  version: number;
  sequence: number;
  complaints: ComplaintRecord[];
  staff: StaffAccount[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'resolveai-store.json');

export function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function buildSeedData(): DatabaseSchema {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

  const staff: StaffAccount[] = [
    {
      id: 'staff-admin-1',
      name: 'Dr. Kavitha Rao',
      email: 'admin@resolveai.edu',
      passwordHash: hashPassword('ResolveAdmin2026!'),
      role: 'super_admin',
      department: 'All Departments',
    },
    {
      id: 'staff-it-1',
      name: 'Rohan Kulkarni',
      email: 'it.lead@resolveai.edu',
      passwordHash: hashPassword('DeptLead2026!'),
      role: 'dept_lead',
      department: 'IT Department',
    },
    {
      id: 'staff-maint-1',
      name: 'Suresh Gowda',
      email: 'maintenance.lead@resolveai.edu',
      passwordHash: hashPassword('DeptLead2026!'),
      role: 'dept_lead',
      department: 'Maintenance Department',
    },
    {
      id: 'staff-sec-1',
      name: 'Meenakshi Iyer',
      email: 'security.lead@resolveai.edu',
      passwordHash: hashPassword('DeptLead2026!'),
      role: 'dept_lead',
      department: 'Security Department',
    },
  ];

  const complaints: ComplaintRecord[] = [
    {
      id: 'CMP-DEMO-101',
      isDemo: true,
      trackingToken: 'demo-public-101',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@campus.edu',
      title: '[DEMO] College Wi-Fi not working in Engineering Block',
      description:
        'Campus Wi-Fi SSID "CampusNet-5G" has been completely unreachable on the 2nd and 3rd floors of the Engineering Block since yesterday morning. Students cannot access online lab portals or submit assignments.',
      location: 'Engineering Block, 2nd & 3rd Floor Labs',
      detectedLanguage: 'English',
      englishTranslation:
        'Campus Wi-Fi SSID "CampusNet-5G" has been unreachable on the 2nd and 3rd floors of the Engineering Block since yesterday morning, blocking online lab access.',
      category: 'Technical Issues',
      priority: 'High',
      urgencyScore: 8,
      sentiment: 'Frustrated',
      sentimentReason: 'Multi-day outage directly blocking academic assignment submissions.',
      priorityReason:
        'Affects multiple academic labs and blocks coursework portals across two entire floors.',
      assignedDepartment: 'IT Department',
      status: 'In Progress',
      needsHumanReview: false,
      escalationReason: null,
      suggestedResolution:
        'Inspect distribution switch SW-ENG-02 and access points AP-204 through AP-212; verify DHCP lease pool capacity and restore RADIUS authentication.',
      possibleDuplicateOf: null,
      duplicateReason: null,
      aiAnalysisStatus: 'gemini',
      adminComments: [
        {
          id: 'cmt-demo-101-1',
          authorName: 'Rohan Kulkarni',
          authorRole: 'IT Department Lead',
          comment:
            'Identified faulty fiber uplink SFP module on Floor 2 distribution rack. Replacement module is currently being installed.',
          createdAt: hoursAgo(2),
        },
      ],
      closureSummary: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: hoursAgo(14),
      updatedAt: hoursAgo(2),
      statusHistory: [
        {
          step: 'Complaint Submitted',
          status: 'Submitted',
          actor: 'Aarav Sharma',
          note: 'Complaint submitted via ResolveAI portal.',
          timestamp: hoursAgo(14),
        },
        {
          step: 'AI Analysed',
          status: 'AI Analysed',
          actor: 'ResolveAI Triage Agent',
          note: 'Classified as Technical Issues with High priority (Sentiment: Frustrated).',
          timestamp: hoursAgo(13.99),
        },
        {
          step: 'Assigned',
          status: 'Assigned',
          actor: 'ResolveAI Routing Engine',
          note: 'Automatically assigned to IT Department.',
          timestamp: hoursAgo(13.98),
        },
        {
          step: 'In Progress',
          status: 'In Progress',
          actor: 'Rohan Kulkarni',
          note: 'Network technician dispatched; SFP uplink replacement underway.',
          timestamp: hoursAgo(2),
        },
      ],
      workflowStages: [
        { stage: 1, name: 'Receive Complaint', executed: true, executedAt: hoursAgo(14), outcome: 'Validated and persisted.' },
        { stage: 2, name: 'Understand & Analyse', executed: true, executedAt: hoursAgo(13.99), outcome: 'Language: English · Sentiment: Frustrated' },
        { stage: 3, name: 'Classify Category & Urgency', executed: true, executedAt: hoursAgo(13.99), outcome: 'Technical Issues · High' },
        { stage: 4, name: 'Select Department', executed: true, executedAt: hoursAgo(13.98), outcome: 'IT Department' },
        { stage: 5, name: 'Create Assignment', executed: true, executedAt: hoursAgo(13.98), outcome: 'Assigned to IT Department queue' },
        { stage: 6, name: 'Monitor Status', executed: true, executedAt: hoursAgo(2), outcome: 'Active within SLA window' },
        { stage: 7, name: 'Escalate Critical / Overdue', executed: false },
        { stage: 8, name: 'Generate Closure Summary', executed: false },
      ],
    },
    {
      id: 'CMP-DEMO-102',
      isDemo: true,
      trackingToken: 'demo-public-102',
      fullName: 'Priya Nair',
      email: 'priya.nair@campus.edu',
      title: '[DEMO] Water leakage in hostel bathroom',
      description:
        'A burst supply pipe behind the washbasins in Kaveri Hostel Wing B (3rd Floor) is leaking continuously onto the corridor floor, creating slip hazards and wasting water.',
      location: 'Kaveri Hostel, Wing B, 3rd Floor Washroom',
      detectedLanguage: 'English',
      englishTranslation:
        'Continuous pipe leakage behind washbasins in Kaveri Hostel Wing B 3rd floor causing flooding and slip hazards.',
      category: 'Water and Plumbing',
      priority: 'High',
      urgencyScore: 8,
      sentiment: 'Distressed',
      sentimentReason: 'Continuous flooding in residential wing creating immediate hygiene and slip risk.',
      priorityReason:
        'Active water leak inside residential hostel requires prompt valve isolation and plumbing repair to prevent structural damage.',
      assignedDepartment: 'Maintenance Department',
      status: 'Assigned',
      needsHumanReview: false,
      escalationReason: null,
      suggestedResolution:
        'Shut off the 3rd-floor Wing B isolation valve immediately, replace the damaged PVC elbow joint, and clear standing water from the corridor.',
      possibleDuplicateOf: null,
      duplicateReason: null,
      aiAnalysisStatus: 'gemini',
      adminComments: [],
      closureSummary: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(5.9),
      statusHistory: [
        {
          step: 'Complaint Submitted',
          status: 'Submitted',
          actor: 'Priya Nair',
          note: 'Complaint submitted via ResolveAI portal.',
          timestamp: hoursAgo(6),
        },
        {
          step: 'AI Analysed',
          status: 'AI Analysed',
          actor: 'ResolveAI Triage Agent',
          note: 'Classified as Water and Plumbing with High priority (Sentiment: Distressed).',
          timestamp: hoursAgo(5.98),
        },
        {
          step: 'Assigned',
          status: 'Assigned',
          actor: 'ResolveAI Routing Engine',
          note: 'Automatically assigned to Maintenance Department.',
          timestamp: hoursAgo(5.9),
        },
      ],
      workflowStages: [
        { stage: 1, name: 'Receive Complaint', executed: true, executedAt: hoursAgo(6), outcome: 'Validated and persisted.' },
        { stage: 2, name: 'Understand & Analyse', executed: true, executedAt: hoursAgo(5.98), outcome: 'Language: English · Sentiment: Distressed' },
        { stage: 3, name: 'Classify Category & Urgency', executed: true, executedAt: hoursAgo(5.98), outcome: 'Water and Plumbing · High' },
        { stage: 4, name: 'Select Department', executed: true, executedAt: hoursAgo(5.9), outcome: 'Maintenance Department' },
        { stage: 5, name: 'Create Assignment', executed: true, executedAt: hoursAgo(5.9), outcome: 'Assigned to Maintenance Department queue' },
        { stage: 6, name: 'Monitor Status', executed: true, executedAt: hoursAgo(5.9), outcome: 'Monitoring SLA timer' },
        { stage: 7, name: 'Escalate Critical / Overdue', executed: false },
        { stage: 8, name: 'Generate Closure Summary', executed: false },
      ],
    },
    {
      id: 'CMP-DEMO-103',
      isDemo: true,
      trackingToken: 'demo-public-103',
      fullName: 'Prof. Vikram Hegde',
      email: 'vikram.hegde@campus.edu',
      title: '[DEMO] Projector not functioning in classroom',
      description:
        'The ceiling-mounted Epson projector in Lecture Hall CS-204 powers on with an amber lamp warning LED and shuts down after 30 seconds, interrupting morning classes.',
      location: 'Computer Science Building, Lecture Hall CS-204',
      detectedLanguage: 'English',
      englishTranslation:
        'Ceiling-mounted projector in CS-204 displays an amber lamp warning and shuts down after 30 seconds.',
      category: 'Technical Issues',
      priority: 'Medium',
      urgencyScore: 5,
      sentiment: 'Concerned',
      sentimentReason: 'Equipment malfunction affecting scheduled lectures without immediate safety risk.',
      priorityReason:
        'Disrupts classroom instruction in CS-204, though classes can temporarily relocate or use whiteboard backup.',
      assignedDepartment: 'IT Department',
      status: 'Resolved',
      needsHumanReview: false,
      escalationReason: null,
      suggestedResolution:
        'Test projector lamp hours and HDMI splitter; replace lamp module or swap spare AV unit if ballast has failed.',
      possibleDuplicateOf: null,
      duplicateReason: null,
      aiAnalysisStatus: 'gemini',
      adminComments: [
        {
          id: 'cmt-demo-103-1',
          authorName: 'Rohan Kulkarni',
          authorRole: 'IT Department Lead',
          comment:
            'AV technician replaced the depleted projector lamp cartridge, cleaned the intake dust filter, and verified HDMI projection with faculty laptop.',
          createdAt: hoursAgo(4),
        },
      ],
      closureSummary:
        'Reported issue: The ceiling projector in Lecture Hall CS-204 was shutting down after 30 seconds with an amber lamp warning during classes. Resolution: The IT Department AV technician replaced the depleted lamp cartridge, cleaned the intake air filter, and verified stable HDMI projection before closing the ticket.',
      resolvedBy: 'Rohan Kulkarni',
      resolvedAt: hoursAgo(4),
      createdAt: hoursAgo(28),
      updatedAt: hoursAgo(4),
      statusHistory: [
        {
          step: 'Complaint Submitted',
          status: 'Submitted',
          actor: 'Prof. Vikram Hegde',
          note: 'Complaint submitted via ResolveAI portal.',
          timestamp: hoursAgo(28),
        },
        {
          step: 'AI Analysed',
          status: 'AI Analysed',
          actor: 'ResolveAI Triage Agent',
          note: 'Classified as Technical Issues with Medium priority (Sentiment: Concerned).',
          timestamp: hoursAgo(27.99),
        },
        {
          step: 'Assigned',
          status: 'Assigned',
          actor: 'ResolveAI Routing Engine',
          note: 'Automatically assigned to IT Department.',
          timestamp: hoursAgo(27.98),
        },
        {
          step: 'In Progress',
          status: 'In Progress',
          actor: 'Rohan Kulkarni',
          note: 'AV technician dispatched to CS-204.',
          timestamp: hoursAgo(12),
        },
        {
          step: 'Resolved',
          status: 'Resolved',
          actor: 'Rohan Kulkarni',
          note: 'Lamp cartridge replaced and verified; AI closure summary generated.',
          timestamp: hoursAgo(4),
        },
      ],
      workflowStages: [
        { stage: 1, name: 'Receive Complaint', executed: true, executedAt: hoursAgo(28), outcome: 'Validated and persisted.' },
        { stage: 2, name: 'Understand & Analyse', executed: true, executedAt: hoursAgo(27.99), outcome: 'Language: English · Sentiment: Concerned' },
        { stage: 3, name: 'Classify Category & Urgency', executed: true, executedAt: hoursAgo(27.99), outcome: 'Technical Issues · Medium' },
        { stage: 4, name: 'Select Department', executed: true, executedAt: hoursAgo(27.98), outcome: 'IT Department' },
        { stage: 5, name: 'Create Assignment', executed: true, executedAt: hoursAgo(27.98), outcome: 'Assigned to IT Department queue' },
        { stage: 6, name: 'Monitor Status', executed: true, executedAt: hoursAgo(12), outcome: 'Progressed on schedule' },
        { stage: 7, name: 'Escalate Critical / Overdue', executed: false },
        { stage: 8, name: 'Generate Closure Summary', executed: true, executedAt: hoursAgo(4), outcome: 'Closure summary saved after admin confirmation' },
      ],
    },
    {
      id: 'CMP-DEMO-104',
      isDemo: true,
      trackingToken: 'demo-public-104',
      fullName: 'Ananya Deshmukh',
      email: 'ananya.d@campus.edu',
      title: '[DEMO] Electrical short circuit near Chemistry Lab switchboard',
      description:
        'Sparks and burning smell are coming from the main distribution switchboard outside Organic Chemistry Lab 102. The MCB keeps tripping and students had to evacuate the corridor.',
      location: 'Science Block, Ground Floor, Chemistry Lab 102 Corridor',
      detectedLanguage: 'English',
      englishTranslation:
        'Sparks and burning odor from the main distribution switchboard outside Chemistry Lab 102, forcing corridor evacuation.',
      category: 'Electrical Issues',
      priority: 'Critical',
      urgencyScore: 10,
      sentiment: 'Distressed',
      sentimentReason: 'Active electrical sparking and burning smell near a chemical laboratory.',
      priorityReason:
        'Immediate fire and electrocution hazard near Chemistry Lab requires emergency power isolation and human review.',
      assignedDepartment: 'Maintenance Department',
      status: 'Escalated',
      needsHumanReview: true,
      escalationReason: 'Critical fire/electrical hazard flagged immediately for human review.',
      suggestedResolution:
        'Immediately isolate the Science Block ground-floor feeder breaker, evacuate adjacent lab rooms, and inspect burnt busbar/MCB terminals with a licensed electrician.',
      possibleDuplicateOf: null,
      duplicateReason: null,
      aiAnalysisStatus: 'gemini',
      adminComments: [
        {
          id: 'cmt-demo-104-1',
          authorName: 'Dr. Kavitha Rao',
          authorRole: 'Super Administrator',
          comment:
            'Emergency electrician and campus fire safety officer alerted immediately after critical escalation flag.',
          createdAt: hoursAgo(1),
        },
      ],
      closureSummary: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: hoursAgo(1.5),
      updatedAt: hoursAgo(1),
      statusHistory: [
        {
          step: 'Complaint Submitted',
          status: 'Submitted',
          actor: 'Ananya Deshmukh',
          note: 'Complaint submitted via ResolveAI portal.',
          timestamp: hoursAgo(1.5),
        },
        {
          step: 'AI Analysed',
          status: 'AI Analysed',
          actor: 'ResolveAI Triage Agent',
          note: 'Classified as Electrical Issues with Critical priority (Sentiment: Distressed).',
          timestamp: hoursAgo(1.49),
        },
        {
          step: 'Assigned',
          status: 'Assigned',
          actor: 'ResolveAI Routing Engine',
          note: 'Automatically assigned to Maintenance Department.',
          timestamp: hoursAgo(1.48),
        },
        {
          step: 'Escalated',
          status: 'Escalated',
          actor: 'ResolveAI Escalation Guard',
          note: 'Flagged for immediate human review due to Critical electrical safety severity.',
          timestamp: hoursAgo(1.47),
        },
      ],
      workflowStages: [
        { stage: 1, name: 'Receive Complaint', executed: true, executedAt: hoursAgo(1.5), outcome: 'Validated and persisted.' },
        { stage: 2, name: 'Understand & Analyse', executed: true, executedAt: hoursAgo(1.49), outcome: 'Language: English · Sentiment: Distressed' },
        { stage: 3, name: 'Classify Category & Urgency', executed: true, executedAt: hoursAgo(1.49), outcome: 'Electrical Issues · Critical' },
        { stage: 4, name: 'Select Department', executed: true, executedAt: hoursAgo(1.48), outcome: 'Maintenance Department' },
        { stage: 5, name: 'Create Assignment', executed: true, executedAt: hoursAgo(1.48), outcome: 'Assigned to Maintenance Department' },
        { stage: 6, name: 'Monitor Status', executed: true, executedAt: hoursAgo(1.47), outcome: 'Immediate SLA check triggered' },
        { stage: 7, name: 'Escalate Critical / Overdue', executed: true, executedAt: hoursAgo(1.47), outcome: 'Escalated for immediate human review' },
        { stage: 8, name: 'Generate Closure Summary', executed: false },
      ],
    },
    {
      id: 'CMP-DEMO-105',
      isDemo: true,
      trackingToken: 'demo-public-105',
      fullName: 'Sneha Patil',
      email: 'sneha.patil@campus.edu',
      title: '[DEMO] Student safety complaint — broken streetlights on hostel pathway',
      description:
        'Four consecutive streetlights along the North Girls Hostel walkway near Gate 3 have been completely dark for three nights, leaving students walking in pitch darkness after evening library hours.',
      location: 'North Hostel Pathway near Gate 3',
      detectedLanguage: 'English',
      englishTranslation:
        'Four streetlights along North Hostel walkway near Gate 3 are out for three nights, creating unsafe dark conditions for students.',
      category: 'Security and Safety',
      priority: 'Critical',
      urgencyScore: 9,
      sentiment: 'Distressed',
      sentimentReason: 'Personal safety risk to students walking alone at night.',
      priorityReason:
        'Unlit pedestrian corridor near student hostels creates an urgent night-time personal safety hazard.',
      assignedDepartment: 'Security Department',
      status: 'Escalated',
      needsHumanReview: true,
      escalationReason: 'Critical student safety complaint escalated for immediate security patrol & lighting repair.',
      suggestedResolution:
        'Deploy temporary security patrol and portable floodlights along Gate 3 pathway tonight; coordinate with Maintenance to replace faulty LED fixtures tomorrow morning.',
      possibleDuplicateOf: null,
      duplicateReason: null,
      aiAnalysisStatus: 'gemini',
      adminComments: [],
      closureSummary: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(2.9),
      statusHistory: [
        {
          step: 'Complaint Submitted',
          status: 'Submitted',
          actor: 'Sneha Patil',
          note: 'Complaint submitted via ResolveAI portal.',
          timestamp: hoursAgo(3),
        },
        {
          step: 'AI Analysed',
          status: 'AI Analysed',
          actor: 'ResolveAI Triage Agent',
          note: 'Classified as Security and Safety with Critical priority (Sentiment: Distressed).',
          timestamp: hoursAgo(2.98),
        },
        {
          step: 'Assigned',
          status: 'Assigned',
          actor: 'ResolveAI Routing Engine',
          note: 'Automatically assigned to Security Department.',
          timestamp: hoursAgo(2.95),
        },
        {
          step: 'Escalated',
          status: 'Escalated',
          actor: 'ResolveAI Escalation Guard',
          note: 'Critical student safety concern escalated for immediate human review.',
          timestamp: hoursAgo(2.9),
        },
      ],
      workflowStages: [
        { stage: 1, name: 'Receive Complaint', executed: true, executedAt: hoursAgo(3), outcome: 'Validated and persisted.' },
        { stage: 2, name: 'Understand & Analyse', executed: true, executedAt: hoursAgo(2.98), outcome: 'Language: English · Sentiment: Distressed' },
        { stage: 3, name: 'Classify Category & Urgency', executed: true, executedAt: hoursAgo(2.98), outcome: 'Security and Safety · Critical' },
        { stage: 4, name: 'Select Department', executed: true, executedAt: hoursAgo(2.95), outcome: 'Security Department' },
        { stage: 5, name: 'Create Assignment', executed: true, executedAt: hoursAgo(2.95), outcome: 'Assigned to Security Department' },
        { stage: 6, name: 'Monitor Status', executed: true, executedAt: hoursAgo(2.9), outcome: 'Immediate SLA check triggered' },
        { stage: 7, name: 'Escalate Critical / Overdue', executed: true, executedAt: hoursAgo(2.9), outcome: 'Escalated for immediate human review' },
        { stage: 8, name: 'Generate Closure Summary', executed: false },
      ],
    },
  ];

  return {
    version: 1,
    sequence: 1005,
    complaints,
    staff,
  };
}

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDbFile(): Promise<DatabaseSchema> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (Array.isArray(parsed.complaints) && Array.isArray(parsed.staff)) {
      return parsed;
    }
  } catch {
    // Initialize fresh seeded DB if missing or corrupt
  }
  const seed = buildSeedData();
  await writeAtomic(seed);
  return seed;
}

async function writeAtomic(data: DatabaseSchema): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${DB_PATH}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, DB_PATH);
}

export async function readDb(): Promise<DatabaseSchema> {
  return ensureDbFile();
}

export async function mutateDb<T>(
  mutator: (db: DatabaseSchema) => Promise<T> | T
): Promise<T> {
  let result!: T;
  const run = writeQueue.then(async () => {
    const db = await ensureDbFile();
    result = await mutator(db);
    await writeAtomic(db);
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  await run;
  return result;
}
