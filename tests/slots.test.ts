import { describe, expect, it } from 'vitest';
import {
  BOOKING_HORIZON_DAYS,
  MIN_LEAD_MIN,
  allSlotsOfDay,
  bookingDates,
  dateHasFreeSlots,
  slotAvailability,
  slotsForDate,
  type BusyInterval,
} from '@/lib/slots';
import { BUSINESS } from '@/content/business';
import { addDays, minutesFromHHMM, todayInTz } from '@/lib/format';

/** «Сейчас» — 06:00 по Кокшетау, чтобы дневные слоты были ещё впереди. */
function nowAt(date: string, minutes: number): Date {
  // Кокшетау = UTC+5
  const [year, month, day] = date.split('-').map(Number);
  const utcMinutes = minutes - 300; // переводим местное время в UTC
  return new Date(Date.UTC(year, month - 1, day, 0, utcMinutes));
}

const TODAY = todayInTz();
const AT_6_AM = nowAt(TODAY, 6 * 60);

describe('сетка слотов', () => {
  it('начинается с открытия и заканчивается так, чтобы приём влез до закрытия', () => {
    const slots = allSlotsOfDay(60);
    expect(slots[0]).toBe(BUSINESS.hours.open); // 08:30
    const last = slots.at(-1)!;
    expect(minutesFromHHMM(last) + 60).toBeLessThanOrEqual(minutesFromHHMM(BUSINESS.hours.close));
  });

  it('идёт с шагом 30 минут', () => {
    const slots = allSlotsOfDay(60);
    for (let index = 1; index < slots.length; index += 1) {
      expect(minutesFromHHMM(slots[index]) - minutesFromHHMM(slots[index - 1])).toBe(30);
    }
  });

  it('более длинная услуга сдвигает последний слот', () => {
    expect(allSlotsOfDay(120).at(-1)).not.toBe(allSlotsOfDay(60).at(-1));
  });
});

describe('занятость и правила записи', () => {
  it('помечает занятый слот недоступным (вместимость — одна заявка)', () => {
    const busy: BusyInterval[] = [{ date: TODAY, time: '10:00', durationMin: 60 }];
    const slots = slotsForDate(TODAY, 60, busy, AT_6_AM);
    expect(slots.find((slot) => slot.time === '10:00')?.available).toBe(false);
    expect(slots.find((slot) => slot.time === '10:30')?.available).toBe(false);
    expect(slots.find((slot) => slot.time === '11:00')?.available).toBe(true);
  });

  it('не даёт записаться раньше, чем через час', () => {
    const now = nowAt(TODAY, 10 * 60); // 10:00
    const slots = slotsForDate(TODAY, 60, [], now);
    expect(slots.find((slot) => slot.time === '10:00')?.available).toBe(false);
    expect(slots.find((slot) => slot.time === '10:30')?.available).toBe(false);
    expect(slots.find((slot) => slot.time === '11:00')?.available).toBe(true);
    expect(MIN_LEAD_MIN).toBe(60);
  });

  it('не открывает прошедшие даты и даты за горизонтом', () => {
    expect(slotsForDate(addDays(TODAY, -1), 60, [], AT_6_AM)).toEqual([]);
    expect(slotsForDate(addDays(TODAY, BOOKING_HORIZON_DAYS + 1), 60, [], AT_6_AM)).toEqual([]);
    expect(slotsForDate(addDays(TODAY, BOOKING_HORIZON_DAYS), 60, [], AT_6_AM).length).toBeGreaterThan(0);
  });

  it('календарь содержит сегодня и ещё 14 дней', () => {
    const dates = bookingDates(AT_6_AM);
    expect(dates[0]).toBe(TODAY);
    expect(dates).toHaveLength(BOOKING_HORIZON_DAYS + 1);
  });

  it('подсказывает, есть ли на дате свободное время', () => {
    const fullyBusy: BusyInterval[] = allSlotsOfDay(60).map((time) => ({ date: TODAY, time, durationMin: 60 }));
    expect(dateHasFreeSlots(TODAY, 60, fullyBusy, AT_6_AM)).toBe(false);
    expect(dateHasFreeSlots(TODAY, 60, [], AT_6_AM)).toBe(true);
  });
});

describe('проверка перед созданием заявки', () => {
  it('пропускает свободное время', () => {
    expect(slotAvailability(TODAY, '12:00', 'suspension', [], AT_6_AM)).toEqual({ ok: true });
  });

  it('отклоняет занятое время', () => {
    const busy: BusyInterval[] = [{ date: TODAY, time: '12:00', durationMin: 60 }];
    expect(slotAvailability(TODAY, '12:00', 'suspension', busy, AT_6_AM)).toEqual({ ok: false, reason: 'taken' });
  });

  it('отклоняет время вне сетки и прошедшие даты', () => {
    expect(slotAvailability(TODAY, '23:45', 'suspension', [], AT_6_AM).ok).toBe(false);
    expect(slotAvailability(addDays(TODAY, -3), '12:00', 'suspension', [], AT_6_AM)).toEqual({
      ok: false,
      reason: 'past',
    });
  });
});
