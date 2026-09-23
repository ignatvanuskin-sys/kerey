/**
 * Booking + notification data access. Booking creation is atomic: the availability
 * is recomputed inside a single IMMEDIATE transaction, so two simultaneous requests
 * for the last slot can never both succeed (§6.5).
 */
import { randomUUID } from 'node:crypto';
import { getDb, nowIso } from './client';
import {
  ACTIVE_STATUSES,
  canTransition,
  computeSlots,
  type BookingStatus,
  type BusyInterval,
  type Slot,
} from '@/lib/availability';
import { getDayOff, getSettings, hoursForDate, type DayOffRow } from '@/lib/settings-store';
import type { Settings } from '@/lib/settings';
import { addLocalDays, diffLocalDays, localDate as localDateOf, localToUtc } from '@/lib/tz';

export type BookingRow = {
  id: number;
  token: string;
  status: BookingStatus;
  service_id: number | null;
  service_title: string;
  duration_min: number;
  car_brand: string;
  car_model: string;
  car_year: string | null;
  car_plate: string | null;
  client_name: string;
  client_phone: string;
  contact_method: 'call' | 'whatsapp' | 'telegram';
  comment: string | null;
  start_at: string;
  end_at: string;
  source: 'site' | 'admin';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  idempotency_key: string | null;
  ip_hash: string | null;
  status_changed_by: string | null;
  status_changed_at: string | null;
  tg_chat_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

/* ------------------------------ availability ----------------------------- */

/** Bookings that may occupy slots in the [fromIso, toIso) window. */
export function getBusyIntervals(fromIso: string, toIso: string): BusyInterval[] {
  const rows = getDb()
    .prepare(
      `SELECT start_at AS startAt, end_at AS endAt, status FROM bookings
       WHERE status IN ('new','confirmed') AND start_at < ? AND end_at > ?`,
    )
    .all(toIso, fromIso) as BusyInterval[];
  return rows;
}

function dayBounds(localDateStr: string): { fromIso: string; toIso: string } {
  return {
    fromIso: localToUtc(localDateStr, '00:00').toISOString(),
    // a full extra day of margin: a booking made late in the evening can still overlap the morning
    toIso: localToUtc(addLocalDays(localDateStr, 2), '00:00').toISOString(),
  };
}

export type SlotsContext = {
  settings: Settings;
  hours: { open: string; close: string } | null;
  dayOff: DayOffRow | null;
  busy: BusyInterval[];
};

export function slotsContext(localDateStr: string): SlotsContext {
  const settings = getSettings();
  const bounds = dayBounds(localDateStr);
  return {
    settings,
    hours: hoursForDate(settings, localDateStr),
    dayOff: getDayOff(localDateStr),
    busy: getBusyIntervals(bounds.fromIso, bounds.toIso),
  };
}

/**
 * A date is bookable only inside the configured horizon (`settings.horizon_days`, §6.2).
 * Enforced on the server so a hand-crafted request cannot book a slot a year ahead.
 */
export function withinBookingWindow(settings: Settings, localDateStr: string, now: Date = new Date()): boolean {
  const offset = diffLocalDays(localDateOf(now), localDateStr);
  return offset >= 0 && offset <= settings.horizon_days;
}

function slotsFromContext(ctx: SlotsContext, localDateStr: string, durationMin: number, now = new Date()): Slot[] {
  if (!withinBookingWindow(ctx.settings, localDateStr, now)) return [];

  return computeSlots({
    localDate: localDateStr,
    durationMin,
    hours: ctx.hours,
    dayOff: ctx.dayOff ?? undefined,
    now,
    slotStepMin: ctx.settings.slot_step_min,
    bufferMin: ctx.settings.buffer_min,
    minLeadMin: ctx.settings.min_lead_min,
    postsCount: ctx.settings.posts_count,
    busy: ctx.busy,
  });
}

export function getSlotsForDate(localDateStr: string, durationMin: number, now = new Date()): Slot[] {
  return slotsFromContext(slotsContext(localDateStr), localDateStr, durationMin, now);
}

/** Used by the date scroller: which days in the horizon have at least one free slot. */
export function getDaysAvailability(
  from: string,
  to: string,
  durationMin: number,
  now = new Date(),
): Array<{ date: string; hasFreeSlots: boolean }> {
  const settings = getSettings();
  const out: Array<{ date: string; hasFreeSlots: boolean }> = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    const ctx: SlotsContext = {
      settings,
      hours: hoursForDate(settings, cursor),
      dayOff: getDayOff(cursor),
      busy: getBusyIntervals(...(Object.values(dayBounds(cursor)) as [string, string])),
    };
    out.push({ date: cursor, hasFreeSlots: slotsFromContext(ctx, cursor, durationMin, now).some((s) => s.available) });
    cursor = addLocalDays(cursor, 1);
    guard += 1;
  }
  return out;
}

/* ---------------------------- booking creation --------------------------- */

export type CreateBookingInput = {
  serviceId: number | null;
  localDate: string;
  time: string; // "14:30" Kokshetau wall clock
  carBrand: string;
  carModel: string;
  carYear?: string | null;
  carPlate?: string | null;
  clientName: string;
  clientPhone: string;
  contactMethod: 'call' | 'whatsapp' | 'telegram';
  comment?: string | null;
  source?: 'site' | 'admin';
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  idempotencyKey?: string | null;
  ipHash?: string | null;
};

export type CreateBookingResult =
  | { ok: true; booking: BookingRow; notificationId: number; reused: boolean }
  | { ok: false; reason: 'slot_taken' | 'invalid_time' | 'service_missing'; slots: Slot[] };

export function createBookingAtomic(input: CreateBookingInput): CreateBookingResult {
  const db = getDb();

  const tx = db.transaction((): CreateBookingResult => {
    // 1. Serialise all writers for this day (belt-and-braces on top of BEGIN IMMEDIATE).
    db.prepare('INSERT OR IGNORE INTO day_locks (local_date) VALUES (?)').run(input.localDate);

    // 2. Idempotency: a repeated submit returns the original booking instead of a duplicate.
    if (input.idempotencyKey) {
      const existing = db
        .prepare('SELECT * FROM bookings WHERE idempotency_key = ?')
        .get(input.idempotencyKey) as BookingRow | undefined;
      if (existing) {
        return { ok: true, booking: existing, notificationId: 0, reused: true };
      }
    }

    const service = input.serviceId
      ? ((db.prepare('SELECT * FROM services WHERE id = ?').get(input.serviceId) as
          | { id: number; title: string; duration_min: number; is_active: number }
          | undefined) ?? null)
      : null;

    const durationMin = service?.duration_min ?? 60;
    const serviceTitle = service?.title ?? 'Диагностика';

    // 3. Recompute availability from the current database state.
    const ctx = slotsContext(input.localDate);
    const slots = slotsFromContext(ctx, input.localDate, durationMin);
    const slot = slots.find((s) => s.time === input.time);

    if (!slot) {
      return { ok: false, reason: slots.length === 0 ? 'invalid_time' : 'invalid_time', slots };
    }
    if (!slot.available) {
      return { ok: false, reason: 'slot_taken', slots };
    }

    // 4. Insert (idempotency_key / slot conflicts surface as SQLite errors → mapped by the caller).
    const ts = nowIso();
    const token = randomUUID();
    const info = db
      .prepare(
        `INSERT INTO bookings
          (token, status, service_id, service_title, duration_min, car_brand, car_model, car_year, car_plate,
           client_name, client_phone, contact_method, comment, start_at, end_at, source,
           utm_source, utm_medium, utm_campaign, idempotency_key, ip_hash, created_at, updated_at)
         VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        token,
        service?.id ?? null,
        serviceTitle,
        durationMin,
        input.carBrand,
        input.carModel,
        input.carYear ?? null,
        input.carPlate ?? null,
        input.clientName,
        input.clientPhone,
        input.contactMethod,
        input.comment ?? null,
        slot.startAt,
        slot.endAt,
        input.source ?? 'site',
        input.utmSource ?? null,
        input.utmMedium ?? null,
        input.utmCampaign ?? null,
        input.idempotencyKey ?? null,
        input.ipHash ?? null,
        ts,
        ts,
      );

    const bookingId = Number(info.lastInsertRowid);
    const notificationId = enqueueNotification(bookingId, 'booking_created');
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as BookingRow;

    return { ok: true, booking, notificationId, reused: false };
  });

  return tx.immediate();
}

/* ------------------------------ reading rows ----------------------------- */

export function getBookingById(id: number): BookingRow | null {
  return (getDb().prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow | undefined) ?? null;
}

export function getBookingByToken(token: string): BookingRow | null {
  return (getDb().prepare('SELECT * FROM bookings WHERE token = ?').get(token) as BookingRow | undefined) ?? null;
}

export type BookingFilters = {
  status?: BookingStatus | 'all';
  date?: string; // local date
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export function listBookings(filters: BookingFilters = {}): BookingRow[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.status && filters.status !== 'all') {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.date) {
    const { fromIso, toIso } = dayBounds(filters.date);
    where.push('start_at >= ? AND start_at < ?');
    params.push(fromIso, localToUtc(addLocalDays(filters.date, 1), '00:00').toISOString());
    void toIso;
  } else if (filters.dateFrom && filters.dateTo) {
    where.push('start_at >= ? AND start_at < ?');
    params.push(
      localToUtc(filters.dateFrom, '00:00').toISOString(),
      localToUtc(addLocalDays(filters.dateTo, 1), '00:00').toISOString(),
    );
  }
  if (filters.search) {
    where.push('(client_name LIKE ? OR client_phone LIKE ? OR car_model LIKE ? OR car_brand LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }

  const sql = `SELECT * FROM bookings ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY start_at DESC LIMIT ? OFFSET ?`;
  params.push(filters.limit ?? 200, filters.offset ?? 0);
  return getDb().prepare(sql).all(...(params as never[])) as BookingRow[];
}

export function bookingsToday(localDateStr: string): BookingRow[] {
  return listBookings({ date: localDateStr, limit: 100 }).sort((a, b) => a.start_at.localeCompare(b.start_at));
}

/* ----------------------------- status changes ---------------------------- */

export type StatusActor = 'owner_tg' | 'admin' | 'client';

export function changeBookingStatus(
  id: number,
  next: BookingStatus,
  actor: StatusActor,
): { ok: boolean; booking: BookingRow | null; changed: boolean } {
  const db = getDb();
  const tx = db.transaction(() => {
    const current = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow | undefined;
    if (!current) return { ok: false, booking: null, changed: false };
    if (!canTransition(current.status, next)) return { ok: true, booking: current, changed: false };
    if (current.status === next) return { ok: true, booking: current, changed: false }; // idempotent

    const ts = nowIso();
    db.prepare(
      `UPDATE bookings SET status = ?, status_changed_by = ?, status_changed_at = ?, updated_at = ?,
        confirmed_at = CASE WHEN ? = 'confirmed' THEN COALESCE(confirmed_at, ?) ELSE confirmed_at END
       WHERE id = ?`,
    ).run(next, actor, ts, ts, next, ts, id);

    if (next === 'cancelled_by_client') {
      enqueueNotification(id, 'booking_cancelled');
    }

    return { ok: true, booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow, changed: true };
  });
  return tx.immediate();
}

export function updateBookingFields(id: number, patch: Partial<BookingRow>): BookingRow | null {
  const current = getBookingById(id);
  if (!current) return null;
  getDb()
    .prepare(
      `UPDATE bookings SET car_brand = ?, car_model = ?, car_year = ?, car_plate = ?,
         client_name = ?, client_phone = ?, contact_method = ?, comment = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.car_brand ?? current.car_brand,
      patch.car_model ?? current.car_model,
      patch.car_year === undefined ? current.car_year : patch.car_year,
      patch.car_plate === undefined ? current.car_plate : patch.car_plate,
      patch.client_name ?? current.client_name,
      patch.client_phone ?? current.client_phone,
      patch.contact_method ?? current.contact_method,
      patch.comment === undefined ? current.comment : patch.comment,
      nowIso(),
      id,
    );
  return getBookingById(id);
}

export function deleteBooking(id: number): void {
  getDb().prepare('DELETE FROM bookings WHERE id = ?').run(id);
}

export function bindClientChat(token: string, chatId: string): void {
  getDb().prepare('UPDATE bookings SET tg_chat_id = ?, updated_at = ? WHERE token = ?').run(chatId, nowIso(), token);
}

/* ------------------------------ notifications ---------------------------- */

const BACKOFF_MINUTES = [1, 2, 5, 15, 60, 60, 60, 60];
export const MAX_NOTIFICATION_ATTEMPTS = 8;

export type NotificationRow = {
  id: number;
  booking_id: number;
  kind: 'booking_created' | 'booking_cancelled' | 'test';
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  tg_message_refs: string;
  created_at: string;
  sent_at: string | null;
};

/** Called INSIDE the booking transaction: the card can never be lost (§7.2). */
export function enqueueNotification(bookingId: number, kind: NotificationRow['kind']): number {
  const info = getDb()
    .prepare(
      `INSERT INTO notifications (booking_id, kind, status, attempts, next_attempt_at, created_at)
       VALUES (?, ?, 'pending', 0, ?, ?)`,
    )
    .run(bookingId, kind, nowIso(), nowIso());
  return Number(info.lastInsertRowid);
}

export function getNotification(id: number): NotificationRow | null {
  return (
    (getDb().prepare('SELECT * FROM notifications WHERE id = ?').get(id) as NotificationRow | undefined) ?? null
  );
}

export function getLatestNotificationForBooking(bookingId: number): NotificationRow | null {
  return (
    (getDb()
      .prepare('SELECT * FROM notifications WHERE booking_id = ? ORDER BY id DESC LIMIT 1')
      .get(bookingId) as NotificationRow | undefined) ?? null
  );
}

/** Telegram delivery state shown as a badge in the admin panel. */
export function notificationStateForBooking(bookingId: number): 'none' | 'pending' | 'sent' | 'failed' {
  const row = getLatestNotificationForBooking(bookingId);
  if (!row) return 'none';
  if (row.status === 'sent') return 'sent';
  if (row.status === 'failed') return 'failed';
  return 'pending';
}

export function dueNotifications(now = new Date(), limit = 20): NotificationRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM notifications
       WHERE status = 'pending' AND next_attempt_at <= ?
       ORDER BY next_attempt_at LIMIT ?`,
    )
    .all(now.toISOString(), limit) as NotificationRow[];
}

export function markNotificationSent(id: number, refs: Array<{ chat_id: string; message_id: number }>): void {
  getDb()
    .prepare(
      `UPDATE notifications SET status = 'sent', attempts = attempts + 1, sent_at = ?,
         tg_message_refs = ?, last_error = NULL WHERE id = ?`,
    )
    .run(nowIso(), JSON.stringify(refs), id);
}

export function markNotificationAttemptFailed(id: number, error: string, retryAfterSeconds?: number): void {
  const db = getDb();
  const row = getNotification(id);
  if (!row) return;

  const attempts = row.attempts + 1;
  const exhausted = attempts >= MAX_NOTIFICATION_ATTEMPTS;
  const delayMinutes =
    retryAfterSeconds !== undefined
      ? Math.max(1, Math.ceil(retryAfterSeconds / 60))
      : (BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)] ?? 60);

  db.prepare(
    `UPDATE notifications SET status = ?, attempts = ?, last_error = ?, next_attempt_at = ? WHERE id = ?`,
  ).run(
    exhausted ? 'failed' : 'pending',
    attempts,
    error.slice(0, 500),
    new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    id,
  );
}

/** Manual "Отправить повторно" in the admin panel. */
export function requeueNotification(id: number): NotificationRow | null {
  getDb()
    .prepare(`UPDATE notifications SET status = 'pending', next_attempt_at = ?, attempts = 0 WHERE id = ?`)
    .run(nowIso(), id);
  return getNotification(id);
}

export function storeMessageRefs(id: number, refs: Array<{ chat_id: string; message_id: number }>): void {
  getDb().prepare('UPDATE notifications SET tg_message_refs = ? WHERE id = ?').run(JSON.stringify(refs), id);
}

export function messageRefsForBooking(bookingId: number): Array<{ chat_id: string; message_id: number }> {
  const row = getLatestNotificationForBooking(bookingId);
  if (!row) return [];
  try {
    return JSON.parse(row.tg_message_refs) as Array<{ chat_id: string; message_id: number }>;
  } catch {
    return [];
  }
}

/* ------------------------------- retention ------------------------------- */

/** Anonymises personal data of bookings older than the retention period (§8.5, §10). */
export function anonymizeExpiredBookings(retentionDays: number, now = new Date()): number {
  if (retentionDays <= 0) return 0;
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const info = getDb()
    .prepare(
      `UPDATE bookings SET client_name = 'Аноним', client_phone = '', comment = NULL, ip_hash = NULL,
         car_plate = NULL, updated_at = ?
       WHERE start_at < ? AND client_phone <> ''`,
    )
    .run(nowIso(), cutoff);
  return info.changes;
}

export function todayLocal(): string {
  return localDateOf();
}

export { ACTIVE_STATUSES };
