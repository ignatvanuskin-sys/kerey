/**
 * Server-side environment access. Secrets NEVER reach the client bundle (§0.7).
 * Only `NEXT_PUBLIC_*` values may be read from client components.
 */

function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

/** Absolute public base URL without a trailing slash (used for links & the Telegram webhook). */
export function publicBaseUrl(): string {
  const raw = clean(process.env.PUBLIC_BASE_URL) ?? 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export function databaseUrl(): string {
  return clean(process.env.DATABASE_URL) ?? 'file:./data/kerey.db';
}

export function telegramBotToken(): string | undefined {
  return clean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Recipients of booking cards: owner's private chat and/or a group / second admin. */
export function telegramChatIds(): string[] {
  return (clean(process.env.TELEGRAM_CHAT_IDS) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function telegramWebhookSecret(): string | undefined {
  return clean(process.env.TELEGRAM_WEBHOOK_SECRET);
}

export function telegramBotUsername(): string | undefined {
  return clean(process.env.TELEGRAM_BOT_USERNAME)?.replace(/^@/, '');
}

/**
 * Compatibility flag (§7.6). When `false` the site only sends cards with URL buttons
 * and never calls `setWebhook` (the owner's bot already receives updates elsewhere).
 */
export function telegramCallbacksEnabled(): boolean {
  return (clean(process.env.TELEGRAM_CALLBACKS_ENABLED) ?? 'true').toLowerCase() !== 'false';
}

export function adminPassword(): string | undefined {
  return clean(process.env.ADMIN_PASSWORD);
}

export function sessionSecret(): string | undefined {
  return clean(process.env.SESSION_SECRET);
}

export function cronSecret(): string | undefined {
  return clean(process.env.CRON_SECRET);
}

export function turnstileSecretKey(): string | undefined {
  return clean(process.env.TURNSTILE_SECRET_KEY);
}

/** Personal-data retention period in days (admin-editable default = 24 months). */
export const DEFAULT_RETENTION_DAYS = 730;
