/**
 * Admin session (§8): one password, timing-safe comparison, HMAC-signed httpOnly cookie,
 * 7-day lifetime and a 5-attempts / 15-minutes / IP login rate limit.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { adminPassword, publicBaseUrl, sessionSecret } from '@/lib/env';

export const ADMIN_COOKIE = 'kerey_admin';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_SECONDS = 15 * 60;

function secret(): string {
  return sessionSecret() ?? adminPassword() ?? 'insecure-development-secret';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function isAdminConfigured(): boolean {
  return Boolean(adminPassword());
}

/** Constant-time password check — never `===` on secrets. */
export function verifyPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(now = Date.now()): string {
  const payload = JSON.stringify({ exp: now + SESSION_TTL_MS });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > now;
  } catch {
    return false;
  }
}

/**
 * `secure` is enabled as soon as the site is served over HTTPS (§8). On a local
 * http://localhost build the flag stays off, otherwise the browser would silently drop the cookie.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: publicBaseUrl().startsWith('https://'),
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
};

/** Reads and verifies the admin cookie of the current request. */
export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function hashIp(ip: string): string {
  return crypto.createHmac('sha256', secret()).update(ip).digest('hex').slice(0, 32);
}
