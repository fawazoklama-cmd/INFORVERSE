import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const RUNTIME_SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const BOOTSTRAPPED_ADMIN_EMAIL = 'fawazoklama@gmail.com';

function loadFirebaseProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { projectId?: string };
      if (parsed.projectId && !parsed.projectId.includes('remixed')) {
        return parsed.projectId;
      }
    }
  } catch {
    // Ignore config read failure
  }
  return null;
}

function getFirebaseAdminAuth() {
  const projectId = loadFirebaseProjectId();
  if (!projectId) return null;
  const adminApp = getApps().length ? getApp() : initializeApp({ projectId });
  return getAuth(adminApp);
}

export interface AdminSessionPayload {
  uid?: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
  exp: number;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signAdminToken(payload: Omit<AdminSessionPayload, 'exp'>, ttlSeconds = 60 * 60 * 12): string {
  const fullPayload: AdminSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', RUNTIME_SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminToken(token: string): AdminSessionPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', RUNTIME_SESSION_SECRET).update(encoded).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyFirebaseAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const adminAuth = getFirebaseAdminAuth();
    if (!adminAuth) return null;
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email || decoded.email_verified !== true) {
      return null;
    }

    const normalizedEmail = decoded.email.toLowerCase();
    const roleClaim = typeof decoded.role === 'string' ? decoded.role : undefined;
    const isAdminClaim = decoded.admin === true || roleClaim === 'super_admin' || roleClaim === 'admin';
    const isBootstrapped = normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL;

    // Allow verified custom-claim admin OR verified bootstrapped admin email OR verified admin email in ADMIN_EMAILS env
    const extraEmails = (process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!isAdminClaim && !isBootstrapped && !extraEmails.includes(normalizedEmail)) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: normalizedEmail,
      role: (roleClaim as AdminSessionPayload['role']) || (isBootstrapped ? 'super_admin' : 'admin'),
      exp: decoded.exp || Math.floor(Date.now() / 1000) + 3600,
    };
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminSessionPayload;
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7).trim();

  const firebasePayload = await verifyFirebaseAdminToken(token);
  if (firebasePayload) {
    req.admin = firebasePayload;
    next();
    return;
  }

  const localPayload = verifyAdminToken(token);
  if (localPayload) {
    req.admin = localPayload;
    next();
    return;
  }

  res.status(401).json({ error: 'Invalid or expired administrator session' });
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80:')) return true;
    if (lower.startsWith('::ffff:')) {
      return isPrivateOrLoopbackIp(lower.replace('::ffff:', ''));
    }
    return false;
  }
  return false;
}

export function assertSafeExternalUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl.trim());
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are permitted.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    isPrivateOrLoopbackIp(hostname)
  ) {
    throw new Error('Access to internal, loopback, or private network hosts is blocked.');
  }
  return parsed;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
      return;
    }
    bucket.count += 1;
    next();
  };
}
