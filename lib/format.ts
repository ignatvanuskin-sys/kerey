/**
 * Дата и время. Компания работает в Кокшетау — это часовой пояс UTC+5 (Asia/Almaty,
 * в карточке 2ГИС указан timezone_offset 300). Все даты на сайте считаются и
 * показываются в этом поясе, независимо от пояса устройства посетителя.
 */

export const TZ = 'Asia/Almaty';
const DAY_MS = 86_400_000;

/** Текущие дата и «минуты от начала суток» в поясе Кокшетау. */
export function nowInTz(now: Date = new Date()): { date: string; minutes: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));

  return {
    date,
    minutes: hour * 60 + minute,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export function todayInTz(now: Date = new Date()): string {
  return nowInTz(now).date;
}

function toUtcDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(dateStr: string, days: number): string {
  const next = new Date(toUtcDate(dateStr).getTime() + days * DAY_MS);
  return next.toISOString().slice(0, 10);
}

/** Разница в календарных днях: b − a. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / DAY_MS);
}

export function minutesFromHHMM(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function hhmmFromMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

/**
 * «26 сентября, суббота».
 * Порядок слов собираем сами: ICU в разных версиях ставит день недели то первым, то последним.
 */
export function humanDate(dateStr: string): string {
  const date = toUtcDate(dateStr);
  const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' });
  return `${dayMonth}, ${weekday}`;
}

/** «26 сентября» */
export function humanDateShort(dateStr: string): string {
  return toUtcDate(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

/** «пт» */
export function weekdayShort(dateStr: string): string {
  return toUtcDate(dateStr).toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
}

/** «26.09» */
export function dayMonth(dateStr: string): string {
  return toUtcDate(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

/** «Сегодня» / «Завтра» / «Послезавтра» / «сб» */
export function relativeDayLabel(dateStr: string, today = todayInTz()): string {
  const offset = diffDays(today, dateStr);
  if (offset === 0) return 'Сегодня';
  if (offset === 1) return 'Завтра';
  if (offset === 2) return 'Послезавтра';
  return weekdayShort(dateStr);
}

export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

/** «07.09.2026» */
export function humanIsoDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  });
}

export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** «132 отзыва», «201 оценка», «1 отзыв» */
export function reviewsWord(count: number): string {
  return `${count} ${plural(count, 'отзыв', 'отзыва', 'отзывов')}`;
}

export function ratingsWord(count: number): string {
  return `${count} ${plural(count, 'оценка', 'оценки', 'оценок')}`;
}
