import { describe, expect, it } from 'vitest';
import { formatPhone, maskPhoneForLog, maskPhoneInput, normalizePhone, waDigits } from '@/lib/phone';

describe('normalizePhone', () => {
  it('normalises the same number written in different ways', () => {
    const expected = '+77052062164';
    for (const variant of [
      '8 705 206 21 64',
      '87052062164',
      '+7 705 206 21 64',
      '7 (705) 206-21-64',
      '705 206 21 64',
      '+77052062164',
      '8(705)2062164',
    ]) {
      expect(normalizePhone(variant), variant).toBe(expected);
    }
  });

  it('accepts a second WhatsApp number of the business', () => {
    expect(normalizePhone('+7 771 371 49 22')).toBe('+77713714922');
  });

  it('accepts Russian mobile numbers', () => {
    expect(normalizePhone('+7 999 123 45 67')).toBe('+79991234567');
  });

  it('rejects junk input', () => {
    for (const junk of ['', '   ', 'abc', '12345', '+1 202 555 0147', '0000000000', '123456789012345678']) {
      expect(normalizePhone(junk), junk).toBeNull();
    }
  });
});

describe('formatting helpers', () => {
  it('formats an E.164 number for display', () => {
    expect(formatPhone('+77052062164')).toBe('+7 705 206 21 64');
  });

  it('builds wa.me digits', () => {
    expect(waDigits('+77052062164')).toBe('77052062164');
  });

  it('masks numbers in logs', () => {
    expect(maskPhoneForLog('+77052062164')).toBe('+7705***2164');
    expect(maskPhoneForLog('123')).toBe('***');
  });
});

describe('maskPhoneInput', () => {
  it('builds the mask progressively', () => {
    expect(maskPhoneInput('8')).toBe('+7');
    expect(maskPhoneInput('8705')).toBe('+7 (705)');
    expect(maskPhoneInput('8705206')).toBe('+7 (705) 206');
    expect(maskPhoneInput('87052062164')).toBe('+7 (705) 206-21-64');
  });

  it('ignores extra characters and keeps the national part', () => {
    expect(maskPhoneInput('+7 705 206 21 64 ')).toBe('+7 (705) 206-21-64');
    expect(maskPhoneInput('8-705-206-21-64-999')).toBe('+7 (705) 206-21-64');
  });
});
