import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  createSessionToken,
  hashIp,
  isAdminConfigured,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_SECONDS,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth';
import { clientIp, isSameOrigin, jsonError, jsonOk } from '@/lib/http';
import { hitRateLimit, rateLimitCount } from '@/db/repo';
import { audit } from '@/lib/settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/login — single owner password, 5 failed attempts / 15 min / IP (§8). */
export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  if (!isSameOrigin(request)) return jsonError(403, 'Запрос отклонён.');
  if (!isAdminConfigured()) {
    return jsonError(503, 'ADMIN_PASSWORD не задан на сервере. Задайте переменную окружения.');
  }

  const ip = clientIp(request);
  const key = `admin_login:${hashIp(ip)}`;

  if (rateLimitCount(key, LOGIN_WINDOW_SECONDS) >= LOGIN_MAX_ATTEMPTS) {
    return jsonError(429, 'Слишком много попыток входа. Попробуйте через 15 минут.');
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: string };
    password = String(body.password ?? '');
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  if (!verifyPassword(password)) {
    hitRateLimit(key, LOGIN_WINDOW_SECONDS);
    audit('admin_login_failed', 'admin');
    return jsonError(401, 'Неверный пароль.');
  }

  audit('admin_login_ok', 'admin');
  const response = jsonOk({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions);
  return response;
}
