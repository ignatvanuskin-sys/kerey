/**
 * Telegram Bot API client + booking card rendering (§7).
 * Server-only: the bot token must never reach the browser bundle (§0.7).
 */
import { formatInTimeZone } from 'date-fns-tz';
import { ru } from 'date-fns/locale';
import { BUSINESS } from '@/content/business';
import { bookingNumber, escapeHtml, truncate } from '@/lib/utils';
import { formatPhone, waDigits } from '@/lib/phone';
import { TZ } from '@/lib/tz';
import type { BookingRow } from '@/db/bookings';

const API_BASE = 'https://api.telegram.org';
export const TELEGRAM_TEXT_LIMIT = 4096;
export const COMMENT_LIMIT = 500;

export type InlineKeyboardButton = { text: string; url?: string; callback_data?: string };
export type InlineKeyboard = { inline_keyboard: InlineKeyboardButton[][] };

export type TelegramResult<T> =
  | { ok: true; result: T }
  | { ok: false; error: string; retryAfter?: number; status?: number };

function botToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined;
}

/** Single entry point for Bot API calls, with a hard timeout (§7.2). */
export async function callTelegram<T = unknown>(
  method: string,
  payload: Record<string, unknown>,
  timeoutMs = 5000,
): Promise<TelegramResult<T>> {
  const token = botToken();
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN не задан' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });

    const json = (await response.json().catch(() => null)) as
      | { ok: boolean; result?: T; description?: string; parameters?: { retry_after?: number } }
      | null;

    if (!json) return { ok: false, error: `Telegram: пустой ответ (HTTP ${response.status})`, status: response.status };

    if (!json.ok) {
      const retryAfter = json.parameters?.retry_after;
      return {
        ok: false,
        error: json.description ?? `Telegram вернул ошибку (HTTP ${response.status})`,
        retryAfter,
        status: response.status,
      };
    }
    return { ok: true, result: json.result as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message.includes('abort') ? 'Telegram: таймаут запроса' : message };
  } finally {
    clearTimeout(timer);
  }
}

export function sendMessage(
  chatId: string,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<TelegramResult<{ message_id: number }>> {
  return callTelegram<{ message_id: number }>('sendMessage', {
    chat_id: chatId,
    text: truncate(text, TELEGRAM_TEXT_LIMIT),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

export function editMessageText(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<TelegramResult<unknown>> {
  return callTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: truncate(text, TELEGRAM_TEXT_LIMIT),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

export function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<TelegramResult<unknown>> {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text: truncate(text, 190) } : {}),
  });
}

/* ------------------------------- rendering ------------------------------- */

function humanStart(startAtIso: string): string {
  return formatInTimeZone(new Date(startAtIso), TZ, 'EEEEEE, d MMMM', { locale: ru });
}

function humanTime(startAtIso: string): string {
  return formatInTimeZone(new Date(startAtIso), TZ, 'HH:mm');
}

export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

export function humanCreatedStamp(createdAtIso: string): string {
  return formatInTimeZone(new Date(createdAtIso), TZ, 'dd.MM HH:mm');
}

export function carLine(booking: Pick<BookingRow, 'car_brand' | 'car_model' | 'car_year' | 'car_plate'>): string {
  const parts = [`${booking.car_brand} ${booking.car_model}`.trim()];
  if (booking.car_year) parts.push(String(booking.car_year));
  const base = parts.join(', ');
  return booking.car_plate ? `${base} · ${booking.car_plate}` : base;
}

export function contactMethodRu(method: BookingRow['contact_method']): string {
  return method === 'call' ? 'Звонок' : method === 'whatsapp' ? 'WhatsApp' : 'Telegram';
}

export function sourceLine(booking: Pick<BookingRow, 'source' | 'utm_source'>): string {
  const base = booking.source === 'admin' ? 'админка' : 'сайт';
  return booking.utm_source ? `${base} (${booking.utm_source})` : base;
}

export function ownerStatusHeader(
  booking: BookingRow,
  label: string,
  actor?: string | null,
  at?: string | null,
): string {
  const who = actor === 'owner_tg' ? 'владелец' : actor === 'client' ? 'клиент' : actor === 'admin' ? 'админка' : '';
  const stamp = at ? ` · ${humanCreatedStamp(at)}` : '';
  return `${label} · №${bookingNumber(booking.id)}${who ? ` · ${who}` : ''}${stamp}`;
}

/** Text the owner sends to the client after confirming (already URL-encoded by the caller). */
export function whatsappConfirmText(booking: Pick<BookingRow, 'client_name' | 'start_at'>): string {
  const name = booking.client_name.split(' ')[0] || booking.client_name;
  const date = formatInTimeZone(new Date(booking.start_at), TZ, 'd MMMM', { locale: ru });
  const time = humanTime(booking.start_at);
  return `Здравствуйте, ${name}! Ваша запись в «${BUSINESS.name}» на ${date} в ${time} подтверждена. Адрес: ${BUSINESS.address}, ${BUSINESS.city}. Ждём вас!`;
}

export function waLinkToClient(booking: Pick<BookingRow, 'client_phone'>, text: string): string {
  const digits = waDigits(booking.client_phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type CardOptions = {
  /** §7.6 — when callbacks are disabled the card carries URL buttons only. */
  callbacksEnabled: boolean;
  adminUrl: string;
};

/** Card for a freshly created booking (§7.3). Every user-supplied field is HTML-escaped. */
export function bookingCreatedCard(
  booking: BookingRow,
  options: CardOptions,
): { text: string; keyboard: InlineKeyboard } {
  const lines = [
    `🆕 <b>Новая запись №${bookingNumber(booking.id)}</b>`,
    '',
    `🔧 <b>Услуга:</b> ${escapeHtml(booking.service_title)}`,
    `🚗 <b>Авто:</b> ${escapeHtml(carLine(booking))}`,
    `📅 <b>Когда:</b> ${humanStart(booking.start_at)} · ${humanTime(booking.start_at)} (≈ ${humanDuration(booking.duration_min)})`,
    `👤 <b>Клиент:</b> ${escapeHtml(booking.client_name)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(formatPhone(booking.client_phone) || booking.client_phone)}`,
    `💬 <b>Связь:</b> ${contactMethodRu(booking.contact_method)}`,
  ];
  if (booking.comment) {
    lines.push(`📝 <b>Комментарий:</b> ${escapeHtml(truncate(booking.comment, COMMENT_LIMIT))}`);
  }
  lines.push(
    `🌐 <b>Источник:</b> ${escapeHtml(sourceLine(booking))}`,
    `🕒 <b>Создана:</b> ${humanCreatedStamp(booking.created_at)}`,
  );

  const confirmText = whatsappConfirmText(booking);
  const row1: InlineKeyboardButton[] = options.callbacksEnabled
    ? [
        { text: '✅ Подтвердить', callback_data: `bk:${booking.id}:ok` },
        { text: '❌ Отклонить', callback_data: `bk:${booking.id}:no` },
      ]
    : [
        { text: '💬 WhatsApp клиенту', url: waLinkToClient(booking, confirmText) },
        { text: '🛠 Открыть в админке', url: `${options.adminUrl}/admin/bookings/${booking.id}` },
      ];

  const keyboard: InlineKeyboard = {
    inline_keyboard: [
      row1,
      options.callbacksEnabled
        ? [
            { text: '💬 WhatsApp клиенту', url: waLinkToClient(booking, confirmText) },
            { text: '🛠 Открыть в админке', url: `${options.adminUrl}/admin/bookings/${booking.id}` },
          ]
        : [],
    ].filter((row) => row.length > 0),
  };

  return { text: truncate(lines.join('\n'), TELEGRAM_TEXT_LIMIT), keyboard };
}

/** Keyboard after the owner pressed a status button (§7.4). */
export function statusKeyboard(booking: BookingRow, options: CardOptions): InlineKeyboard {
  const adminButton: InlineKeyboardButton = {
    text: '🛠 Открыть в админке',
    url: `${options.adminUrl}/admin/bookings/${booking.id}`,
  };
  const whatsapp: InlineKeyboardButton = {
    text: '💬 WhatsApp клиенту',
    url: waLinkToClient(booking, whatsappConfirmText(booking)),
  };

  if (!options.callbacksEnabled) {
    return { inline_keyboard: [[whatsapp, adminButton]] };
  }

  switch (booking.status) {
    case 'new':
      return {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить', callback_data: `bk:${booking.id}:ok` },
            { text: '❌ Отклонить', callback_data: `bk:${booking.id}:no` },
          ],
          [whatsapp, adminButton],
        ],
      };
    case 'confirmed':
      return {
        inline_keyboard: [
          [
            { text: '✔️ Выполнено', callback_data: `bk:${booking.id}:done` },
            { text: '🚫 Не приехал', callback_data: `bk:${booking.id}:ns` },
            { text: '↩️ Отменить', callback_data: `bk:${booking.id}:cancel` },
          ],
          [whatsapp, adminButton],
        ],
      };
    default:
      return { inline_keyboard: [[adminButton]] };
  }
}

export type CallbackAction = 'ok' | 'no' | 'done' | 'ns' | 'cancel';

export function parseCallbackData(data: string): { bookingId: number; action: CallbackAction } | null {
  const match = /^bk:(\d+):(ok|no|done|ns|cancel)$/.exec(data);
  if (!match) return null;
  return { bookingId: Number(match[1]), action: match[2] as CallbackAction };
}

export const ACTION_TO_STATUS: Record<CallbackAction, BookingRow['status']> = {
  ok: 'confirmed',
  no: 'rejected',
  done: 'done',
  ns: 'no_show',
  cancel: 'cancelled_by_owner',
};

/** `/start` for a foreign chat reveals only its own chat id (§7.5). */
export function startMessageForStranger(chatId: number | string): string {
  return `Ваш chat_id: <code>${escapeHtml(String(chatId))}</code>. Передайте его владельцу.`;
}

export function ownerHelpMessage(): string {
  return [
    `🛠 <b>Бот автокомплекса «${BUSINESS.name}»</b>`,
    '',
    'Карточки новых записей приходят сюда автоматически. Нажмите ✅ или ❌ — статус сразу поменяется на сайте.',
    '',
    '<b>Команды:</b>',
    '/today — записи на сегодня',
    '/tomorrow — записи на завтра',
    '/new — необработанные записи',
  ].join('\n');
}
