/**
 * "Открыто сейчас / Закрыто" badge — pure and testable, always in Asia/Almaty (§4.2).
 */
import { effectiveWindow } from '@/lib/availability';
import { hoursForDate, type Settings } from '@/lib/settings';
import { addLocalDays, formatLocal, localDate as localDateOf } from '@/lib/tz';

export type OpenStatus = {
  open: boolean;
  label: string;
  /** "HH:mm" of the next opening or of today's closing time */
  reference: string | null;
};

type DayOffLike = { local_date: string; open_from: string | null; open_to: string | null } | null | undefined;

function minutesToHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function computeOpenStatus(settings: Settings, dayOffToday: DayOffLike, now: Date = new Date()): OpenStatus {
  const today = localDateOf(now);
  const minutesNow = Number(formatLocal(now, 'H')) * 60 + Number(formatLocal(now, 'm'));

  const window = effectiveWindow(hoursForDate(settings, today), dayOffToday ?? undefined);

  if (window && minutesNow >= window.openMin && minutesNow < window.closeMin) {
    const close = minutesToHHMM(window.closeMin);
    return { open: true, label: `Открыто сейчас · до ${close}`, reference: close };
  }

  if (window && minutesNow < window.openMin) {
    const open = minutesToHHMM(window.openMin);
    return { open: false, label: `Закрыто — откроемся в ${open}`, reference: open };
  }

  // Closed for today: find the next working day (a week ahead is always enough).
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = effectiveWindow(hoursForDate(settings, addLocalDays(today, offset)), undefined);
    if (candidate) {
      const open = minutesToHHMM(candidate.openMin);
      return { open: false, label: `Закрыто — откроемся в ${open}`, reference: open };
    }
  }

  return { open: false, label: 'Закрыто', reference: null };
}
