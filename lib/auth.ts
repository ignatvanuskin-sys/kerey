/**
 * Доступ в панель заявок.
 *
 * Один пароль (переменная ADMIN_PASSWORD) + подписанная cookie сессии.
 * Пароль сравнивается в постоянном времени (crypto.timingSafeEqual), cookie ставится
 * httpOnly и Secure (Secure включается, когда сайт открыт по https).
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { isTemporaryStorage } from './storage';

export const ADMIN_COOKIE = 'kerey_admin';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function adminPassword(): string | undefined {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : undefined;
}

function secret(): string {
  return process.env.SESSION_SECRET?.trim() || adminPassword() || 'insecure-development-secret';
}

function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Пароль демонстрационного доступа.
 * Действует ТОЛЬКО когда постоянное хранилище не подключено, то есть настоящих данных
 * клиентов на сервере быть не может. Как только подключена база или задан ADMIN_PASSWORD,
 * демо-доступ отключается сам.
 */
export const DEMO_PASSWORD = 'demo';

export async function adminConfigured(): Promise<boolean> {
  return Boolean(adminPassword()) || (await isTemporaryStorage());
}

/** Демо-доступ активен: постоянного пароля нет и данные хранятся временно. */
export async function isDemoAccess(): Promise<boolean> {
  return !adminPassword() && (await isTemporaryStorage());
}

export async function verifyPassword(input: string): Promise<boolean> {
  const expected = adminPassword();
  if (expected) {
    const a = crypto.createHash('sha256').update(input).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
  }
  return (await isTemporaryStorage()) && input === DEMO_PASSWORD;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(now = Date.now()): string {
  const encoded = Buffer.from(JSON.stringify({ exp: now + SESSION_TTL_MS }), 'utf8').toString('base64url');
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

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: publicBaseUrl().startsWith('https://'),
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
};

/** Проверка cookie текущего запроса (страницы админки и админские API). */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/** IP для лимитов: в открытом виде не храним, только короткий хеш. */
export function ipHash(ip: string): string {
  return crypto.createHmac('sha256', secret()).update(ip).digest('hex').slice(0, 24);
}
