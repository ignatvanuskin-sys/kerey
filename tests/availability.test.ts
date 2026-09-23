import { describe, expect, it } from 'vitest';
import {
  canTransition,
  computeSlots,
  effectiveWindow,
  hasFreeSlots,
  type AvailabilityInput,
} from '@/lib/availability';
import { localToUtc } from '@/lib/tz';

const HOURS = { open: '08:30', close: '21:00' };

/** 2026-09-26 is a Saturday; 2026-09-21 is a Monday. */
const MONDAY = '2026-09-21';
const SATURDAY = '2026-09-26';

function base(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    localDate: MONDAY,
    durationMin: 60,
    hours: HOURS,
    now: localToUtc(MONDAY, '00:00'),
    slotStepMin: 30,
    bufferMin: 0,
    minLeadMin: 0,
    postsCount: 2,
    busy: [],
    ...overrides,
  };
}

describe('computeSlots — window boundaries', () => {
  it('starts at opening time and never crosses the closing time', () => {
    const slots = computeSlots(base());
    expect(slots[0].time).toBe('08:30');
    expect(slots.at(-1)!.time).toBe('20:00'); // 20:00 + 60min = 21:00
    expect(slots).toHaveLength(24);
  });

  it('respects a longer service duration (last slot moves earlier)', () => {
    const slots = computeSlots(base({ durationMin: 120 }));
    expect(slots.at(-1)!.time).toBe('19:00'); // 19:00 + 120min = 21:00
  });

  it('returns nothing when the duration does not fit into the working day', () => {
    expect(computeSlots(base({ durationMin: 800 }))).toEqual([]);
  });

  it('never produces a slot crossing midnight', () => {
    const slots = computeSlots(base({ hours: { open: '22:00', close: '23:00' }, durationMin: 120 }));
    expect(slots).toEqual([]);
  });

  it('returns nothing for a non-working weekday', () => {
    expect(computeSlots(base({ hours: null }))).toEqual([]);
  });

  it('honours a custom slot step', () => {
    const slots = computeSlots(base({ slotStepMin: 60, durationMin: 60 }));
    expect(slots.map((s) => s.time)).toEqual(['08:30', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30', '19:30']);
  });
});

describe('computeSlots — days off', () => {
  it('closes the whole day', () => {
    expect(computeSlots(base({ dayOff: {} }))).toEqual([]);
  });

  it('opens later on a partial day off', () => {
    const slots = computeSlots(base({ dayOff: { open_from: '12:00' } }));
    expect(slots[0].time).toBe('12:00');
    expect(slots.at(-1)!.time).toBe('20:00');
  });

  it('closes earlier on a partial day off', () => {
    const slots = computeSlots(base({ dayOff: { open_to: '15:00' } }));
    expect(slots[0].time).toBe('08:30');
    expect(slots.at(-1)!.time).toBe('14:00');
  });

  it('supports a reduced window on both sides', () => {
    const slots = computeSlots(base({ dayOff: { open_from: '11:00', open_to: '13:00' } }));
    expect(slots.map((s) => s.time)).toEqual(['11:00', '11:30', '12:00']);
  });

  it('ignores a day-off window wider than the regular hours', () => {
    expect(effectiveWindow(HOURS, { open_from: '07:00', open_to: '23:00' })).toEqual({ openMin: 510, closeMin: 1260 });
  });
});

describe('computeSlots — lead time and today', () => {
  it('skips slots closer than min_lead_min', () => {
    const slots = computeSlots(base({ now: localToUtc(MONDAY, '08:00'), minLeadMin: 60 }));
    expect(slots[0].time).toBe('09:00');
  });

  it('returns nothing for a past date', () => {
    const slots = computeSlots(base({ now: localToUtc('2026-09-27', '12:00') }));
    expect(slots).toEqual([]);
  });

  it('keeps future slots of the current day only', () => {
    const slots = computeSlots({
      ...base(),
      localDate: MONDAY,
      now: localToUtc(MONDAY, '13:07'),
      minLeadMin: 60,
    });
    expect(slots[0].time).toBe('14:30');
  });
});

describe('computeSlots — posts_count and busy intervals', () => {
  const busyAt = (time: string, durationMin = 60, status = 'new') => ({
    startAt: localToUtc(MONDAY, time).toISOString(),
    endAt: new Date(localToUtc(MONDAY, time).getTime() + durationMin * 60_000).toISOString(),
    status,
  });

  it('keeps a slot available while a free post remains', () => {
    const slots = computeSlots(base({ postsCount: 2, busy: [busyAt('10:00')] }));
    expect(slots.find((s) => s.time === '10:00')!.available).toBe(true);
  });

  it('marks the slot busy when every post is taken', () => {
    const slots = computeSlots(base({ postsCount: 2, busy: [busyAt('10:00'), busyAt('10:00')] }));
    expect(slots.find((s) => s.time === '10:00')!.available).toBe(false);
    expect(slots.find((s) => s.time === '11:00')!.available).toBe(true);
  });

  it('works with a single post', () => {
    const slots = computeSlots(base({ postsCount: 1, busy: [busyAt('10:00')] }));
    expect(slots.find((s) => s.time === '10:00')!.available).toBe(false);
    expect(slots.find((s) => s.time === '10:30')!.available).toBe(false);
    expect(slots.find((s) => s.time === '11:00')!.available).toBe(true);
  });

  it('works with three posts', () => {
    const slots = computeSlots(base({ postsCount: 3, busy: [busyAt('10:00'), busyAt('10:00'), busyAt('10:00')] }));
    expect(slots.find((s) => s.time === '10:00')!.available).toBe(false);
  });

  it('counts overlapping services of different durations', () => {
    const slots = computeSlots(base({ postsCount: 1, busy: [busyAt('09:00', 120)] }));
    expect(slots.find((s) => s.time === '09:00')!.available).toBe(false);
    expect(slots.find((s) => s.time === '10:00')!.available).toBe(false);
    expect(slots.find((s) => s.time === '11:00')!.available).toBe(true);
  });

  it('applies the buffer between jobs', () => {
    const withoutBuffer = computeSlots(base({ postsCount: 1, bufferMin: 0, busy: [busyAt('10:00')] }));
    const withBuffer = computeSlots(base({ postsCount: 1, bufferMin: 15, busy: [busyAt('10:00')] }));
    expect(withoutBuffer.find((s) => s.time === '11:00')!.available).toBe(true);
    expect(withBuffer.find((s) => s.time === '11:00')!.available).toBe(false);
    expect(withBuffer.find((s) => s.time === '11:30')!.available).toBe(true);
  });

  it('only counts new and confirmed bookings as busy', () => {
    for (const status of ['rejected', 'cancelled_by_client', 'cancelled_by_owner', 'no_show', 'done']) {
      const slots = computeSlots(base({ postsCount: 1, busy: [busyAt('10:00', 60, status)] }));
      expect(slots.find((s) => s.time === '10:00')!.available, `status ${status} must free the slot`).toBe(true);
    }
    for (const status of ['new', 'confirmed']) {
      const slots = computeSlots(base({ postsCount: 1, busy: [busyAt('10:00', 60, status)] }));
      expect(slots.find((s) => s.time === '10:00')!.available, `status ${status} must occupy the slot`).toBe(false);
    }
  });
});

describe('timezone handling', () => {
  it('converts Kokshetau wall clock into UTC (UTC+5, no DST)', () => {
    expect(localToUtc('2026-09-26', '14:30').toISOString()).toBe('2026-09-26T09:30:00.000Z');
    expect(localToUtc('2026-01-15', '08:30').toISOString()).toBe('2026-01-15T03:30:00.000Z');
  });

  it('keeps slots of a Saturday for a schedule that works 7 days a week', () => {
    expect(hasFreeSlots(computeSlots(base({ localDate: SATURDAY })))).toBe(true);
  });

  it('keeps the last slot of the day strictly before closing after the slot crosses a DST-less boundary', () => {
    const slots = computeSlots(base({ localDate: '2026-12-31', durationMin: 60 }));
    const last = slots.at(-1)!;
    expect(new Date(last.endAt).toISOString()).toBe(localToUtc('2026-12-31', '21:00').toISOString());
  });
});

describe('status machine', () => {
  it('allows the documented transitions', () => {
    expect(canTransition('new', 'confirmed')).toBe(true);
    expect(canTransition('new', 'rejected')).toBe(true);
    expect(canTransition('confirmed', 'done')).toBe(true);
    expect(canTransition('confirmed', 'no_show')).toBe(true);
    expect(canTransition('confirmed', 'cancelled_by_owner')).toBe(true);
  });

  it('is idempotent for a repeated action', () => {
    expect(canTransition('confirmed', 'confirmed')).toBe(true);
    expect(canTransition('rejected', 'rejected')).toBe(true);
  });

  it('rejects transitions out of a terminal status', () => {
    expect(canTransition('done', 'confirmed')).toBe(false);
    expect(canTransition('rejected', 'confirmed')).toBe(false);
    expect(canTransition('no_show', 'confirmed')).toBe(false);
    expect(canTransition('cancelled_by_client', 'confirmed')).toBe(false);
  });
});
