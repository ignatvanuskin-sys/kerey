import type { NextRequest } from 'next/server';
import { getDaysAvailability } from '@/db/bookings';
import { getService } from '@/db/repo';
import { getSettings } from '@/lib/settings-store';
import { jsonError, noStore } from '@/lib/http';
import { addLocalDays, diffLocalDays, localDate } from '@/lib/tz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/availability/days?from=…&to=…&serviceId=… — days that still have a free slot. */
export async function GET(request: NextRequest): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const settings = getSettings();

  const today = localDate();
  const from = params.get('from') ?? today;
  const to = params.get('to') ?? addLocalDays(today, settings.horizon_days);

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return jsonError(422, 'Некорректный диапазон дат.');
  if (from > to) return jsonError(422, 'Начало диапазона позже конца.');
  if (diffLocalDays(from, to) > 90) return jsonError(422, 'Диапазон слишком большой.');

  const serviceIdRaw = params.get('serviceId');
  const serviceId = serviceIdRaw ? Number(serviceIdRaw) : null;
  const service = serviceId && Number.isFinite(serviceId) ? getService(serviceId) : null;

  const days = getDaysAvailability(from, to, service?.duration_min ?? 60);

  return noStore({ from, to, days });
}
