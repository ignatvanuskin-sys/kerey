/**
 * Timezone helpers. The database stores UTC, all business logic and rendering use Asia/Almaty (§3).
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { BUSINESS } from '@/content/business';

export const TZ = BUSINESS.timezone;

/** "2026-09-26" + "14:30" (Kokshetau wall clock) → UTC Date */
export function localToUtc(localDate: string, localTime: string): Date {
  return fromZonedTime(`${localDate}T${localTime}:00`, TZ);
}

export function localDateTimeToUtc(value: string): Date {
  // accepts "2026-09-26T14:30" or "2026-09-26T14:30:00"
  const normalized = value.length === 16 ? `${value}:00` : value;
  return fromZonedTime(normalized, TZ);
}

export function formatLocal(date: Date | string, pattern: string): string {
  return formatInTimeZone(typeof date === 'string' ? new Date(date) : date, TZ, pattern);
}

/** "YYYY-MM-DD" in Kokshetau for a given instant (defaults to now). */
export function localDate(instant: Date = new Date()): string {
  return formatLocal(instant, 'yyyy-MM-dd');
}

export function localTime(instant: Date = new Date()): string {
  return formatLocal(instant, 'HH:mm');
}

/** Weekday index in Kokshetau: 1 = Monday … 7 = Sunday (ISO). */
export function localWeekday(instant: Date = new Date()): number {
  const iso = formatLocal(instant, 'i');
  return Number(iso);
}

/** Adds `days` calendar days to a "YYYY-MM-DD" string (pure date arithmetic, no TZ drift). */
export function addLocalDays(localDateStr: string, days: number): string {
  const [y, m, d] = localDateStr.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const next = new Date(base + days * 86_400_000);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(
    next.getUTCDate(),
  ).padStart(2, '0')}`;
}

/** Difference in whole local days between two "YYYY-MM-DD" strings. */
export function diffLocalDays(from: string, to: string): number {
  const a = from.split('-').map(Number);
  const b = to.split('-').map(Number);
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000);
}

export function humanLocalDate(date: Date | string): string {
  return formatLocal(date, 'd MMMM, EEEE');
}

export function humanLocalDateTime(date: Date | string): string {
  return formatLocal(date, 'd.MM HH:mm');
}
