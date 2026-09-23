import type { NextRequest } from 'next/server';
import { processDueNotifications } from '@/lib/notify';
import { anonymizeExpiredBookings } from '@/db/bookings';
import { getSettings } from '@/lib/settings-store';
import { isCronAuthorized, jsonError, noStore } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/notify (§7.2, §9.2).
 * Retries pending Telegram cards and applies the personal-data retention policy.
 * Call it from the platform scheduler every 1–5 minutes with `CRON_SECRET`.
 */
export async function GET(request: NextRequest): Promise<Response> {
  if (!isCronAuthorized(request)) return jsonError(401, 'Unauthorized');

  const delivery = await processDueNotifications(20);
  const retention = anonymizeExpiredBookings(getSettings().retention_days);

  return noStore({
    processed: delivery.processed,
    sent: delivery.sent,
    anonymized: retention,
    at: new Date().toISOString(),
  });
}
