/**
 * Создаёт локальный .env со случайным паролем для панели заявок.
 * Запуск: npm run env:init (существующий .env не перезаписывается).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), '.env');

if (fs.existsSync(target)) {
  console.log('.env уже существует — ничего не меняю.');
  process.exit(0);
}

const password = crypto.randomBytes(6).toString('base64url');
const secret = crypto.randomBytes(24).toString('hex');

fs.writeFileSync(
  target,
  `# Локальная конфигурация. Файл в .gitignore, в репозиторий не попадает.
PUBLIC_BASE_URL=http://localhost:3000

# Пароль для входа в панель заявок /admin
ADMIN_PASSWORD=${password}
SESSION_SECRET=${secret}

# Уведомления в Telegram (необязательно): создайте бота у @BotFather
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_IDS=
`,
  'utf8',
);

console.log('Создан .env');
console.log(`Пароль для входа в /admin: ${password}`);
