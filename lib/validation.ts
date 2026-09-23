/**
 * Валидация заявки. Одни и те же правила работают и на клиенте (мгновенная подсказка),
 * и на сервере (защита от подделки запроса) — без внешних библиотек.
 */
import { normalizePhone } from './phone';
import { SERVICES, DEFAULT_DURATION_MIN } from '@/content/services';

export const MAX_COMMENT = 500;
export const MAX_NAME = 60;
export const MAX_CAR_FIELD = 40;

export type BookingFormValues = {
  serviceSlug: string;
  date: string;
  time: string;
  carBrand: string;
  carModel: string;
  carYear: string;
  carPlate: string;
  name: string;
  phone: string;
  comment: string;
};

export type FieldErrors = Partial<Record<keyof BookingFormValues | 'consent', string>>;

export function validServiceSlugs(): string[] {
  return SERVICES.map((service) => service.slug);
}

export function durationForService(slug: string): number {
  return SERVICES.find((service) => service.slug === slug)?.durationMin ?? DEFAULT_DURATION_MIN;
}

/**
 * Проверка одного поля — используется и в форме (по blur), и на сервере.
 * Возвращает текст ошибки или undefined.
 */
export function validateField(
  field: keyof BookingFormValues,
  values: BookingFormValues,
): string | undefined {
  const value = values[field];

  switch (field) {
    case 'serviceSlug':
      if (!value || !validServiceSlugs().includes(value)) return 'Выберите услугу';
      return undefined;
    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Выберите дату';
      return undefined;
    case 'time':
      if (!/^\d{2}:\d{2}$/.test(value)) return 'Выберите время';
      return undefined;
    case 'carBrand':
      if (value.trim().length < 2) return 'Укажите марку автомобиля';
      if (value.trim().length > MAX_CAR_FIELD) return 'Слишком длинное значение';
      return undefined;
    case 'carModel':
      if (value.trim().length < 1) return 'Укажите модель';
      if (value.trim().length > MAX_CAR_FIELD) return 'Слишком длинное значение';
      return undefined;
    case 'carYear': {
      const trimmed = value.trim();
      if (!trimmed) return undefined; // необязательное поле
      if (!/^\d{4}$/.test(trimmed)) return 'Год — четыре цифры';
      const year = Number(trimmed);
      if (year < 1950 || year > 2100) return 'Проверьте год';
      return undefined;
    }
    case 'carPlate':
      if (value.trim().length > 12) return 'Слишком длинный номер';
      return undefined;
    case 'name':
      if (value.trim().length < 2) return 'Как к вам обращаться?';
      if (value.trim().length > MAX_NAME) return 'Слишком длинное имя';
      return undefined;
    case 'phone':
      return normalizePhone(value) ? undefined : 'Телефон в формате +7 705 206 21 64';
    case 'comment':
      if (value.length > MAX_COMMENT) return `Не больше ${MAX_COMMENT} символов`;
      return undefined;
    default:
      return undefined;
  }
}

export function validateBooking(
  values: BookingFormValues,
  consent: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  (Object.keys(values) as Array<keyof BookingFormValues>).forEach((field) => {
    const error = validateField(field, values);
    if (error) errors[field] = error;
  });
  if (!consent) errors.consent = 'Нужно согласие на обработку данных';
  return errors;
}

export function isFormValid(values: BookingFormValues, consent: boolean): boolean {
  return Object.keys(validateBooking(values, consent)).length === 0;
}

/** Данные, которые приходят из формы на сервер. */
export type BookingPayload = {
  serviceSlug: string;
  date: string;
  time: string;
  carBrand: string;
  carModel: string;
  carYear?: string;
  carPlate?: string;
  name: string;
  phone: string;
  comment?: string;
  consent: boolean;
  utm?: { source?: string; medium?: string; campaign?: string };
  /** Скрытое поле-приманка: люди его не заполняют. */
  trap?: string;
};

export function parseBookingPayload(raw: unknown): { ok: true; data: BookingPayload } | { ok: false; errors: FieldErrors } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, errors: { name: 'Некорректные данные' } };
  const body = raw as Record<string, unknown>;
  const text = (key: string, max = 200): string =>
    typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, max) : '';

  const values: BookingFormValues = {
    serviceSlug: text('serviceSlug', 60),
    date: text('date', 10),
    time: text('time', 5),
    carBrand: text('carBrand', MAX_CAR_FIELD * 2),
    carModel: text('carModel', MAX_CAR_FIELD * 2),
    carYear: text('carYear', 4),
    carPlate: text('carPlate', 20),
    name: text('name', MAX_NAME * 2),
    phone: text('phone', 25),
    comment: typeof body.comment === 'string' ? (body.comment as string).slice(0, MAX_COMMENT) : '',
  };

  const consent = body.consent === true;
  const errors = validateBooking(values, consent);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const utmRaw = (body.utm ?? {}) as Record<string, unknown>;
  const utmField = (key: string): string | undefined => {
    const value = utmRaw[key];
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 64) : undefined;
  };

  return {
    ok: true,
    data: {
      ...values,
      phone: normalizePhone(values.phone)!,
      carYear: values.carYear || undefined,
      carPlate: values.carPlate || undefined,
      comment: values.comment || undefined,
      consent,
      utm: { source: utmField('source'), medium: utmField('medium'), campaign: utmField('campaign') },
      trap: typeof body.trap === 'string' ? body.trap : undefined,
    },
  };
}

/** Приманка заполнена или форму отправили слишком быстро — это бот. */
export function looksLikeBot(payload: BookingPayload, elapsedMs?: number): boolean {
  if (payload.trap && payload.trap.trim().length > 0) return true;
  if (typeof elapsedMs === 'number' && elapsedMs > 0 && elapsedMs < 2000) return true;
  return false;
}
