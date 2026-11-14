import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  ComplaintStatus,
  DashboardStats,
  DepartmentName,
  PriorityLevel,
} from './src/types/complaint.ts';
import {
  clearSessionCookie,
  createSessionToken,
  getSessionFromRequest,
  requireAdminAuth,
  setSessionCookie,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { readDb, verifyPassword } from './server/db.ts';
import {
  resolveComplaintWithSummary,
  runOverdueAndCriticalMonitor,
  submitAndAnalyzeComplaint,
  toPublicComplaintView,
  updateComplaintByAdmin,
} from './server/workflow.ts';

const PORT = Number(process.env.PORT || 3000);
const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Ensure seeded DB exists on startup
  await readDb();

  app.get('/api/health', (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      ok: true,
      aiConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
    });
  });

  app.get('/api/stats', async (_req, res) => {
    try {
      const db = await readDb();
      const stats: DashboardStats = {
        total: db.complaints.length,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        resolved: 0,
        escalated: 0,
        critical: 0,
        demoCount: 0,
        byCategory: {},
        byDepartment: {},
      };

      for (const c of db.complaints) {
        if (c.isDemo) stats.demoCount++;
        if (c.status === 'Pending') stats.pending++;
        if (c.status === 'Assigned') stats.assigned++;
        if (c.status === 'In Progress') stats.inProgress++;
        if (c.status === 'Resolved') stats.resolved++;
        if (c.status === 'Escalated') stats.escalated++;
        if (c.priority === 'Critical') stats.critical++;

        stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1;
        stats.byDepartment[c.assignedDepartment] =
          (stats.byDepartment[c.assignedDepartment] || 0) + 1;
      }

      res.json(stats);
    } catch (err) {
      console.error('Stats error:', err);
      res.status(500).json({ error: 'Failed to load dashboard statistics.' });
    }
  });

  app.get('/api/demo-complaints', async (_req, res) => {
    try {
      const db = await readDb();
      const demos = db.complaints.filter((c) => c.isDemo).map(toPublicComplaintView);
      res.json({ complaints: demos });
    } catch (err) {
      console.error('Demo fetch error:', err);
      res.status(500).json({ error: 'Failed to load demo complaints.' });
    }
  });

  app.post('/api/complaints', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const location = typeof body.location === 'string' ? body.location.trim() : '';

      if (fullName.length < 2 || fullName.length > 100) {
        res.status(400).json({ error: 'Please enter a valid full name (2–100 characters).' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (title.length < 5 || title.length > 160) {
        res.status(400).json({ error: 'Complaint title must be between 5 and 160 characters.' });
        return;
      }
      if (description.length < 15 || description.length > 3000) {
        res.status(400).json({
          error: 'Detailed description must be between 15 and 3000 characters.',
        });
        return;
      }
      if (location.length < 2 || location.length > 160) {
        res.status(400).json({ error: 'Please specify a valid location (2–160 characters).' });
        return;
      }

      const { complaint, trackingToken } = await submitAndAnalyzeComplaint({
        fullName,
        email,
        title,
        description,
        location,
      });

      res.status(201).json({
        complaint: toPublicComplaintView(complaint),
        trackingToken,
      });
    } catch (err) {
      console.error('Submit complaint error:', err);
      res.status(500).json({ error: 'Failed to process complaint submission.' });
    }
  });

  app.post('/api/complaints/track', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const rawId = typeof body.complaintId === 'string' ? body.complaintId.trim().toUpperCase() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const trackingToken =
        typeof body.trackingToken === 'string' ? body.trackingToken.trim() : '';

      if (!rawId) {
        res.status(400).json({ error: 'Please enter a valid Complaint ID.' });
        return;
      }

      const db = await readDb();
      const found = db.complaints.find((c) => c.id.toUpperCase() === rawId);
      if (!found) {
        res.status(404).json({ error: `No complaint found with ID "${rawId}".` });
        return;
      }

      const adminUser = getSessionFromRequest(req);
      const isAuthorized =
        found.isDemo ||
        Boolean(adminUser) ||
        (trackingToken && trackingToken === found.trackingToken) ||
        (email && email === found.email.toLowerCase());

      if (!isAuthorized) {
        res.status(403).json({
          error:
            'To protect reporter privacy, please enter the email address used when submitting this complaint.',
          requiresVerification: true,
        });
        return;
      }

      res.json({ complaint: toPublicComplaintView(found) });
    } catch (err) {
      console.error('Track complaint error:', err);
      res.status(500).json({ error: 'Failed to look up complaint.' });
    }
  });

  // Authentication & RBAC
  app.post('/api/auth/login', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const db = await readDb();
      const account = db.staff.find((s) => s.email.toLowerCase() === email);
      if (!account || !verifyPassword(password, account.passwordHash)) {
        res.status(401).json({ error: 'Invalid administrator credentials.' });
        return;
      }

      const sessionUser = {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        department: account.department,
      };

      const token = createSessionToken(sessionUser);
      setSessionCookie(res, token);
      res.json({ user: sessionUser });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Authentication failed.' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getSessionFromRequest(req);
    res.json({ user });
  });

  // Protected Admin Routes
  app.get('/api/admin/complaints', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const admin = req.adminUser!;
      await runOverdueAndCriticalMonitor('ResolveAI Auto-Monitor');
      const db = await readDb();

      let list = db.complaints;
      if (admin.role === 'dept_lead') {
        list = list.filter((c) => c.assignedDepartment === admin.department);
      }

      const category = typeof req.query.category === 'string' ? req.query.category : '';
      const department = typeof req.query.department === 'string' ? req.query.department : '';
      const priority = typeof req.query.priority === 'string' ? req.query.priority : '';
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
      const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'priority';

      const filtered = list.filter((c) => {
        if (category && category !== 'All' && c.category !== category) return false;
        if (department && department !== 'All' && c.assignedDepartment !== department) return false;
        if (priority && priority !== 'All' && c.priority !== priority) return false;
        if (status && status !== 'All' && c.status !== status) return false;
        if (search) {
          const hay = `${c.id} ${c.title} ${c.fullName} ${c.location} ${c.category} ${c.assignedDepartment}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

      const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // Default: priority-based sorting (Resolved pushed below active tickets)
        const aResolved = a.status === 'Resolved' ? 0 : 1;
        const bResolved = b.status === 'Resolved' ? 0 : 1;
        if (aResolved !== bResolved) return bResolved - aResolved;

        const pDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (pDiff !== 0) return pDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      res.json({ complaints: sorted });
    } catch (err) {
      console.error('Admin list error:', err);
      res.status(500).json({ error: 'Failed to load complaints.' });
    }
  });

  app.patch('/api/admin/complaints/:id', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const admin = req.adminUser!;
      const body = req.body as Record<string, unknown>;

      const status =
        typeof body.status === 'string' ? (body.status as ComplaintStatus) : undefined;
      const assignedDepartment =
        typeof body.assignedDepartment === 'string'
          ? (body.assignedDepartment as DepartmentName)
          : undefined;
      const comment = typeof body.comment === 'string' ? body.comment : undefined;

      const updated = await updateComplaintByAdmin({
        id,
        admin,
        status,
        assignedDepartment,
        comment,
      });

      res.json({ complaint: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'NOT_FOUND') {
        res.status(404).json({ error: 'Complaint not found.' });
        return;
      }
      if (msg === 'FORBIDDEN') {
        res.status(403).json({ error: 'You do not have permission to modify another department’s ticket.' });
        return;
      }
      if (msg === 'USE_RESOLVE_ENDPOINT') {
        res.status(400).json({
          error: 'Resolving a complaint requires explicit confirmation and resolution notes.',
        });
        return;
      }
      if (msg === 'INVALID_DEPARTMENT' || msg === 'INVALID_STATUS') {
        res.status(400).json({ error: 'Invalid status or department value.' });
        return;
      }
      console.error('Admin update error:', err);
      res.status(500).json({ error: 'Failed to update complaint.' });
    }
  });

  app.post(
    '/api/admin/complaints/:id/resolve',
    requireAdminAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id);
        const admin = req.adminUser!;
        const body = req.body as Record<string, unknown>;
        const resolutionComments =
          typeof body.resolutionComments === 'string' ? body.resolutionComments.trim() : '';

        if (resolutionComments.length < 8 || resolutionComments.length > 2000) {
          res.status(400).json({
            error:
              'Please enter clear resolution comments (at least 8 characters) before confirming resolution.',
          });
          return;
        }

        const resolved = await resolveComplaintWithSummary({
          id,
          admin,
          resolutionComments,
        });

        res.json({ complaint: resolved });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'NOT_FOUND') {
          res.status(404).json({ error: 'Complaint not found.' });
          return;
        }
        if (msg === 'FORBIDDEN') {
          res.status(403).json({ error: 'You do not have permission to resolve another department’s ticket.' });
          return;
        }
        console.error('Resolve error:', err);
        res.status(500).json({ error: 'Failed to resolve complaint.' });
      }
    }
  );

  app.post('/api/admin/monitor', requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await runOverdueAndCriticalMonitor(req.adminUser!.name);
      res.json(result);
    } catch (err) {
      console.error('Monitor error:', err);
      res.status(500).json({ error: 'Failed to run SLA escalation monitor.' });
    }
  });

  // Frontend serving (Vite dev middleware in dev, static dist in production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ResolveAI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
