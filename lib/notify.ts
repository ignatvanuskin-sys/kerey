/**
 * Notification outbox (§7.2).
 *
 * Flow: the booking is stored first, the notification row is created in the SAME transaction,
 * then delivery is attempted. Failures are retried with an exponential backoff and are visible
 * in the admin panel — the client always sees success once the booking is stored.
 */
import { publicBaseUrl, telegramCallbacksEnabled, telegramChatIds } from '@/lib/env';
import { sendMessage, bookingCreatedCard, statusKeyboard, ownerStatusHeader, type TelegramResult } from '@/lib/telegram';
import {
  dueNotifications,
  getBookingById,
  getNotification,
  markNotificationAttemptFailed,
  markNotificationSent,
  type BookingRow,
  type NotificationRow,
} from '@/db/bookings';
import { getSettings } from '@/lib/settings-store';

export type DeliveryOutcome = 'sent' | 'partial' | 'pending' | 'failed' | 'skipped';

function cardOptions() {
  return {
    callbacksEnabled: telegramCallbacksEnabled() && getSettings().telegram_callbacks_enabled,
    adminUrl: publicBaseUrl(),
  };
}

/**
 * Sends the card of an existing notification to every recipient.
 * Returns `sent` only when every chat accepted the message.
 */
export async function deliverNotification(notificationId: number): Promise<DeliveryOutcome> {
  const notification = getNotification(notificationId);
  if (!notification) return 'skipped';
  if (notification.status === 'sent') return 'sent';

  const booking = getBookingById(notification.booking_id);
  if (!booking) return 'failed';

  const chatIds = telegramChatIds();
  if (chatIds.length === 0) {
    markNotificationAttemptFailed(notificationId, 'TELEGRAM_CHAT_IDS не задан');
    return 'pending';
  }

  const { text, keyboard } = cardTextFor(notification, booking);

  const refs: Array<{ chat_id: string; message_id: number }> = [];
  let lastError: string | undefined;
  let retryAfter: number | undefined;

  for (const chatId of chatIds) {
    const result = await sendMessage(chatId, text, keyboard);
    if (result.ok) {
      refs.push({ chat_id: chatId, message_id: result.result.message_id });
    } else {
      lastError = result.error;
      retryAfter = result.retryAfter ?? retryAfter;
    }
  }

  if (refs.length === chatIds.length) {
    markNotificationSent(notificationId, refs);
    return 'sent';
  }

  markNotificationAttemptFailed(
    notificationId,
    lastError ?? 'Telegram: частичная доставка',
    retryAfter,
  );
  return refs.length > 0 ? 'partial' : 'pending';
}

function cardTextFor(
  notification: NotificationRow,
  booking: BookingRow,
): { text: string; keyboard: ReturnType<typeof statusKeyboard> } {
  const options = cardOptions();
  if (notification.kind === 'booking_cancelled') {
    return {
      text: truncateCard(
        [
          ownerStatusHeader(booking, '🚫 <b>Запись отменена клиентом</b>'),
          '',
          `🔧 <b>Услуга:</b> ${booking.service_title}`,
          `🚗 <b>Авто:</b> ${booking.car_brand} ${booking.car_model}`,
          `📅 <b>Была запись:</b> ${booking.start_at}`,
          `👤 <b>Клиент:</b> ${booking.client_name}`,
          `📞 <b>Телефон:</b> ${booking.client_phone}`,
          '',
          'Слот освобождён — время снова доступно для записи.',
        ].join('\n'),
      ),
      keyboard: statusKeyboard(booking, options),
    };
  }

  const card = bookingCreatedCard(booking, options);
  return { text: card.text, keyboard: card.keyboard };
}

function truncateCard(text: string): string {
  return text.length > 4096 ? `${text.slice(0, 4095)}…` : text;
}

/** Retry worker: called by `/api/cron/notify` or by the in-process fallback. */
export async function processDueNotifications(limit = 20): Promise<{ processed: number; sent: number }> {
  const due = dueNotifications(new Date(), limit);
  let sent = 0;
  for (const notification of due) {
    const outcome = await deliverNotification(notification.id);
    if (outcome === 'sent') sent += 1;
  }
  return { processed: due.length, sent };
}

/** Fire-and-forget attempt right after the booking was stored (client never waits for Telegram). */
export async function tryDeliverNow(notificationId: number): Promise<DeliveryOutcome> {
  if (notificationId <= 0) return 'skipped';
  try {
    return await deliverNotification(notificationId);
  } catch {
    return 'pending';
  }
}

/** Admin panel: «Прислать тестовое сообщение» (§7.7). */
export async function sendTestMessage(): Promise<TelegramResult<{ message_id: number }>[]> {
  const chatIds = telegramChatIds();
  const results: TelegramResult<{ message_id: number }>[] = [];
  for (const chatId of chatIds) {
    results.push(
      await sendMessage(
        chatId,
        '✅ <b>Проверка связи</b>\nЭто тестовое сообщение из админки сайта автокомплекса «Керей».',
      ),
    );
  }
  return results;
}
