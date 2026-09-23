import { NextResponse, type NextRequest } from 'next/server';
import {
  ADMIN_COOKIE,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  adminConfigured,
  createSessionToken,
  ipHash,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth';
import { hitLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || '0.0.0.0';
}

/** POST /api/admin/login — вход в панель. 5 неудачных попыток за 15 минут на адрес. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await adminConfigured())) {
    return NextResponse.json(
      { ok: false, message: 'Пароль не задан на сервере: добавьте ADMIN_PASSWORD в переменные окружения' },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const limit = hitLimit(`login:${ipHash(ip)}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, message: 'Некорректный запрос' }, { status: 400 });
  }

  if (!(await verifyPassword(password))) {
    return NextResponse.json({ ok: false, message: 'Неверный пароль' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions);
  return response;
}
