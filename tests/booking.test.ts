import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Хранилище тестов пишет в отдельный временный каталог, рабочие данные не трогает.
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerey-test-'));
process.env.KEREY_DATA_DIR = testDir;

const { createBooking, getBookings, getBooking, updateBooking, getDashboard, getAvailableSlots } = await import(
  '@/lib/booking'
);
const { addDays, todayInTz } = await import('@/lib/format');

const TODAY = todayInTz();
const DATE = addDays(TODAY, 2);

type Payload = Parameters<typeof createBooking>[0];

function payload(overrides: Partial<Payload> = {}): Payload {
  return {
    serviceSlug: 'suspension',
    date: DATE,
    time: '11:00',
    carBrand: 'Toyota',
    carModel: 'Camry',
    carYear: '2012',
    carPlate: '123ABC02',
    name: 'Асхат',
    phone: '+77052062164',
    comment: 'Стук спереди справа',
    consent: true,
    ...overrides,
  };
}

beforeAll(() => {
  // Уведомления в тестах не настроены — сервис должен работать и без них.
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_IDS;
});

describe('сервис заявок', () => {
  it('создаёт заявку со статусом NEW и номером', async () => {
    const result = await createBooking(payload());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.booking.status).toBe('NEW');
    expect(result.booking.number).toBeGreaterThan(0);
    expect(result.booking.durationMin).toBe(60);
    expect(result.booking.serviceTitle).toBe('Ремонт ходовой части');
    expect(result.booking.notification).toBeUndefined();
  });

  it('не пускает вторую заявку на то же время', async () => {
    const first = await createBooking(payload({ time: '13:00', phone: '+77021112233' }));
    const second = await createBooking(payload({ time: '13:00', phone: '+77031112233' }));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('taken');
  });

  it('отклоняет прошедшую дату и время вне сетки', async () => {
    const past = await createBooking(payload({ date: addDays(TODAY, -1), time: '11:00' }));
    const offGrid = await createBooking(payload({ time: '23:45' }));

    expect(past.ok).toBe(false);
    expect(offGrid.ok).toBe(false);
  });

  it('освобождает время, если заявку отменили', async () => {
    const created = await createBooking(payload({ time: '15:00' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const blocked = await createBooking(payload({ time: '15:00' }));
    expect(blocked.ok).toBe(false);

    await updateBooking(created.booking.id, { status: 'CANCELLED' });

    const afterCancel = await createBooking(payload({ time: '15:00' }));
    expect(afterCancel.ok).toBe(true);
  });

  it('сохраняет снимок услуги, даже если каталог потом изменится', async () => {
    const created = await createBooking(payload({ time: '16:00', serviceSlug: 'wheel-alignment' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.booking.serviceTitle).toBe('Развал-схождение');
    expect(created.booking.serviceSlug).toBe('wheel-alignment');
  });

  it('меняет статус и запоминает время изменения', async () => {
    const created = await createBooking(payload({ time: '17:00' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateBooking(created.booking.id, { status: 'CONFIRMED' });
    expect(updated?.status).toBe('CONFIRMED');
    expect(updated?.statusUpdatedAt).not.toBe(created.booking.statusUpdatedAt);
  });

  it('отдаёт список заявок, одну заявку и счётчики', async () => {
    const all = await getBookings();
    expect(all.length).toBeGreaterThan(0);
    expect(all[0].createdAt >= all[all.length - 1].createdAt).toBe(true);

    const one = await getBooking(all[0].id);
    expect(one?.id).toBe(all[0].id);
    expect(await getBooking('нет-такой-заявки')).toBeNull();

    const dashboard = await getDashboard();
    expect(dashboard.totalCount).toBe(all.length);
    expect(dashboard.newCount).toBeGreaterThanOrEqual(0);

    const today = await getBookings({ date: 'today' });
    expect(Array.isArray(today)).toBe(true);
  });

  it('фильтрует по статусу и поиску', async () => {
    const cancelled = await getBookings({ status: 'CANCELLED' });
    expect(cancelled.every((booking) => booking.status === 'CANCELLED')).toBe(true);

    const found = await getBookings({ search: 'Camry' });
    expect(found.length).toBeGreaterThan(0);

    const missing = await getBookings({ search: 'НетТакогоАвто' });
    expect(missing).toHaveLength(0);
  });

  it('показывает свободное время и занятое помечает недоступным', async () => {
    const created = await createBooking(payload({ time: '18:00' }));
    expect(created.ok).toBe(true);

    const slots = await getAvailableSlots(DATE, 'suspension');
    expect(slots.find((slot) => slot.time === '18:00')?.available).toBe(false);
    expect(slots.length).toBeGreaterThan(0);
  });
});
