import type { NextRequest } from 'next/server';
import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/telegram-webhook';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/telegram/webhook (§7.4).
 * Authenticated by the secret token header that Telegram sends on every update.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const provided = request.headers.get('x-telegram-bot-api-secret-token');

  if (expected) {
    if (provided !== expected) return jsonError(401, 'Unauthorized');
  } else if (process.env.NODE_ENV === 'production') {
    // Never accept unauthenticated updates on a public deployment.
    return jsonError(401, 'Unauthorized');
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return jsonError(400, 'Bad request');
  }

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error('[telegram] update failed', error instanceof Error ? error.message : 'unknown');
    // Always answer 200 so Telegram does not retry a poisoned update forever.
  }

  return new Response(null, { status: 200 });
}
