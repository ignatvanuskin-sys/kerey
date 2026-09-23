/**
 * Persistence for editable settings and calendar exceptions (§8.3).
 */
import { getDb, nowIso } from '@/db/client';
import { DEFAULT_SETTINGS, mergeSettings, type DayWindow, type Settings } from '@/lib/settings';

type SettingsRow = { key: string; value: string };

export function getSettings(): Settings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as SettingsRow[];
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      stored[row.key] = JSON.parse(row.value);
    } catch {
      // ignore malformed rows, fall back to defaults
    }
  }
  return mergeSettings(stored);
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      upsert.run(key, JSON.stringify(value));
    }
  });
  tx.immediate();
  return getSettings();
}

export function resetSettings(): Settings {
  getDb().prepare('DELETE FROM settings').run();
  return getSettings();
}

/** Pure helpers live in lib/settings so client components can import them without the DB. */
export { hoursForDate, isoWeekdayOfLocalDate } from '@/lib/settings';

export type DayOffRow = {
  id: number;
  local_date: string;
  open_from: string | null;
  open_to: string | null;
  reason: string;
};

export function listDaysOff(from?: string, to?: string): DayOffRow[] {
  const db = getDb();
  if (from && to) {
    return db
      .prepare('SELECT * FROM days_off WHERE local_date >= ? AND local_date <= ? ORDER BY local_date')
      .all(from, to) as DayOffRow[];
  }
  return db.prepare('SELECT * FROM days_off ORDER BY local_date').all() as DayOffRow[];
}

export function getDayOff(localDateStr: string): DayOffRow | null {
  const row = getDb().prepare('SELECT * FROM days_off WHERE local_date = ?').get(localDateStr) as
    | DayOffRow
    | undefined;
  return row ?? null;
}

export function saveDayOff(input: {
  id?: number;
  local_date: string;
  open_from?: string | null;
  open_to?: string | null;
  reason?: string;
}): DayOffRow {
  const db = getDb();
  db.prepare(
    `INSERT INTO days_off (local_date, open_from, open_to, reason) VALUES (?, ?, ?, ?)
     ON CONFLICT(local_date) DO UPDATE SET
       open_from = excluded.open_from,
       open_to   = excluded.open_to,
       reason    = excluded.reason`,
  ).run(input.local_date, input.open_from ?? null, input.open_to ?? null, input.reason ?? '');
  return getDayOff(input.local_date)!;
}

export function deleteDayOff(localDateStr: string): void {
  getDb().prepare('DELETE FROM days_off WHERE local_date = ?').run(localDateStr);
}

export function audit(action: string, actor: string, bookingId?: number, details?: string): void {
  getDb()
    .prepare('INSERT INTO audit_log (action, actor, booking_id, details, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(action, actor, bookingId ?? null, details ?? null, nowIso());
}

export { DEFAULT_SETTINGS };
export type { Settings };
