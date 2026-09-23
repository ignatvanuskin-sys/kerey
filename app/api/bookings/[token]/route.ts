import { getBookingByToken } from '@/db/bookings';
import { BUSINESS } from '@/content/business';
import { statusLabelRu, TERMINAL_STATUSES } from '@/lib/availability';
import { jsonError, noStore } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/[token] — public status of one booking (§6.4).
 * Deliberately minimal: no phone, no comment, no other people's bookings.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return jsonError(404, 'Запись не найдена.');

  const booking = getBookingByToken(token);
  if (!booking) return jsonError(404, 'Запись не найдена.');

  const firstName = booking.client_name.split(' ')[0] || booking.client_name;

  return noStore({
    number: String(booking.id).padStart(4, '0'),
    status: booking.status,
    statusLabel: statusLabelRu(booking.status),
    serviceTitle: booking.service_title,
    car: `${booking.car_brand} ${booking.car_model}`,
    clientFirstName: firstName,
    startAt: booking.start_at,
    endAt: booking.end_at,
    durationMin: booking.duration_min,
    address: `${BUSINESS.address}, ${BUSINESS.city}`,
    canCancel: !TERMINAL_STATUSES.includes(booking.status),
  });
}
