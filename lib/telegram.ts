/**
 * Уведомления владельцу в Telegram.
 *
 * Интеграция необязательная: пока TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_IDS пустые,
 * функция возвращает null, и заявка просто сохраняется в панели /admin.
 * Заполнили переменные — уведомления включаются без изменений в коде.
 *
 * Чтобы подключить вместо Telegram что-то другое (CRM, WhatsApp, почту),
 * достаточно добавить рядом свой модуль и вызвать его в lib/booking.ts вместо notifyNewBooking.
 */
import { bookingNumberLabel, type BookingRecord, type NotificationState } from './booking-types';
import { formatPhone } from './phone';
import { humanDate, humanDuration } from './format';

const API = 'https://api.telegram.org';

function botToken(): string | undefined {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token ? token : undefined;
}

function chatIds(): string[] {
  return (process.env.TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function telegramConfigured(): boolean {
  return Boolean(botToken()) && chatIds().length > 0;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Текст карточки заявки для владельца. Все данные клиента экранируются. */
export function bookingMessage(booking: BookingRecord): string {
  const lines = [
    `🆕 <b>Новая заявка ${bookingNumberLabel(booking.number)}</b>`,
    '',
    `🔧 <b>Услуга:</b> ${escapeHtml(booking.serviceTitle)}`,
    `🚗 <b>Авто:</b> ${escapeHtml(`${booking.carBrand} ${booking.carModel}`.trim())}${
      booking.carYear ? `, ${escapeHtml(booking.carYear)}` : ''
    }${booking.carPlate ? ` · ${escapeHtml(booking.carPlate)}` : ''}`,
    `📅 <b>Когда:</b> ${escapeHtml(humanDate(booking.date))}, ${booking.time} (≈ ${humanDuration(booking.durationMin)})`,
    `👤 <b>Клиент:</b> ${escapeHtml(booking.name)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(formatPhone(booking.phone) || booking.phone)}`,
  ];

  if (booking.comment) lines.push(`📝 <b>Комментарий:</b> ${escapeHtml(booking.comment)}`);
  if (booking.utm?.source) lines.push(`🌐 <b>Источник:</b> ${escapeHtml(booking.utm.source)}`);

  return lines.join('\n');
}

async function sendMessage(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = botToken();
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN не задан' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: controller.signal,
      cache: 'no-store',
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!json?.ok) return { ok: false, error: json?.description ?? `HTTP ${response.status}` };
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message.includes('abort') ? 'таймаут запроса' : message };
  } finally {
    clearTimeout(timer);
  }
}

/** Отправляет карточку заявки. Никогда не бросает исключение: сбой уведомления не должен ломать запись. */
export async function notifyNewBooking(booking: BookingRecord): Promise<NotificationState | null> {
  if (!telegramConfigured()) return null;

  const recipients = chatIds();
  const text = bookingMessage(booking);
  const errors: string[] = [];
  let sent = 0;

  for (const chatId of recipients) {
    const result = await sendMessage(chatId, text);
    if (result.ok) sent += 1;
    else if (result.error) errors.push(result.error);
  }

  return {
    channel: 'telegram',
    status: sent === recipients.length ? 'sent' : sent > 0 ? 'sent' : 'failed',
    error: errors.length ? errors.join('; ').slice(0, 300) : undefined,
    at: new Date().toISOString(),
  };
}
