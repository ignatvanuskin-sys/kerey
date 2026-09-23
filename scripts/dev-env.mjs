/**
 * Создаёт локальный .env со случайными секретами (файл в .gitignore).
 * Запуск: npm run env:init
 * Существующий .env не перезаписывается.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), '.env');

if (fs.existsSync(target)) {
  console.log('.env уже существует — ничего не меняю.');
  process.exit(0);
}

const random = () => crypto.randomBytes(24).toString('hex');

const content = `# Локальная разработка. Файл создан автоматически, в git не попадает.
DATABASE_URL=file:./data/kerey.db
PUBLIC_BASE_URL=http://localhost:3000

# Заполните после создания бота у @BotFather (см. README).
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_IDS=
TELEGRAM_WEBHOOK_SECRET=${random()}
TELEGRAM_CALLBACKS_ENABLED=true
TELEGRAM_BOT_USERNAME=

# Пароль владельца для входа в /admin. Смените на свой.
ADMIN_PASSWORD=${crypto.randomBytes(6).toString('base64url')}
SESSION_SECRET=${random()}
CRON_SECRET=${random()}

TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_YM_ID=
NEXT_PUBLIC_GA_ID=
`;

fs.writeFileSync(target, content, 'utf8');
console.log('Создан .env со случайными секретами.');
console.log('Пароль для входа в админку смотрите в строке ADMIN_PASSWORD.');
