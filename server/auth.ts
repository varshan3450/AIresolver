import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { AdminUserSession } from '../src/types/complaint.ts';

const COOKIE_NAME = 'resolveai_session';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + ':resolveai-hackathon-secret').digest('hex');

interface SessionPayload {
  user: AdminUserSession;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

export function createSessionToken(user: AdminUserSession): string {
  const payload: SessionPayload = {
    user,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AdminUserSession | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    if (!payload.user || payload.exp < Date.now()) {
      return null;
    }
    return payload.user;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

export function getSessionFromRequest(req: Request): AdminUserSession | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 12,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminUserSession;
}

export function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const user = getSessionFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Administrator authentication required.' });
    return;
  }
  req.adminUser = user;
  next();
}
