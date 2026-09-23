import { describe, expect, it } from 'vitest';
import { addDays, dayMonth, diffDays, humanDate, humanDuration, nowInTz, plural, relativeDayLabel, weekdayShort } from '@/lib/format';

describe('время Кокшетау (UTC+5)', () => {
  it('считает местное время независимо от пояса сервера', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'America/New_York';
      // 09:30 UTC = 14:30 в Кокшетау
      expect(nowInTz(new Date('2026-09-26T09:30:00.000Z')).time).toBe('14:30');
      expect(nowInTz(new Date('2026-09-26T09:30:00.000Z')).date).toBe('2026-09-26');
      // переход суток по местному времени
      expect(nowInTz(new Date('2026-09-25T19:00:00.000Z')).date).toBe('2026-09-26');
    } finally {
      process.env.TZ = original;
    }
  });

  it('переносит приём до закрытия сервиса', () => {
    // 20:00 местного — ещё можно, 21:30 — уже нет
    expect(nowInTz(new Date('2026-09-26T15:00:00.000Z')).minutes).toBe(20 * 60);
    expect(nowInTz(new Date('2026-09-26T16:30:00.000Z')).minutes).toBe(21 * 60 + 30);
  });
});

describe('даты', () => {
  it('прибавляет дни без сдвигов', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-09-21', '2026-09-26')).toBe(5);
  });

  it('подписывает ближайшие дни словами', () => {
    expect(relativeDayLabel('2026-09-26', '2026-09-26')).toBe('Сегодня');
    expect(relativeDayLabel('2026-09-27', '2026-09-26')).toBe('Завтра');
    expect(relativeDayLabel('2026-09-28', '2026-09-26')).toBe('Послезавтра');
    expect(relativeDayLabel('2026-10-01', '2026-09-26')).toBe('чт');
  });

  it('форматирует даты и время по-русски', () => {
    expect(humanDate('2026-09-26')).toBe('26 сентября, суббота');
    expect(weekdayShort('2026-09-26')).toBe('сб');
    expect(dayMonth('2026-09-26')).toBe('26.09');
    expect(humanDuration(30)).toBe('30 мин');
    expect(humanDuration(90)).toBe('1 ч 30 мин');
  });

  it('правильно склоняет слова', () => {
    expect(plural(1, 'отзыв', 'отзыва', 'отзывов')).toBe('отзыв');
    expect(plural(2, 'отзыв', 'отзыва', 'отзывов')).toBe('отзыва');
    // склонение идёт по последней цифре: «132 отзыва», «201 оценка»
    expect(plural(132, 'отзыв', 'отзыва', 'отзывов')).toBe('отзыва');
    expect(plural(201, 'оценка', 'оценки', 'оценок')).toBe('оценка');
    expect(plural(11, 'отзыв', 'отзыва', 'отзывов')).toBe('отзывов');
    expect(plural(112, 'отзыв', 'отзыва', 'отзывов')).toBe('отзывов');
  });
});
