import { NextResponse, type NextRequest } from 'next/server';
import { getBooking, updateBooking } from '@/lib/booking';
import { BOOKING_STATUSES, type BookingStatus } from '@/lib/booking-types';
import { isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PATCH /api/bookings/[id] — смена статуса или правка данных (только для владельца). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, message: 'Требуется вход' }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: 'Некорректный запрос' }, { status: 400 });
  }

  const status = typeof body.status === 'string' ? (body.status as BookingStatus) : undefined;
  if (status && !BOOKING_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, message: 'Неизвестный статус' }, { status: 422 });
  }

  const existing = await getBooking(id);
  if (!existing) return NextResponse.json({ ok: false, message: 'Заявка не найдена' }, { status: 404 });

  const updated = await updateBooking(id, {
    status,
    comment: typeof body.comment === 'string' ? body.comment : undefined,
  });

  return NextResponse.json({ ok: true, booking: updated });
}
