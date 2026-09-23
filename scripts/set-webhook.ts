/**
 * Управление вебхуком Telegram (§7.4, §13).
 *   npm run tg:webhook          — установить вебхук
 *   npm run tg:webhook:info     — посмотреть текущий вебхук
 *   npm run tg:webhook:delete   — удалить вебхук
 *
 * Если TELEGRAM_CALLBACKS_ENABLED=false, скрипт ничего не меняет: у бота уже есть свой
 * способ получения сообщений, и второй webhook Telegram не разрешает.
 */
import { publicBaseUrl, telegramBotToken, telegramCallbacksEnabled, telegramWebhookSecret } from '@/lib/env';

const API = 'https://api.telegram.org';

async function call(method: string, payload?: Record<string, unknown>): Promise<unknown> {
  const token = telegramBotToken();
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN не задан. Добавьте токен бота из @BotFather в .env');
    process.exit(1);
  }
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const json = (await response.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!json.ok) {
    console.error(`Ошибка Telegram: ${json.description ?? 'неизвестная'}`);
    process.exit(1);
  }
  return json.result;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const base = publicBaseUrl();
  const secret = telegramWebhookSecret();

  if (args.includes('--info')) {
    const info = await call('getWebhookInfo');
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  if (args.includes('--delete')) {
    await call('deleteWebhook', { drop_pending_updates: false });
    console.log('Вебхук удалён.');
    return;
  }

  if (!telegramCallbacksEnabled()) {
    console.log(
      'TELEGRAM_CALLBACKS_ENABLED=false — вебхук не устанавливаю.\n' +
        'Сайт будет только отправлять карточки с кнопками-ссылками, статусы меняются в админке.',
    );
    return;
  }

  if (!secret) {
    console.error('TELEGRAM_WEBHOOK_SECRET не задан — вебхук без секрета ставить нельзя.');
    process.exit(1);
  }

  const url = `${base}/api/telegram/webhook`;
  const result = await call('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });

  console.log(`Вебхук установлен: ${url}`);
  console.log(JSON.stringify(result, null, 2));
  console.log('\nПроверьте: npm run tg:webhook:info');
}

void main();
