/**
 * Сбрасывает счётчики ограничений (записи с одного IP, вход в админку).
 * Нужно, если владелец заблокировал себя или если подряд запускаются smoke-тесты.
 * Запуск: npm run db:clear-limits
 */
import { getDb } from '@/db/client';

const info = getDb().prepare('DELETE FROM rate_limits').run();
console.log(`Счётчики ограничений сброшены (удалено записей: ${info.changes}).`);
