import type { NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { isSameOrigin, jsonError, jsonOk } from '@/lib/http';
import { sendTestMessage } from '@/lib/notify';
import { telegramCallbacksEnabled, telegramChatIds } from '@/lib/env';
import { audit } from '@/lib/settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/telegram — current delivery configuration (no secrets leak). */
export async function GET(request: NextRequest): Promise<Response> {
  if (!(await isAdminRequest())) return jsonError(401, 'Требуется вход.');
  return jsonOk({
    chatIds: telegramChatIds().length,
    tokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
    callbacksEnabled: telegramCallbacksEnabled(),
    webhookConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
  });
}

/** POST /api/admin/telegram — { action: 'test' } sends a test card (§7.7). */
export async function POST(request: NextRequest): Promise<Response> {
  if (!(await isAdminRequest())) return jsonError(401, 'Требуется вход.');
  if (!isSameOrigin(request)) return jsonError(403, 'Запрос отклонён.');

  if (telegramChatIds().length === 0) {
    return jsonError(422, 'Не задан TELEGRAM_CHAT_IDS — добавьте chat_id владельца в переменные окружения.');
  }

  const results = await sendTestMessage();
  const delivered = results.filter((r) => r.ok).length;

  audit('telegram_test', 'admin', undefined, `${delivered}/${results.length}`);

  return jsonOk({
    delivered,
    total: results.length,
    errors: results.filter((r) => !r.ok).map((r) => (r.ok ? '' : r.error)),
  });
}
