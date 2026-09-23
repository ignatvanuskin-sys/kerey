import { changeBookingStatus, getBookingByToken } from '@/db/bookings';
import { jsonError, jsonOk } from '@/lib/http';
import { tryDeliverNow } from '@/lib/notify';
import { getLatestNotificationForBooking } from '@/db/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/bookings/[token]/cancel — the client cancels; the slot is released and the owner notified (§6.4). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const booking = getBookingByToken(token);
  if (!booking) return jsonError(404, 'Запись не найдена.');

  const result = changeBookingStatus(booking.id, 'cancelled_by_client', 'client');
  if (!result.ok || !result.booking) return jsonError(409, 'Не удалось отменить запись.');

  if (result.changed) {
    const notification = getLatestNotificationForBooking(booking.id);
    if (notification) await tryDeliverNow(notification.id);
  }

  return jsonOk({ status: result.booking.status, changed: result.changed });
}
