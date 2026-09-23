/**
 * Локальная обработка очереди уведомлений (аналог /api/cron/notify для long-running сервера).
 * Запуск: npm run cron:notify
 */
import { processDueNotifications } from '@/lib/notify';
import { anonymizeExpiredBookings } from '@/db/bookings';
import { getSettings } from '@/lib/settings-store';

async function main(): Promise<void> {
  const delivery = await processDueNotifications(50);
  const anonymized = anonymizeExpiredBookings(getSettings().retention_days);
  console.log(`Обработано уведомлений: ${delivery.processed}, доставлено: ${delivery.sent}`);
  console.log(`Обезличено записей по сроку хранения: ${anonymized}`);
}

void main();
