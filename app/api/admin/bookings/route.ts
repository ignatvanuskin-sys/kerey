import type { NextRequest } from 'next/server';
import {
  changeBookingStatus,
  createBookingAtomic,
  deleteBooking,
  getBookingById,
  getLatestNotificationForBooking,
  listBookings,
  notificationStateForBooking,
  requeueNotification,
  updateBookingFields,
  type BookingRow,
} from '@/db/bookings';
import { getService } from '@/db/repo';
import { isAdminRequest } from '@/lib/auth';
import { isSameOrigin, jsonError, jsonOk, noStore } from '@/lib/http';
import { normalizePhone } from '@/lib/phone';
import { tryDeliverNow } from '@/lib/notify';
import { audit } from '@/lib/settings-store';
import { manualBookingSchema } from '@/lib/validation';
import { statusLabelRu } from '@/lib/availability';
import { addLocalDays, localDate } from '@/lib/tz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard(request: NextRequest): Promise<Response | null> {
  if (!(await isAdminRequest())) return jsonError(401, 'Требуется вход.');
  if (!isSameOrigin(request)) return jsonError(403, 'Запрос отклонён.');
  return null;
}

function serialize(booking: BookingRow) {
  return {
    id: booking.id,
    number: String(booking.id).padStart(4, '0'),
    status: booking.status,
    statusLabel: statusLabelRu(booking.status),
    serviceTitle: booking.service_title,
    car: `${booking.car_brand} ${booking.car_model}`,
    carYear: booking.car_year,
    carPlate: booking.car_plate,
    clientName: booking.client_name,
    clientPhone: booking.client_phone,
    contactMethod: booking.contact_method,
    comment: booking.comment,
    startAt: booking.start_at,
    endAt: booking.end_at,
    durationMin: booking.duration_min,
    source: booking.source,
    utmSource: booking.utm_source,
    createdAt: booking.created_at,
    tgState: notificationStateForBooking(booking.id),
  };
}

/** GET /api/admin/bookings?tab=today|tomorrow|new|all&status=…&search=…&date=… */
export async function GET(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  const tab = params.get('tab') ?? 'today';
  const status = (params.get('status') as BookingRow['status'] | 'all' | null) ?? undefined;
  const search = params.get('search')?.trim() || undefined;
  const date = params.get('date') || undefined;

  const today = localDate();
  const filters =
    tab === 'today'
      ? { date: today }
      : tab === 'tomorrow'
        ? { date: addLocalDays(today, 1) }
        : tab === 'new'
          ? { status: 'new' as const }
          : { date, status: status ?? 'all' };

  const rows = listBookings({ ...filters, status: status ?? ('all' as const), search, limit: 300 });
  const sorted = [...rows].sort((a, b) => b.start_at.localeCompare(a.start_at));

  return noStore({ tab, bookings: sorted.map(serialize) });
}

/** POST /api/admin/bookings — manual booking from a call or a visit (§8.1). */
export async function POST(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const parsed = manualBookingSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, 'Проверьте поля записи.', { fields: parsed.error.issues });

  const input = parsed.data;
  const phone = normalizePhone(input.phone);
  if (!phone) return jsonError(422, 'Проверьте телефон.', { fields: { phone: 'Неверный номер' } });

  const service = input.serviceId ? getService(input.serviceId) : null;

  let result;
  try {
    result = createBookingAtomic({
      serviceId: service?.id ?? null,
      localDate: input.date,
      time: input.time,
      carBrand: input.carBrand,
      carModel: input.carModel,
      carYear: input.carYear ?? null,
      carPlate: input.carPlate ?? null,
      clientName: input.clientName,
      clientPhone: phone,
      contactMethod: input.contactMethod ?? 'call',
      comment: input.comment ?? null,
      source: 'admin',
      idempotencyKey: null,
      ipHash: null,
    });
  } catch (error) {
    console.error('[admin] manual booking failed', error instanceof Error ? error.message : 'unknown');
    return jsonError(409, 'Не удалось создать запись на это время.');
  }

  if (!result.ok) {
    return jsonError(409, 'Это время недоступно — выберите другое.', { slots: result.slots });
  }

  audit('booking_created_admin', 'admin', result.booking.id);
  return jsonOk({ booking: serialize(result.booking) });
}

/** PATCH /api/admin/bookings — { action: 'status' | 'resend' | 'edit', id, … } */
export async function PATCH(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(422, 'Не найден идентификатор записи.');
  const booking = getBookingById(id);
  if (!booking) return jsonError(404, 'Запись не найдена.');

  const action = String(body.action ?? '');

  if (action === 'status') {
    const next = String(body.status ?? '') as BookingRow['status'];
    const result = changeBookingStatus(id, next, 'admin');
    if (!result.ok || !result.booking) return jsonError(409, 'Не удалось изменить статус.');
    audit(`status:${next}`, 'admin', id);
    return jsonOk({ booking: serialize(result.booking), changed: result.changed });
  }

  if (action === 'resend') {
    const notification = getLatestNotificationForBooking(id);
    if (!notification) return jsonError(404, 'Уведомление не найдено.');
    requeueNotification(notification.id);
    const outcome = await tryDeliverNow(notification.id);
    return jsonOk({ tgState: notificationStateForBooking(id), outcome });
  }

  if (action === 'edit') {
    const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : null;
    if (body.phone && !phone) return jsonError(422, 'Неверный телефон.');
    const updated = updateBookingFields(id, {
      car_brand: typeof body.carBrand === 'string' ? body.carBrand : undefined,
      car_model: typeof body.carModel === 'string' ? body.carModel : undefined,
      car_year: typeof body.carYear === 'string' ? body.carYear : undefined,
      car_plate: typeof body.carPlate === 'string' ? body.carPlate : undefined,
      client_name: typeof body.clientName === 'string' ? body.clientName : undefined,
      client_phone: phone ?? undefined,
      comment: typeof body.comment === 'string' ? body.comment : undefined,
    });
    if (!updated) return jsonError(404, 'Запись не найдена.');
    audit('booking_edited', 'admin', id);
    return jsonOk({ booking: serialize(updated) });
  }

  if (action === 'delete') {
    deleteBooking(id);
    audit('booking_deleted', 'admin', id);
    return jsonOk({ deleted: true });
  }

  return jsonError(422, 'Неизвестное действие.');
}
