import { describe, expect, it } from 'vitest';
import { addLocalDays, diffLocalDays, formatLocal, localDate, localToUtc, localWeekday } from '@/lib/tz';

describe('timezone helpers', () => {
  it('converts Kokshetau wall clock to UTC regardless of the server timezone (QA 8)', () => {
    const original = process.env.TZ;
    try {
      // A device/server in a completely different timezone must not change the result.
      process.env.TZ = 'America/New_York';
      expect(localToUtc('2026-09-26', '14:30').toISOString()).toBe('2026-09-26T09:30:00.000Z');
      expect(formatLocal('2026-09-26T09:30:00.000Z', 'HH:mm')).toBe('14:30');
      expect(formatLocal('2026-09-26T20:00:00.000Z', 'yyyy-MM-dd HH:mm')).toBe('2026-09-27 01:00');
    } finally {
      process.env.TZ = original;
    }
  });

  it('rolls the local date over at midnight Almaty time (QA 7)', () => {
    expect(localDate(new Date('2026-09-25T18:59:00.000Z'))).toBe('2026-09-25');
    expect(localDate(new Date('2026-09-25T19:00:00.000Z'))).toBe('2026-09-26');
  });

  it('reports the ISO weekday in Almaty', () => {
    expect(localWeekday(new Date('2026-09-26T09:00:00.000Z'))).toBe(6); // Saturday
    expect(localWeekday(new Date('2026-09-27T09:00:00.000Z'))).toBe(7); // Sunday
  });

  it('adds and subtracts calendar days without DST drift', () => {
    expect(addLocalDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffLocalDays('2026-09-21', '2026-09-26')).toBe(5);
    expect(diffLocalDays('2026-09-26', '2026-09-21')).toBe(-5);
  });
});
