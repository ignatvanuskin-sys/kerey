/**
 * Editable settings (§8.3). Values live in the `settings` table as JSON;
 * anything missing falls back to the defaults below.
 */
import { BUSINESS } from '@/content/business';

export type DayWindow = { open: string; close: string } | null;

/** Keys are ISO weekday numbers as strings: "1" = Monday … "7" = Sunday. */
export type Schedule = Record<string, DayWindow>;

export type Settings = {
  schedule: Schedule;
  posts_count: number;
  slot_step_min: number;
  buffer_min: number;
  min_lead_min: number;
  horizon_days: number;
  contacts: {
    phone_display?: string;
    phone_e164?: string;
    whatsapp?: Array<{ display: string; wa: string }>;
    address?: string;
    instagram?: string;
  } | null;
  texts: {
    warranty: string | null;
    experience: string | null;
    equipment: string | null;
  };
  telegram_callbacks_enabled: boolean;
  retention_days: number;
};

export const WEEKDAY_NAMES_RU: Record<string, string> = {
  '1': 'Понедельник',
  '2': 'Вторник',
  '3': 'Среда',
  '4': 'Четверг',
  '5': 'Пятница',
  '6': 'Суббота',
  '7': 'Воскресенье',
};

function defaultSchedule(): Schedule {
  const schedule: Schedule = {};
  for (let day = 1; day <= 7; day += 1) {
    schedule[String(day)] = { open: BUSINESS.hours.open, close: BUSINESS.hours.close };
  }
  return schedule;
}

export const DEFAULT_SETTINGS: Settings = {
  schedule: defaultSchedule(),
  posts_count: 2, // ASSUMPTION: two work posts, editable in the admin panel
  slot_step_min: 30,
  buffer_min: 0,
  min_lead_min: 60,
  horizon_days: 21,
  contacts: null,
  texts: { warranty: null, experience: null, equipment: null },
  telegram_callbacks_enabled: true,
  retention_days: 730,
};

/** Deep merge of stored values over the defaults, tolerant to partial rows. */
export function mergeSettings(stored: Record<string, unknown>): Settings {
  const schedule: Schedule = { ...DEFAULT_SETTINGS.schedule };
  const storedSchedule = stored.schedule as Schedule | undefined;
  if (storedSchedule && typeof storedSchedule === 'object') {
    for (const key of Object.keys(schedule)) {
      if (key in storedSchedule) {
        const value = storedSchedule[key];
        schedule[key] = value && typeof value === 'object' ? { open: value.open, close: value.close } : null;
      }
    }
  }

  return {
    schedule,
    posts_count: Number(stored.posts_count ?? DEFAULT_SETTINGS.posts_count),
    slot_step_min: Number(stored.slot_step_min ?? DEFAULT_SETTINGS.slot_step_min),
    buffer_min: Number(stored.buffer_min ?? DEFAULT_SETTINGS.buffer_min),
    min_lead_min: Number(stored.min_lead_min ?? DEFAULT_SETTINGS.min_lead_min),
    horizon_days: Number(stored.horizon_days ?? DEFAULT_SETTINGS.horizon_days),
    contacts: (stored.contacts as Settings['contacts']) ?? null,
    texts: { ...DEFAULT_SETTINGS.texts, ...((stored.texts as Settings['texts']) ?? {}) },
    telegram_callbacks_enabled:
      typeof stored.telegram_callbacks_enabled === 'boolean'
        ? stored.telegram_callbacks_enabled
        : DEFAULT_SETTINGS.telegram_callbacks_enabled,
    retention_days: Number(stored.retention_days ?? DEFAULT_SETTINGS.retention_days),
  };
}

/** Contacts shown on the site: admin overrides win over the DATA defaults (§1, §8.4). */
export function effectiveContacts(settings: Settings) {
  const c = settings.contacts ?? {};
  return {
    address: c.address?.trim() || BUSINESS.address,
    phoneDisplay: c.phone_display?.trim() || BUSINESS.phone.display,
    phoneE164: c.phone_e164?.trim() || BUSINESS.phone.e164,
    whatsapp: c.whatsapp?.length ? c.whatsapp : BUSINESS.whatsapp,
    instagramUrl: c.instagram?.trim() || BUSINESS.instagram.url,
    instagramHandle: (c.instagram?.trim() || BUSINESS.instagram.url).replace(/\/+$/, '').split('/').pop() ?? '',
  };
}
/* ------------------------- pure helpers (DB-free) ------------------------- */

/** ISO weekday (1 = Monday … 7 = Sunday) of a "YYYY-MM-DD" calendar date. */
export function isoWeekdayOfLocalDate(localDateStr: string): number {
  const [y, m, d] = localDateStr.split('-').map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

/** Regular opening hours of a local date, or `null` when the weekday is not a working day. */
export function hoursForDate(settings: Settings, localDateStr: string): DayWindow {
  return settings.schedule[String(isoWeekdayOfLocalDate(localDateStr))] ?? null;
}
