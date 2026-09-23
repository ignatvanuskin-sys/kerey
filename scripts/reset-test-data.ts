/**
 * ВНИМАНИЕ: удаляет все записи, уведомления и счётчики ограничений.
 * Нужен только для тестового контура — вызывается перед `npm run smoke`.
 * Услуги, настройки, отзывы и фото не затрагиваются.
 * Запуск: npx tsx scripts/reset-test-data.ts
 */
import { getDb } from '@/db/client';

const db = getDb();

const tx = db.transaction(() => {
  const notifications = db.prepare('DELETE FROM notifications').run().changes;
  const bookings = db.prepare('DELETE FROM bookings').run().changes;
  db.prepare('DELETE FROM day_locks').run();
  const limits = db.prepare('DELETE FROM rate_limits').run().changes;
  const audit = db.prepare('DELETE FROM audit_log').run().changes;
  return { notifications, bookings, limits, audit };
});

const result = tx.immediate();

console.log(
  `Тестовые данные удалены: записи ${result.bookings}, уведомления ${result.notifications}, ` +
    `счётчики ${result.limits}, журнал ${result.audit}.`,
);
console.log('Услуги, настройки, отзывы и фото сохранены.');
