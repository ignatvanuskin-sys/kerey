import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/logout — выход из панели. */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
  return response;
}
