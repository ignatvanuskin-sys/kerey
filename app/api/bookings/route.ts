import type { NextRequest } from 'next/server';
import { createBookingAtomic } from '@/db/bookings';
import { hitRateLimit } from '@/db/repo';
import { bookingNumber } from '@/lib/utils';
import { clientIp, isSameOrigin, jsonError, jsonOk } from '@/lib/http';
import { hashIp } from '@/lib/auth';
import { looksLikeSpam, parseBookingInput, verifyTurnstile } from '@/lib/validation';
import { normalizePhone } from '@/lib/phone';
import { tryDeliverNow } from '@/lib/notify';
import { publicSlots } from '@/lib/availability';
import { maskPhoneForLog } from '@/lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IP_LIMIT_PER_HOUR = 5;
const PHONE_LIMIT_PER_DAY = 3;

/**
 * POST /api/bookings
 * Order of operations (§2.5): validate → rate limit → store in the DB → notify.
 * The client always gets a success as soon as the row is stored, even when Telegram fails.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, 'Запрос отклонён.');

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const parsed = parseBookingInput(payload);
  if (!parsed.ok) return jsonError(422, 'Проверьте поля формы.', { fields: parsed.errors });
  const input = parsed.data;

  if (looksLikeSpam(input)) {
    return jsonError(422, 'Не удалось отправить заявку. Позвоните нам, пожалуйста.');
  }

  const ip = clientIp(request);
  const ipHash = hashIp(ip);

  const ipHits = hitRateLimit(`bookings:ip:${ipHash}`, 3600);
  if (ipHits > IP_LIMIT_PER_HOUR) {
    return jsonError(429, 'Слишком много записей с этого устройства. Попробуйте позже или позвоните нам.', {
      retryAfter: 3600,
    });
  }

  const phone = normalizePhone(input.phone);
  if (!phone) return jsonError(422, 'Проверьте поля формы.', { fields: { phone: 'Укажите телефон в формате +7 XXX XXX XX XX.' } });

  const phoneHits = hitRateLimit(`bookings:phone:${phone}`, 86_400);
  if (phoneHits > PHONE_LIMIT_PER_DAY) {
    return jsonError(429, 'По этому номеру уже оформлено несколько записей. Позвоните нам, пожалуйста.', {
      retryAfter: 86_400,
    });
  }

  const turnstileOk = await verifyTurnstile(input.turnstileToken, ip);
  if (!turnstileOk) return jsonError(422, 'Не удалось проверить, что вы не робот. Обновите страницу.');

  const idempotencyKey = request.headers.get('idempotency-key')?.trim().slice(0, 64) ?? null;

  let result;
  try {
    result = createBookingAtomic({
      serviceId: input.serviceId ?? null,
      localDate: input.date,
      time: input.time,
      carBrand: input.carBrand,
      carModel: input.carModel,
      carYear: input.carYear ?? null,
      carPlate: input.carPlate ?? null,
      clientName: input.clientName,
      clientPhone: phone,
      contactMethod: input.contactMethod,
      comment: input.comment ?? null,
      source: 'site',
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      idempotencyKey,
      ipHash,
    });
  } catch (error) {
    // A unique-constraint race (identical Idempotency-Key or an extremely tight double submit).
    console.error('[bookings] insert failed', error instanceof Error ? error.message : 'unknown');
    return jsonError(409, 'Это время только что заняли, выберите другое.', { retryable: true });
  }

  if (!result.ok) {
    const message =
      result.reason === 'slot_taken'
        ? 'Это время только что заняли, выберите другое.'
        : 'Это время недоступно, выберите другое.';
    console.info('[bookings] rejected', { phone: maskPhoneForLog(phone), reason: result.reason });
    return jsonError(409, message, { slots: publicSlots(result.slots) });
  }

  if (!result.reused) {
    await tryDeliverNow(result.notificationId);
  }

  console.info('[bookings] created', {
    number: bookingNumber(result.booking.id),
    startAt: result.booking.start_at,
    phone: maskPhoneForLog(phone),
  });

  return jsonOk({
    number: bookingNumber(result.booking.id),
    token: result.booking.token,
    startAt: result.booking.start_at,
    endAt: result.booking.end_at,
    status: result.booking.status,
    reused: result.reused,
  });
}
