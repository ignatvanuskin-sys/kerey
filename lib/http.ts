/** HTTP helpers shared by route handlers. */
import { NextResponse } from 'next/server';
import { publicBaseUrl } from '@/lib/env';

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || '0.0.0.0';
}

export function jsonOk<T extends Record<string, unknown>>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status: 200, ...init });
}

export function jsonError(status: number, error: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/**
 * CSRF guard (§8): state-changing admin requests must come from our own origin.
 * Browsers do not let scripts forge the `Origin` header.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin fetches from the app may omit it
  try {
    const originHost = new URL(origin).host;
    const allowed = new Set<string>([new URL(publicBaseUrl()).host]);
    const host = request.headers.get('host');
    if (host) allowed.add(host);
    return allowed.has(originHost);
  } catch {
    return false;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return new URL(request.url).searchParams.get('secret');
}

/** true when the request carries the platform cron secret. */
export function isCronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return process.env.NODE_ENV !== 'production'; // без секрета — только локально
  return bearerToken(request) === expected;
}

export function noStore<T extends Record<string, unknown>>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status, headers: { 'Cache-Control': 'no-store' } });
}
