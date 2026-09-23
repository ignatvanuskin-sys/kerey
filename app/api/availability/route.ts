import type { NextRequest } from 'next/server';
import { getSlotsForDate, slotsContext } from '@/db/bookings';
import { getService } from '@/db/repo';
import { publicSlots } from '@/lib/availability';
import { jsonError, noStore } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/availability?date=YYYY-MM-DD&serviceId=3 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const date = params.get('date') ?? '';
  const serviceIdRaw = params.get('serviceId');

  if (!DATE_RE.test(date)) return jsonError(422, 'Некорректная дата.');

  const serviceId = serviceIdRaw ? Number(serviceIdRaw) : null;
  const service = serviceId && Number.isFinite(serviceId) ? getService(serviceId) : null;
  const durationMin = service?.duration_min ?? 60;

  const ctx = slotsContext(date);
  const slots = getSlotsForDate(date, durationMin);

  return noStore({
    date,
    durationMin,
    hours: ctx.hours,
    dayOff: ctx.dayOff
      ? { openFrom: ctx.dayOff.open_from, openTo: ctx.dayOff.open_to, reason: ctx.dayOff.reason }
      : null,
    slots: publicSlots(slots),
  });
}
