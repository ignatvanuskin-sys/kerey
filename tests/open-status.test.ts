import { describe, expect, it } from 'vitest';
import { computeOpenStatus } from '@/lib/open-status';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '@/lib/settings';
import { localToUtc } from '@/lib/tz';

const SATURDAY = '2026-09-26';

function settingsWith(patch: Partial<Settings> = {}): Settings {
  return { ...mergeSettings({}), ...patch };
}

describe('computeOpenStatus', () => {
  it('shows the closing time while the shop is open', () => {
    const status = computeOpenStatus(settingsWith(), null, localToUtc(SATURDAY, '09:00'));
    expect(status.open).toBe(true);
    expect(status.label).toBe('Открыто сейчас · до 21:00');
  });

  it('shows the next opening before the working day starts', () => {
    const status = computeOpenStatus(settingsWith(), null, localToUtc(SATURDAY, '07:10'));
    expect(status.open).toBe(false);
    expect(status.label).toBe('Закрыто — откроемся в 08:30');
  });

  it('shows the next day opening after the working day ends', () => {
    const status = computeOpenStatus(settingsWith(), null, localToUtc(SATURDAY, '21:30'));
    expect(status.open).toBe(false);
    expect(status.label).toBe('Закрыто — откроемся в 08:30');
  });

  it('is closed on a full day off', () => {
    const status = computeOpenStatus(
      settingsWith(),
      { local_date: SATURDAY, open_from: null, open_to: null },
      localToUtc(SATURDAY, '12:00'),
    );
    expect(status.open).toBe(false);
  });

  it('respects a reduced day', () => {
    const settings = settingsWith();
    const dayOff = { local_date: SATURDAY, open_from: '12:00', open_to: '15:00' };
    expect(computeOpenStatus(settings, dayOff, localToUtc(SATURDAY, '11:00')).label).toBe('Закрыто — откроемся в 12:00');
    expect(computeOpenStatus(settings, dayOff, localToUtc(SATURDAY, '13:00')).label).toBe('Открыто сейчас · до 15:00');
    expect(computeOpenStatus(settings, dayOff, localToUtc(SATURDAY, '16:00')).open).toBe(false);
  });

  it('is closed on a non-working weekday and looks for the next working day', () => {
    const settings = settingsWith({ schedule: { ...DEFAULT_SETTINGS.schedule, '6': null, '7': null } });
    const status = computeOpenStatus(settings, null, localToUtc(SATURDAY, '12:00'));
    expect(status.open).toBe(false);
    expect(status.label).toBe('Закрыто — откроемся в 08:30'); // Monday
  });
});
