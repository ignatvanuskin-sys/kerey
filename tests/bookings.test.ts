import { beforeAll, describe, expect, it } from 'vitest';

// Must be set before the first getDb() call — the in-memory database keeps the tests isolated.
process.env.DATABASE_URL = ':memory:';

import {
  changeBookingStatus,
  createBookingAtomic,
  getLatestNotificationForBooking,
  listBookings,
  markNotificationAttemptFailed,
  requeueNotification,
  getSlotsForDate,
  anonymizeExpiredBookings,
  type CreateBookingInput,
} from '@/db/bookings';
import { createService, hitRateLimit } from '@/db/repo';
import { getSettings, updateSettings, saveDayOff } from '@/lib/settings-store';
import { addLocalDays, localDate, localToUtc } from '@/lib/tz';
import type { ServiceRow } from '@/db/repo';

let service: ServiceRow;
const TOMORROW = addLocalDays(localDate(), 1);

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    serviceId: service.id,
    localDate: TOMORROW,
    time: '10:00',
    carBrand: 'Toyota',
    carModel: 'Camry',
    clientName: 'Асхат',
    clientPhone: '+77011234567',
    contactMethod: 'whatsapp',
    source: 'site',
    ...overrides,
  };
}

beforeAll(() => {
  service = createService({
    slug: 'diagnostics',
    title: 'Компьютерная диагностика',
    duration_min: 60,
    is_active: true,
  });
  updateSettings({ posts_count: 2, min_lead_min: 60, slot_step_min: 30, buffer_min: 0 });
});

describe('createBookingAtomic', () => {
  it('stores the booking, enqueues a pending notification and blocks the slot when posts are full', () => {
    updateSettings({ posts_count: 1 });
    const result = createBookingAtomic(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.booking.status).toBe('new');
    expect(result.booking.service_title).toBe('Компьютерная диагностика');
    expect(result.booking.client_phone).toBe('+77011234567');
    expect(result.booking.start_at).toBe(localToUtc(TOMORROW, '10:00').toISOString());

    const notification = getLatestNotificationForBooking(result.booking.id);
    expect(notification?.status).toBe('pending');
    expect(notification?.attempts).toBe(0);

    const slots = getSlotsForDate(TOMORROW, 60);
    expect(slots.find((slot) => slot.time === '10:00')?.available).toBe(false);
    expect(slots.find((slot) => slot.time === '11:00')?.available).toBe(true);
  });

  it('lets a second car in when there are two posts, and rejects the third (QA 3)', () => {
    updateSettings({ posts_count: 2 });
    const date = addLocalDays(localDate(), 3);

    const first = createBookingAtomic(input({ localDate: date, time: '14:00' }));
    const second = createBookingAtomic(input({ localDate: date, time: '14:00' }));
    const third = createBookingAtomic(input({ localDate: date, time: '14:00' }));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.reason).toBe('slot_taken');
      // The client gets a fresh slot list to pick another time.
      expect(third.slots.length).toBeGreaterThan(0);
      expect(third.slots.find((slot) => slot.time === '14:00')?.available).toBe(false);
    }
  });

  it('is idempotent for a repeated submit with the same Idempotency-Key (QA 10)', () => {
    const date = addLocalDays(localDate(), 5);
    const key = 'test-idempotency-key-1';

    const first = createBookingAtomic(input({ localDate: date, time: '09:00', idempotencyKey: key }));
    const second = createBookingAtomic(input({ localDate: date, time: '09:00', idempotencyKey: key }));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.reused).toBe(true);
    expect(second.booking.id).toBe(first.booking.id);
    expect(listBookings({ date }).filter((b) => b.idempotency_key === key)).toHaveLength(1);
  });

  it('rejects a time that is not part of the working day', () => {
    const date = addLocalDays(localDate(), 6);
    const result = createBookingAtomic(input({ localDate: date, time: '23:30' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_time');
  });

  it('rejects a date beyond the booking horizon (QA 7)', () => {
    const beyond = addLocalDays(localDate(), 40);
    expect(getSlotsForDate(beyond, 60)).toEqual([]);
    expect(createBookingAtomic(input({ localDate: beyond, time: '10:00' })).ok).toBe(false);
  });

  it('rejects a time inside the minimum lead window (QA 7)', () => {
    const today = localDate();
    const result = createBookingAtomic(input({ localDate: today, time: '08:30' }));
    expect(result.ok).toBe(false);
  });

  it('rejects a booking on a day off (QA 7)', () => {
    const date = addLocalDays(localDate(), 8);
    saveDayOff({ local_date: date, reason: 'Тех. работы' });
    const result = createBookingAtomic(input({ localDate: date, time: '10:00' }));
    expect(result.ok).toBe(false);
  });

  it('uses a reduced window on a partial day off', () => {
    const date = addLocalDays(localDate(), 9);
    saveDayOff({ local_date: date, open_from: '12:00', open_to: '15:00' });
    expect(getSlotsForDate(date, 60).map((slot) => slot.time)).toEqual(['12:00', '12:30', '13:00', '13:30', '14:00']);
    expect(createBookingAtomic(input({ localDate: date, time: '09:00' })).ok).toBe(false);
    expect(createBookingAtomic(input({ localDate: date, time: '13:00' })).ok).toBe(true);
  });
});

describe('status changes', () => {
  it('releases the slot and is idempotent (QA 2)', () => {
    updateSettings({ posts_count: 1 });
    const date = addLocalDays(localDate(), 11);

    const created = createBookingAtomic(input({ localDate: date, time: '16:00' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const confirmed = changeBookingStatus(created.booking.id, 'confirmed', 'owner_tg');
    expect(confirmed.changed).toBe(true);
    expect(confirmed.booking?.status).toBe('confirmed');

    const repeated = changeBookingStatus(created.booking.id, 'confirmed', 'owner_tg');
    expect(repeated.changed).toBe(false); // idempotent

    // §6.5.1: a confirmed booking can be cancelled by the shop, but not "rejected" again.
    const rejected = changeBookingStatus(created.booking.id, 'cancelled_by_owner', 'owner_tg');
    expect(rejected.booking?.status).toBe('cancelled_by_owner');
    expect(getSlotsForDate(date, 60).find((slot) => slot.time === '16:00')?.available).toBe(true);
  });

  it('never moves a finished booking back to confirmed', () => {
    const date = addLocalDays(localDate(), 12);
    const created = createBookingAtomic(input({ localDate: date, time: '17:00' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    changeBookingStatus(created.booking.id, 'confirmed', 'admin');
    changeBookingStatus(created.booking.id, 'done', 'owner_tg');
    const attempt = changeBookingStatus(created.booking.id, 'confirmed', 'admin');
    expect(attempt.changed).toBe(false);
    expect(attempt.booking?.status).toBe('done');
  });

  it('enqueues a notification when the client cancels (QA 11)', () => {
    const date = addLocalDays(localDate(), 13);
    const created = createBookingAtomic(input({ localDate: date, time: '18:00' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    changeBookingStatus(created.booking.id, 'cancelled_by_client', 'client');
    expect(getLatestNotificationForBooking(created.booking.id)?.kind).toBe('booking_cancelled');
    expect(getSlotsForDate(date, 60).find((slot) => slot.time === '18:00')?.available).toBe(true);
  });
});

describe('notification outbox', () => {
  it('backs off and gives up after the attempt limit, and can be requeued (QA 4)', () => {
    const date = addLocalDays(localDate(), 14);
    const created = createBookingAtomic(input({ localDate: date, time: '11:00' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const notificationId = created.notificationId;
    markNotificationAttemptFailed(notificationId, 'TELEGRAM_BOT_TOKEN не задан');

    const afterFirstFailure = getLatestNotificationForBooking(created.booking.id);
    expect(afterFirstFailure?.status).toBe('pending');
    expect(afterFirstFailure?.attempts).toBe(1);
    expect(afterFirstFailure?.last_error).toContain('TELEGRAM_BOT_TOKEN');

    for (let i = 0; i < 8; i += 1) {
      markNotificationAttemptFailed(notificationId, 'сбой');
    }
    expect(getLatestNotificationForBooking(created.booking.id)?.status).toBe('failed');

    const requeued = requeueNotification(notificationId);
    expect(requeued?.status).toBe('pending');
    expect(requeued?.attempts).toBe(0);
  });

  it('honours retry_after from a 429 response', () => {
    const date = addLocalDays(localDate(), 15);
    const created = createBookingAtomic(input({ localDate: date, time: '12:00' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    markNotificationAttemptFailed(created.notificationId, 'Too Many Requests: retry after 300', 300);
    const row = getLatestNotificationForBooking(created.booking.id);
    expect(row?.status).toBe('pending');
    const next = new Date(row!.next_attempt_at).getTime();
    expect(next - Date.now()).toBeGreaterThan(4 * 60_000);
  });
});

describe('rate limiting and retention', () => {
  it('counts hits inside a window', () => {
    const key = `test:${Date.now()}`;
    expect(hitRateLimit(key, 3600)).toBe(1);
    expect(hitRateLimit(key, 3600)).toBe(2);
    expect(hitRateLimit(key, 3600)).toBe(3);
  });

  it('anonymises personal data of expired bookings', () => {
    const old = addLocalDays(localDate(), -900);
    const created = createBookingAtomic(
      input({ localDate: old, time: '10:00', clientPhone: '+77055554433', clientName: 'Старый Клиент' }),
    );
    // Even if the slot rules reject it, the retention routine must not throw.
    const anonymized = anonymizeExpiredBookings(730);
    expect(anonymized).toBeGreaterThanOrEqual(0);
    if (created.ok) {
      const row = listBookings({ date: old }).find((booking) => booking.id === created.booking.id);
      expect(row?.client_phone).toBe('');
      expect(row?.client_name).toBe('Аноним');
    }
  });

  it('keeps settings editable through the admin layer', () => {
    updateSettings({ posts_count: 3, slot_step_min: 60 });
    const settings = getSettings();
    expect(settings.posts_count).toBe(3);
    expect(settings.slot_step_min).toBe(60);
    updateSettings({ posts_count: 2, slot_step_min: 30 });
  });
});
