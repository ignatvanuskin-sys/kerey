/**
 * Сетка свободного времени.
 *
 * Часы работы — из карточки 2ГИС: ежедневно 08:30–21:00.
 * Шаг слотов 30 минут, длительность приёма берётся из услуги (в карточке её нет,
 * поэтому это только длина «окна» в расписании, а не обещание клиенту).
 *
 * ЁМКОСТЬ: в карточке не указано, сколько машин сервис принимает одновременно.
 * Чтобы не выдумывать и не посадить двух клиентов на одно время, по умолчанию
 * на один слот — одна заявка. Меняется здесь одной константой.
 */
import { BUSINESS } from '@/content/business';
import { addDays, diffDays, hhmmFromMinutes, minutesFromHHMM, nowInTz, todayInTz } from './format';
import { durationForService } from './validation';

export const SLOT_STEP_MIN = 30;
/** Максимум одновременных заявок на один слот (число постов не подтверждено — берём 1). */
export const SLOT_CAPACITY = 1;
/** На сколько дней вперёд открыта запись. */
export const BOOKING_HORIZON_DAYS = 14;
/** За сколько минут до приёма запись закрывается. */
export const MIN_LEAD_MIN = 60;

export type Slot = { time: string; available: boolean };

export type BusyInterval = { date: string; time: string; durationMin: number };

/** Все слоты рабочего дня без учёта занятости. */
export function allSlotsOfDay(durationMin = 60): string[] {
  const open = minutesFromHHMM(BUSINESS.hours.open);
  const close = minutesFromHHMM(BUSINESS.hours.close);
  const slots: string[] = [];

  for (let start = open; start + durationMin <= close; start += SLOT_STEP_MIN) {
    slots.push(hhmmFromMinutes(start));
  }
  return slots;
}

/** Список дат, доступных для записи: сегодня … +14 дней. */
export function bookingDates(now: Date = new Date()): string[] {
  const today = todayInTz(now);
  return Array.from({ length: BOOKING_HORIZON_DAYS + 1 }, (_, index) => addDays(today, index));
}

function overlaps(aStart: number, aDuration: number, bStart: number, bDuration: number): boolean {
  return aStart < bStart + bDuration && aStart + aDuration > bStart;
}

/**
 * Слоты конкретного дня с учётом занятости и правила «не позже чем за час».
 * `busy` — интервалы активных заявок (NEW и CONFIRMED).
 */
export function slotsForDate(
  date: string,
  durationMin: number,
  busy: BusyInterval[],
  now: Date = new Date(),
): Slot[] {
  const today = todayInTz(now);
  const offset = diffDays(today, date);
  if (offset < 0 || offset > BOOKING_HORIZON_DAYS) return [];

  const nowMinutes = nowInTz(now).minutes;
  const busyToday = busy.filter((interval) => interval.date === date);

  return allSlotsOfDay(durationMin).map((time) => {
    const start = minutesFromHHMM(time);

    // сегодня — не раньше чем через час
    if (offset === 0 && start < nowMinutes + MIN_LEAD_MIN) {
      return { time, available: false };
    }

    const taken = busyToday.filter((interval) =>
      overlaps(start, durationMin, minutesFromHHMM(interval.time), interval.durationMin),
    ).length;

    return { time, available: taken < SLOT_CAPACITY };
  });
}

/** Есть ли на дате хотя бы один свободный слот (для календаря). */
export function dateHasFreeSlots(
  date: string,
  durationMin: number,
  busy: BusyInterval[],
  now: Date = new Date(),
): boolean {
  return slotsForDate(date, durationMin, busy, now).some((slot) => slot.available);
}

/** Проверка конкретной пары дата+время перед созданием заявки (та же логика, что в UI). */
export function slotAvailability(
  date: string,
  time: string,
  serviceSlug: string,
  busy: BusyInterval[],
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: 'past' | 'closed' | 'taken' | 'wrong_time' } {
  const durationMin = durationForService(serviceSlug);
  const today = todayInTz(now);

  if (diffDays(today, date) < 0) return { ok: false, reason: 'past' };
  if (diffDays(today, date) > BOOKING_HORIZON_DAYS) return { ok: false, reason: 'closed' };

  const slots = slotsForDate(date, durationMin, busy, now);
  const slot = slots.find((item) => item.time === time);
  if (!slot) return { ok: false, reason: 'wrong_time' };
  if (slot.available) return { ok: true };

  // Слот недоступен: различаем «время уже прошло» и «время занято».
  const tooLateToday = diffDays(today, date) === 0 && minutesFromHHMM(time) < nowInTz(now).minutes + MIN_LEAD_MIN;
  return { ok: false, reason: tooLateToday ? 'past' : 'taken' };
}
