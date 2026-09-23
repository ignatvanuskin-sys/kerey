/** Типы заявок. Отдельный файл — чтобы хранилище и сервис не зависели друг от друга циклично. */

export type BookingStatus = 'NEW' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export const BOOKING_STATUSES: BookingStatus[] = ['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  NEW: 'Новая',
  CONFIRMED: 'Подтверждена',
  COMPLETED: 'Выполнена',
  CANCELLED: 'Отменена',
};

/** Заявки в этих статусах занимают время в расписании. */
export const ACTIVE_STATUSES: BookingStatus[] = ['NEW', 'CONFIRMED'];

export type NotificationState = {
  channel: 'telegram' | 'none';
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  at: string;
};

export type BookingRecord = {
  id: string;
  /** Номер для клиента и владельца: 1 → «№0001». */
  number: number;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
  statusUpdatedAt: string;

  serviceSlug: string;
  /** Название услуги на момент заявки — чтобы прайс-лист потом можно было менять. */
  serviceTitle: string;

  /** Локальные дата и время Кокшетау. */
  date: string;
  time: string;
  durationMin: number;

  carBrand: string;
  carModel: string;
  carYear?: string;
  carPlate?: string;

  name: string;
  phone: string;
  comment?: string;

  source: 'site' | 'admin';
  utm?: { source?: string; medium?: string; campaign?: string };

  notification?: NotificationState;
};

export function bookingNumberLabel(number: number): string {
  return `№${String(number).padStart(4, '0')}`;
}
