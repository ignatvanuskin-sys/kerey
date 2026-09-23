import { describe, expect, it } from 'vitest';
import { normalizePhone, formatPhone, maskPhoneInput, waDigits, maskPhoneForLog } from '@/lib/phone';
import { looksLikeBot, parseBookingPayload, validateBooking, validateField, type BookingFormValues } from '@/lib/validation';
import { addDays, todayInTz } from '@/lib/format';

const TODAY = todayInTz();

function values(overrides: Partial<BookingFormValues> = {}): BookingFormValues {
  return {
    serviceSlug: 'suspension',
    date: addDays(TODAY, 2),
    time: '11:00',
    carBrand: 'Toyota',
    carModel: 'Camry',
    carYear: '2012',
    carPlate: '123ABC02',
    name: 'Асхат',
    phone: '+7 (705) 206-21-64',
    comment: 'Стук спереди справа',
    ...overrides,
  };
}

describe('телефон', () => {
  it('приводит разные записи одного номера к одному виду', () => {
    for (const variant of ['8 705 206 21 64', '87052062164', '+7 705 206 21 64', '7 (705) 206-21-64', '7052062164']) {
      expect(normalizePhone(variant), variant).toBe('+77052062164');
    }
  });

  it('принимает российские мобильные', () => {
    expect(normalizePhone('+7 999 123 45 67')).toBe('+79991234567');
  });

  it('отклоняет мусор', () => {
    for (const junk of ['', '   ', 'abc', '12345', '+1 202 555 0147', '0000000000', '123456789012345678']) {
      expect(normalizePhone(junk), junk).toBeNull();
    }
  });

  it('форматирует и маскирует', () => {
    expect(formatPhone('+77052062164')).toBe('+7 705 206 21 64');
    expect(waDigits('+77052062164')).toBe('77052062164');
    expect(maskPhoneForLog('+77052062164')).toBe('+7705***2164');
    expect(maskPhoneInput('8705206')).toBe('+7 (705) 206');
  });
});

describe('валидация полей', () => {
  it('не пропускает пустые обязательные поля', () => {
    expect(validateField('serviceSlug', values({ serviceSlug: '' }))).toBe('Выберите услугу');
    expect(validateField('carBrand', values({ carBrand: '' }))).toBe('Укажите марку автомобиля');
    expect(validateField('name', values({ name: 'A' }))).toBe('Как к вам обращаться?');
    expect(validateField('phone', values({ phone: '12345' }))).toBe(
      'Телефон в формате +7 705 206 21 64',
    );
  });

  it('не требует необязательные поля', () => {
    expect(validateField('carYear', values({ carYear: '' }))).toBeUndefined();
    expect(validateField('carPlate', values({ carPlate: '' }))).toBeUndefined();
    expect(validateField('comment', values({ comment: '' }))).toBeUndefined();
  });

  it('проверяет формат года и длину комментария', () => {
    expect(validateField('carYear', values({ carYear: '20' }))).toBe('Год — четыре цифры');
    expect(validateField('carYear', values({ carYear: '1200' }))).toBe('Проверьте год');
    expect(validateField('comment', values({ comment: 'я'.repeat(501) }))).toBe('Не больше 500 символов');
  });

  it('требует согласие на обработку данных', () => {
    expect(Object.keys(validateBooking(values(), true))).toHaveLength(0);
    expect(validateBooking(values(), false).consent).toBe('Нужно согласие на обработку данных');
  });
});

describe('разбор запроса на сервере', () => {
  it('нормализует телефон и обрезает лишнее', () => {
    const result = parseBookingPayload({ ...values(), consent: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.phone).toBe('+77052062164');
    expect(result.data.utm).toEqual({ source: undefined, medium: undefined, campaign: undefined });
  });

  it('возвращает ошибки по полям', () => {
    const result = parseBookingPayload({ ...values({ phone: 'нет', name: '' }), consent: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.phone).toBeDefined();
    expect(result.errors.name).toBeDefined();
  });

  it('требует согласие', () => {
    const result = parseBookingPayload({ ...values(), consent: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.consent).toBeDefined();
  });

  it('распознаёт бота по скрытому полю и скорости отправки', () => {
    const result = parseBookingPayload({ ...values(), consent: true, trap: 'www.spam.kz' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(looksLikeBot(result.data, 9000)).toBe(true);
    expect(looksLikeBot({ ...result.data, trap: '' }, 500)).toBe(true);
    expect(looksLikeBot({ ...result.data, trap: '' }, 9000)).toBe(false);
  });
});
