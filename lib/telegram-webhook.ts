/**
 * Telegram update handling (§7.4, §7.5).
 * Every mutation is authorised against the `TELEGRAM_CHAT_IDS` whitelist and is idempotent.
 */
import {
  bookingsToday,
  changeBookingStatus,
  getBookingById,
  getBookingByToken,
  bindClientChat,
  listBookings,
  messageRefsForBooking,
  type BookingRow,
} from '@/db/bookings';
import { telegramChatIds } from '@/lib/env';
import {
  ACTION_TO_STATUS,
  answerCallbackQuery,
  bookingCreatedCard,
  editMessageText,
  ownerHelpMessage,
  ownerStatusHeader,
  parseCallbackData,
  sendMessage,
  startMessageForStranger,
  statusKeyboard,
} from '@/lib/telegram';
import { statusLabelRu } from '@/lib/availability';
import { formatLocal, addLocalDays, localDate } from '@/lib/tz';
import { bookingNumber } from '@/lib/utils';
import { audit } from '@/lib/settings-store';
import { publicBaseUrl } from '@/lib/env';

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string };
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
};

type HandlerDeps = { chatIds: string[]; baseUrl: string };

function deps(): HandlerDeps {
  return { chatIds: telegramChatIds(), baseUrl: publicBaseUrl() };
}

function isWhitelisted(userId: number | undefined, chatId: number | undefined, chatIds: string[]): boolean {
  if (userId !== undefined && chatIds.includes(String(userId))) return true;
  if (chatId !== undefined && chatIds.includes(String(chatId))) return true;
  return false;
}

function cardOptions() {
  return {
    // The compatibility flag is applied by lib/notify; callbacks themselves stay enabled here.
    callbacksEnabled: true,
    adminUrl: deps().baseUrl,
  };
}

/** Rebuilds the card text with a status header (the original card is not stored). */
function statusCardText(booking: BookingRow): string {
  const { text } = bookingCreatedCard(booking, cardOptions());
  const lines = text.split('\n');
  lines[0] = ownerStatusHeader(
    booking,
    statusEmojiAndLabel(booking.status),
    booking.status_changed_by,
    booking.status_changed_at,
  );
  return lines.join('\n');
}

function statusEmojiAndLabel(status: BookingRow['status']): string {
  switch (status) {
    case 'confirmed':
      return '✅ <b>Подтверждена</b>';
    case 'rejected':
      return '❌ <b>Отклонена</b>';
    case 'done':
      return '✔️ <b>Выполнена</b>';
    case 'no_show':
      return '🚫 <b>Клиент не приехал</b>';
    case 'cancelled_by_owner':
      return '↩️ <b>Отменена сервисом</b>';
    case 'cancelled_by_client':
      return '🚫 <b>Отменена клиентом</b>';
    default:
      return '🆕 <b>Новая запись</b>';
  }
}

function bookingLine(booking: BookingRow): string {
  const time = formatLocal(booking.start_at, 'HH:mm');
  return `${time} · №${bookingNumber(booking.id)} · ${booking.service_title} · ${booking.car_brand} ${booking.car_model} · ${booking.client_name} · ${booking.client_phone} · ${statusLabelRu(booking.status)}`;
}

function listForDate(localDateStr: string, title: string): string {
  const bookings = bookingsToday(localDateStr).filter(
    (b) => b.status === 'new' || b.status === 'confirmed',
  );
  if (bookings.length === 0) return `<b>${title}</b>\nЗаписей нет.`;
  return [`<b>${title}</b>`, ...bookings.map(bookingLine)].join('\n');
}

/* ------------------------------- callback -------------------------------- */

async function handleCallback(
  query: NonNullable<TelegramUpdate['callback_query']>,
  d: HandlerDeps,
): Promise<void> {
  const authorized = isWhitelisted(query.from?.id, query.message?.chat?.id, d.chatIds);
  if (!authorized) {
    // Silently ignore taps from anyone outside the whitelist (§7.4, QA 6).
    await answerCallbackQuery(query.id);
    return;
  }

  const parsed = query.data ? parseCallbackData(query.data) : null;
  if (!parsed) {
    await answerCallbackQuery(query.id, 'Неизвестное действие');
    return;
  }

  const booking = getBookingById(parsed.bookingId);
  if (!booking) {
    await answerCallbackQuery(query.id, 'Запись не найдена');
    return;
  }

  const nextStatus = ACTION_TO_STATUS[parsed.action];
  const result = changeBookingStatus(booking.id, nextStatus, 'owner_tg');
  const updated = result.booking ?? booking;

  await answerCallbackQuery(
    query.id,
    result.changed ? `Готово: ${statusLabelRu(updated.status)}` : 'Уже обработано',
  );

  if (!result.changed) return;

  audit(`status:${updated.status}`, 'owner_tg', updated.id);

  const text = statusCardText(updated);
  const keyboard = statusKeyboard(updated, cardOptions());
  const refs = messageRefsForBooking(updated.id);

  // Edit only the message the owner tapped; other recipients keep their own copy in sync too.
  for (const ref of refs) {
    await editMessageText(ref.chat_id, ref.message_id, text, keyboard);
  }

  if (updated.tg_chat_id) {
    await sendMessage(
      updated.tg_chat_id,
      `Ваша запись №${bookingNumber(updated.id)} в «Керей»: <b>${statusLabelRu(updated.status)}</b>.`,
    );
  }
}

/* -------------------------------- message -------------------------------- */

async function handleMessage(message: NonNullable<TelegramUpdate['message']>, d: HandlerDeps): Promise<void> {
  const text = (message.text ?? '').trim();
  const chatId = message.chat.id;
  const authorized = isWhitelisted(message.from?.id, chatId, d.chatIds);

  if (text.startsWith('/start')) {
    const payload = text.split(/\s+/)[1] ?? '';
    if (payload.startsWith('b_')) {
      const token = payload.slice(2);
      const booking = getBookingByToken(token);
      if (booking) {
        bindClientChat(token, String(chatId));
        await sendMessage(
          String(chatId),
          `Готово! Будем присылать сюда статус вашей записи №${bookingNumber(booking.id)}.`,
        );
        return;
      }
      await sendMessage(String(chatId), 'Ссылка на запись не найдена. Проверьте её на сайте.');
      return;
    }

    if (authorized) {
      await sendMessage(String(chatId), ownerHelpMessage());
    } else {
      await sendMessage(String(chatId), startMessageForStranger(chatId));
    }
    return;
  }

  if (!authorized) {
    // Unknown chat: reveal nothing but the chat id.
    await sendMessage(String(chatId), startMessageForStranger(chatId));
    return;
  }

  const today = localDate();
  if (text.startsWith('/today')) {
    await sendMessage(String(chatId), listForDate(today, `Записи на сегодня (${formatLocal(new Date(), 'd MMMM')})`));
    return;
  }
  if (text.startsWith('/tomorrow')) {
    const tomorrow = addLocalDays(today, 1);
    await sendMessage(String(chatId), listForDate(tomorrow, `Записи на завтра (${formatLocal(new Date(), 'd MMMM')})`));
    return;
  }
  if (text.startsWith('/new')) {
    const pending = listBookings({ status: 'new', limit: 50 }).sort((a, b) => a.start_at.localeCompare(b.start_at));
    await sendMessage(
      String(chatId),
      pending.length === 0
        ? '<b>Необработанные записи</b>\nВсе записи обработаны.'
        : [`<b>Необработанные записи</b>`, ...pending.map(bookingLine)].join('\n'),
    );
    return;
  }

  await sendMessage(String(chatId), ownerHelpMessage());
}

/** Entry point used by `POST /api/telegram/webhook`. */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const d = deps();
  if (update.callback_query) {
    await handleCallback(update.callback_query, d);
    return;
  }
  if (update.message) {
    await handleMessage(update.message, d);
  }
}
