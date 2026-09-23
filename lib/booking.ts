/**
 * СЕРВИС ЗАЯВОК — единственное место, где создаются и меняются записи.
 *
 * API сервиса (используется страницами и админкой):
 *   createBooking(input)   — создать заявку с проверкой свободного времени
 *   getBookings(filter)    — список заявок для панели
 *   getBooking(id)         — одна заявка
 *   updateBooking(id, …)   — смена статуса и данных клиента
 *   getDashboard()         — счётчики для панели
 *   getAvailableSlots(…)   — свободное время для формы записи
 *
 * Точки расширения (подключаются без переписывания логики):
 *   • Telegram-уведомления — lib/telegram.ts, включаются переменными окружения;
 *   • CRM / WhatsApp / внешний backend — обернуть createBooking или заменить lib/storage.ts
 *     на вызовы нужного API (интерфейс сервиса при этом не меняется).
 *
 * Файл серверный: node:crypto и файловая система. В клиентские компоненты не импортировать.
 */
import { randomUUID } from 'node:crypto';
import { ACTIVE_STATUSES, type BookingRecord, type BookingStatus, BOOKING_STATUSES } from './booking-types';
import { mutateStore, readStore } from './storage';
import { durationForService, type BookingPayload } from './validation';
import {
  BOOKING_HORIZON_DAYS,
  dateHasFreeSlots,
  slotAvailability,
  slotsForDate,
  type BusyInterval,
  type Slot,
} from './slots';
import { addDays, diffDays, todayInTz } from './format';
import { notifyNewBooking } from './telegram';

export type { BookingRecord, BookingStatus } from './booking-types';
export { ACTIVE_STATUSES, BOOKING_STATUSES, bookingNumberLabel, STATUS_LABELS } from './booking-types';

export type CreateBookingResult =
  | { ok: true; booking: BookingRecord }
  | { ok: false; reason: 'taken' | 'past' | 'closed' | 'wrong_time' | 'storage' };

/** Интервалы занятости: считаются только активные заявки (новая и подтверждённая). */
export async function getBusyIntervals(): Promise<BusyInterval[]> {
  const store = await readStore();
  return store.bookings
    .filter((booking) => ACTIVE_STATUSES.includes(booking.status))
    .map((booking) => ({ date: booking.date, time: booking.time, durationMin: booking.durationMin }));
}

export async function getAvailableSlots(date: string, serviceSlug: string): Promise<Slot[]> {
  const busy = await getBusyIntervals();
  return slotsForDate(date, durationForService(serviceSlug), busy);
}

export async function getDatesAvailability(
  serviceSlug: string,
): Promise<Array<{ date: string; hasFreeSlots: boolean }>> {
  const busy = await getBusyIntervals();
  const durationMin = durationForService(serviceSlug);
  const today = todayInTz();

  return Array.from({ length: BOOKING_HORIZON_DAYS + 1 }, (_, index) => {
    const date = addDays(today, index);
    return { date, hasFreeSlots: dateHasFreeSlots(date, durationMin, busy) };
  });
}

export async function createBooking(
  payload: BookingPayload,
  options: { source?: 'site' | 'admin' } = {},
): Promise<CreateBookingResult> {
  const durationMin = durationForService(payload.serviceSlug);

  type MutationResult = { ok: true; booking: BookingRecord } | { ok: false; reason: 'taken' | 'past' | 'closed' | 'wrong_time' };

  let created: MutationResult;
  try {
    created = (await mutateStore((store) => {
    // Проверку делаем внутри блокировки: два одновременных запроса на один слот
    // не смогут оба пройти дальше.
    const busy: BusyInterval[] = store.bookings
      .filter((booking) => ACTIVE_STATUSES.includes(booking.status))
      .map((booking) => ({ date: booking.date, time: booking.time, durationMin: booking.durationMin }));

    const availability = slotAvailability(payload.date, payload.time, payload.serviceSlug, busy);
    if (!availability.ok) return { ok: false as const, reason: availability.reason };

    store.seq += 1;
    const now = new Date().toISOString();
    const serviceTitle =
      // заголовок сохраняем снимком: каталог услуг может измениться позже
      payload.serviceSlug === 'unknown' ? 'Не знаю, что сломалось' : titleForSlug(payload.serviceSlug);

    const booking: BookingRecord = {
      id: randomUUID(),
      number: store.seq,
      createdAt: now,
      updatedAt: now,
      status: 'NEW',
      statusUpdatedAt: now,
      serviceSlug: payload.serviceSlug,
      serviceTitle,
      date: payload.date,
      time: payload.time,
      durationMin,
      carBrand: payload.carBrand,
      carModel: payload.carModel,
      carYear: payload.carYear,
      carPlate: payload.carPlate,
      name: payload.name,
      phone: payload.phone,
      comment: payload.comment,
      source: options.source ?? 'site',
      utm: payload.utm,
    };

      store.bookings.push(booking);
      return { ok: true as const, booking };
    })) as MutationResult;
  } catch (error) {
    // Хранилище недоступно (например, не подключена база на serverless-хостинге).
    console.error('[booking] хранилище недоступно:', error instanceof Error ? error.message : error);
    return { ok: false, reason: 'storage' };
  }

  if (!created.ok) return created;

  // Уведомление владельцу — после сохранения заявки. Ошибка уведомления не отменяет запись.
  const notification = await notifyNewBooking(created.booking);
  if (notification) {
    try {
      await mutateStore((store) => {
        const target = store.bookings.find((item) => item.id === created.booking.id);
        if (target) {
          target.notification = notification;
          target.updatedAt = new Date().toISOString();
        }
      });
    } catch {
      // отметку о доставке сохранить не удалось — сама заявка уже записана, это не критично
    }
  }

  return { ok: true, booking: { ...created.booking, notification: notification ?? undefined } };
}

function titleForSlug(slug: string): string {
  // Локальный импорт каталога, чтобы не тянуть его в клиентский бандл через validation
  const titles: Record<string, string> = {
    suspension: 'Ремонт ходовой части',
    engine: 'Ремонт бензиновых двигателей',
    'wheel-alignment': 'Развал-схождение',
    'spare-parts': 'Запчасти для иномарок',
    'car-service': 'Ремонт и обслуживание легковых авто',
    unknown: 'Не знаю, что сломалось',
  };
  return titles[slug] ?? 'Ремонт и обслуживание';
}

export type BookingFilter = {
  status?: BookingStatus | 'ALL';
  /** Дата в формате YYYY-MM-DD или 'today' / 'tomorrow'. */
  date?: string;
  search?: string;
};

export async function getBookings(filter: BookingFilter = {}): Promise<BookingRecord[]> {
  const store = await readStore();
  const today = todayInTz();
  const dateFilter =
    filter.date === 'today' ? today : filter.date === 'tomorrow' ? addDays(today, 1) : filter.date;

  const search = filter.search?.trim().toLowerCase();

  return store.bookings
    .filter((booking) => (filter.status && filter.status !== 'ALL' ? booking.status === filter.status : true))
    .filter((booking) => (dateFilter ? booking.date === dateFilter : true))
    .filter((booking) => {
      if (!search) return true;
      return `${booking.name} ${booking.phone} ${booking.carBrand} ${booking.carModel} ${booking.serviceTitle}`
        .toLowerCase()
        .includes(search);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBooking(id: string): Promise<BookingRecord | null> {
  const store = await readStore();
  return store.bookings.find((booking) => booking.id === id) ?? null;
}

export async function updateBooking(
  id: string,
  patch: { status?: BookingStatus; comment?: string; date?: string; time?: string },
): Promise<BookingRecord | null> {
  const updated = await mutateStore((store) => {
    const booking = store.bookings.find((item) => item.id === id);
    if (!booking) return null;

    if (patch.status && BOOKING_STATUSES.includes(patch.status)) {
      booking.status = patch.status;
      booking.statusUpdatedAt = new Date().toISOString();
    }
    if (typeof patch.comment === 'string') booking.comment = patch.comment.slice(0, 500);
    if (patch.date) booking.date = patch.date;
    if (patch.time) booking.time = patch.time;

    booking.updatedAt = new Date().toISOString();
    return { ...booking };
  });

  return updated;
}

export type Dashboard = {
  newCount: number;
  todayCount: number;
  weekCount: number;
  totalCount: number;
};

export async function getDashboard(): Promise<Dashboard> {
  const store = await readStore();
  const today = todayInTz();
  const weekEnd = addDays(today, 7);

  return {
    newCount: store.bookings.filter((booking) => booking.status === 'NEW').length,
    todayCount: store.bookings.filter(
      (booking) => booking.date === today && ACTIVE_STATUSES.includes(booking.status),
    ).length,
    weekCount: store.bookings.filter((booking) => {
      const offset = diffDays(today, booking.date);
      return offset >= 0 && offset <= 7 && booking.status !== 'CANCELLED';
    }).length,
    totalCount: store.bookings.length,
  };
}
