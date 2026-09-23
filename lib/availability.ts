/**
 * Availability engine — pure functions, fully covered by Vitest (§6.5).
 *
 * A booking occupies a slot only while its status is `new` or `confirmed`.
 * `rejected`, `cancelled_*`, `no_show`, `done` release the slot again.
 */
import { localToUtc } from './tz';

export const ACTIVE_STATUSES = ['new', 'confirmed'] as const;
export type BookingStatus =
  | 'new'
  | 'confirmed'
  | 'rejected'
  | 'cancelled_by_client'
  | 'cancelled_by_owner'
  | 'no_show'
  | 'done';

export const TERMINAL_STATUSES: BookingStatus[] = [
  'rejected',
  'done',
  'no_show',
  'cancelled_by_client',
  'cancelled_by_owner',
];

export type Slot = {
  /** "09:00" — Kokshetau wall clock */
  time: string;
  /** ISO-8601 UTC */
  startAt: string;
  endAt: string;
  available: boolean;
};

export type BusyInterval = { startAt: string; endAt: string; status: string };

export type DayOffRule = {
  /** Reduced window start (Kokshetau wall clock). Empty = closed from opening. */
  open_from?: string | null;
  /** Reduced window end (Kokshetau wall clock). Empty = closed until closing. */
  open_to?: string | null;
};

export type AvailabilityInput = {
  /** "YYYY-MM-DD" in the business timezone */
  localDate: string;
  durationMin: number;
  /** Regular opening hours for that weekday, or `null` when the weekday is not working */
  hours: { open: string; close: string } | null;
  /**
   * `undefined` — no exception for this date.
   * An object — the date is a day off: with `open_from`/`open_to` a *reduced* window,
   * with both empty a full closure.
   */
  dayOff?: DayOffRule | null;
  now: Date;
  slotStepMin?: number;
  bufferMin?: number;
  minLeadMin?: number;
  postsCount?: number;
  busy?: BusyInterval[];
};

export const DEFAULT_SETTINGS = {
  slot_step_min: 30,
  buffer_min: 0,
  min_lead_min: 60,
  posts_count: 2,
  horizon_days: 21,
};

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** True when the interval [startA, endA) overlaps [startB, endB). */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Resolves the working window for a date, taking a partial day off into account.
 * Returns `null` when the shop does not work that day at all.
 */
export function effectiveWindow(
  hours: AvailabilityInput['hours'],
  dayOff: AvailabilityInput['dayOff'],
): { openMin: number; closeMin: number } | null {
  if (dayOff) {
    const openFrom = dayOff.open_from ?? null;
    const openTo = dayOff.open_to ?? null;
    if (!openFrom && !openTo) return null; // full closure

    // A partial day off always means a *shorter* day, so hours must be defined.
    if (!hours) return null;
    const regularOpen = toMinutes(hours.open);
    const regularClose = toMinutes(hours.close);
    const openMin = openFrom ? Math.max(regularOpen, toMinutes(openFrom)) : regularOpen;
    const closeMin = openTo ? Math.min(regularClose, toMinutes(openTo)) : regularClose;
    return closeMin > openMin ? { openMin, closeMin } : null;
  }

  if (!hours) return null;
  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);
  // A window that crosses midnight is not supported (a service must finish the same day).
  return closeMin > openMin ? { openMin, closeMin } : null;
}

export function computeSlots(input: AvailabilityInput): Slot[] {
  const {
    localDate,
    durationMin,
    hours,
    dayOff,
    now,
    slotStepMin = DEFAULT_SETTINGS.slot_step_min,
    bufferMin = DEFAULT_SETTINGS.buffer_min,
    minLeadMin = DEFAULT_SETTINGS.min_lead_min,
    postsCount = DEFAULT_SETTINGS.posts_count,
    busy = [],
  } = input;

  const window = effectiveWindow(hours, dayOff);
  if (!window) return [];
  if (durationMin <= 0) return [];

  const step = slotStepMin > 0 ? slotStepMin : DEFAULT_SETTINGS.slot_step_min;
  const posts = postsCount > 0 ? postsCount : 1;
  const earliest = now.getTime() + minLeadMin * 60_000;
  const bufferMs = bufferMin * 60_000;

  const relevantBusy = busy
    .filter((b) => (ACTIVE_STATUSES as readonly string[]).includes(b.status))
    .map((b) => ({ start: new Date(b.startAt).getTime(), end: new Date(b.endAt).getTime() }));

  const slots: Slot[] = [];
  const durationMs = durationMin * 60_000;

  for (let start = window.openMin; start + durationMin <= window.closeMin; start += step) {
    const time = toHHMM(start);
    const startAt = localToUtc(localDate, time);
    const startMs = startAt.getTime();
    const endMs = startMs + durationMs;

    if (startMs < earliest) continue;

    const busyCount = relevantBusy.filter((b) =>
      overlaps(b.start, b.end + bufferMs, startMs - bufferMs, endMs),
    ).length;

    slots.push({
      time,
      startAt: startAt.toISOString(),
      endAt: new Date(endMs).toISOString(),
      available: busyCount < posts,
    });
  }

  return slots;
}

export function hasFreeSlots(slots: Slot[]): boolean {
  return slots.some((s) => s.available);
}

/** Public shape for `GET /api/availability` (§9.2). */
export function publicSlots(slots: Slot[]): Array<{ time: string; available: boolean }> {
  return slots.map(({ time, available }) => ({ time, available }));
}

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new: ['confirmed', 'rejected', 'cancelled_by_client', 'cancelled_by_owner'],
  confirmed: ['done', 'no_show', 'cancelled_by_owner', 'cancelled_by_client'],
  rejected: [],
  cancelled_by_client: [],
  cancelled_by_owner: [],
  no_show: [],
  done: [],
};

/** Idempotent by design: re-applying the same status is a no-op, not an error (§6.5.1). */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function occupiesSlot(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function statusLabelRu(status: BookingStatus): string {
  switch (status) {
    case 'new':
      return 'Ожидает подтверждения';
    case 'confirmed':
      return 'Подтверждена';
    case 'rejected':
      return 'Отклонена';
    case 'cancelled_by_client':
      return 'Отменена клиентом';
    case 'cancelled_by_owner':
      return 'Отменена сервисом';
    case 'no_show':
      return 'Клиент не приехал';
    case 'done':
      return 'Выполнена';
  }
}
