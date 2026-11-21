import crypto from 'node:crypto';
import net from 'node:net';
import type { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const RUNTIME_SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export interface AdminSessionPayload {
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

export async function verifySupabaseAdminToken(token: string): Promise<AdminSessionPayload | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email) return null;

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('email, role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile) return null;
    return {
      email: profile.email,
      role: (profile.role as AdminSessionPayload['role']) || 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
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
  const localPayload = verifyAdminToken(token);
  if (localPayload) {
    req.admin = localPayload;
    next();
    return;
  }

  const supabasePayload = await verifySupabaseAdminToken(token);
  if (supabasePayload) {
    req.admin = supabasePayload;
    next();
    return;
  }

  res.status(401).json({ error: 'Invalid or expired administrator session' });
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 127) return true; // 127.0.0.0/8 loopback
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local / cloud metadata
    if (parts[0] === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe80:')) return true; // link-local
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
