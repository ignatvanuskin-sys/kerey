/**
 * Телефон. Принимаем казахстанские и российские номера и приводим их к виду +7XXXXXXXXXX.
 * Всё, что не похоже на номер, отклоняется — иначе в заявке окажется «12345».
 */

const E164 = /^\+7\d{10}$/;

/** Возвращает +7XXXXXXXXXX или null, если номер неверный. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D+/g, '');
  if (!digits) return null;

  let national: string | null = null;
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('7')) {
    national = digits.slice(1);
  }

  if (!national) return null;
  // Мобильные и городские диапазоны KZ/RU: 6xx, 7xx, 9xx.
  if (!/^[679]\d{9}$/.test(national)) return null;

  const e164 = `+7${national}`;
  return E164.test(e164) ? e164 : null;
}

/** +77052062164 → «+7 705 206 21 64» */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const digits = e164.replace(/\D+/g, '');
  if (digits.length !== 11) return e164;
  const n = digits.slice(1);
  return `+7 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)}`;
}

/** Цифры для ссылок wa.me */
export function waDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D+/g, '');
}

/** Маска для ввода: «+7 (705) 206-21-64» */
export function maskPhoneInput(raw: string): string {
  let digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const n = digits.slice(1);
  let out = '+7';
  if (n.length > 0) out += ` (${n.slice(0, 3)}`;
  if (n.length >= 3) out += ')';
  if (n.length > 3) out += ` ${n.slice(3, 6)}`;
  if (n.length > 6) out += `-${n.slice(6, 8)}`;
  if (n.length > 8) out += `-${n.slice(8, 10)}`;
  return out;
}

/** Телефоны клиентов не должны попадать в логи в открытом виде. */
export function maskPhoneForLog(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D+/g, '');
  if (digits.length < 8) return '***';
  return `+${digits.slice(0, 4)}***${digits.slice(-4)}`;
}
