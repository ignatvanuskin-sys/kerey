/**
 * Очищает список заявок (данные клиентов). Используется перед демонстрацией
 * владельцу или при переносе сайта на рабочий сервер.
 * Запуск: npm run reset
 */
import { mutateStore, readStore, storageLabel } from '@/lib/storage';

async function main(): Promise<void> {
  const before = await readStore();
  await mutateStore((store) => {
    store.bookings = [];
    store.seq = 0;
  });

  console.log(`Хранилище: ${storageLabel()}`);
  console.log(`Удалено заявок: ${before.bookings.length}`);
  console.log('Нумерация заявок начнётся заново с №0001.');
}

void main();
