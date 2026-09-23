'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Save, Send } from 'lucide-react';
import type { Settings } from '@/lib/settings';
import { AdminCard, AdminField, Notice, Skeleton, Toggle } from '@/components/admin/ui';

type TelegramStatus = {
  chatIds: number;
  tokenConfigured: boolean;
  callbacksEnabled: boolean;
  webhookConfigured: boolean;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [settingsResponse, telegramResponse] = await Promise.all([
      fetch('/api/admin/settings', { cache: 'no-store' }),
      fetch('/api/admin/telegram', { cache: 'no-store' }),
    ]);
    const config = (await settingsResponse.json()) as { settings?: Settings };
    const status = (await telegramResponse.json()) as TelegramStatus;
    setSettings(config.settings ?? null);
    setTelegram(status);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(payload: Record<string, unknown>, text: string) {
    setBusy(true);
    setNotice(null);
    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!response.ok) {
      setNotice({ kind: 'error', text: 'Не удалось сохранить настройку.' });
      return;
    }
    setNotice({ kind: 'success', text });
    await load();
  }

  async function testTelegram() {
    setBusy(true);
    setNotice(null);
    const response = await fetch('/api/admin/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' }),
    });
    const data = (await response.json()) as { ok?: boolean; delivered?: number; total?: number; error?: string; errors?: string[] };
    setBusy(false);
    if (!response.ok || !data.ok) {
      setNotice({ kind: 'error', text: data.error ?? 'Не удалось отправить тестовое сообщение.' });
      return;
    }
    setNotice({
      kind: data.delivered === data.total ? 'success' : 'error',
      text:
        data.delivered === data.total
          ? `Тестовое сообщение доставлено (${data.delivered}/${data.total}).`
          : `Доставлено ${data.delivered}/${data.total}. Ошибки: ${(data.errors ?? []).join('; ')}`,
    });
  }

  if (!settings || !telegram) {
    return (
      <div className="grid gap-3">
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}

      <AdminCard
        title="Telegram"
        actions={
          <button type="button" className="btn btn-primary !min-h-[40px] !px-4 text-[14px]" disabled={busy} onClick={() => void testTelegram()}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            Прислать тестовое сообщение
          </button>
        }
      >
        <ul className="grid gap-2 text-[15px]">
          <li>
            Токен бота:{' '}
            <b className={telegram.tokenConfigured ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
              {telegram.tokenConfigured ? 'задан' : 'не задан'}
            </b>
          </li>
          <li>
            Получателей карточек: <b>{telegram.chatIds}</b>
            {telegram.chatIds === 0 ? ' — добавьте TELEGRAM_CHAT_IDS' : ''}
          </li>
          <li>
            Секрет вебхука:{' '}
            <b className={telegram.webhookConfigured ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
              {telegram.webhookConfigured ? 'задан' : 'не задан'}
            </b>
          </li>
        </ul>

        <div className="mt-3 border-t border-[var(--color-line)] pt-3">
          <Toggle
            checked={settings.telegram_callbacks_enabled}
            onChange={(value) =>
              void patch(
                { telegram_callbacks_enabled: value },
                value
                  ? 'Кнопки в Telegram включены.'
                  : 'Кнопки в Telegram выключены: карточки приходят со ссылками, статусы меняются в админке.',
              )
            }
            label="Обрабатывать кнопки ✅/❌ прямо в Telegram"
          />
          <p className="hint mt-2">
            Выключите, если у бота владельца уже настроен свой webhook или бот работает в другом сервисе (Telegram
            разрешает только один способ получения сообщений). Тогда сайт только отправляет карточки с кнопками-ссылками.
          </p>
        </div>
      </AdminCard>

      <AdminCard title="Хранение персональных данных">
        <div className="grid gap-3 sm:grid-cols-[220px_auto] sm:items-end">
          <AdminField label="Срок хранения, дней" htmlFor="retention" hint="После этого срока личные данные обезличиваются автоматически.">
            <input
              id="retention"
              className="field"
              inputMode="numeric"
              value={String(settings.retention_days)}
              onChange={(event) =>
                setSettings({ ...settings, retention_days: Number(event.target.value.replace(/\D/g, '')) || 730 })
              }
            />
          </AdminField>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void patch({ retention_days: settings.retention_days }, 'Срок хранения сохранён.')}
          >
            <Save className="size-5" aria-hidden="true" />
            Сохранить
          </button>
        </div>
      </AdminCard>

      <AdminCard title="Как это работает">
        <ul className="grid gap-2 text-[15px] text-[var(--color-muted)]">
          <li>• Новая запись приходит в Telegram в течение нескольких секунд после отправки формы.</li>
          <li>• Если Telegram недоступен, карточка отправляется повторно автоматически; в списке записей видно статус доставки.</li>
          <li>• Изменения услуг, графика и выходных применяются сразу — перезапуск не нужен.</li>
          <li>• Телефоны клиентов и комментарии после срока хранения обезличиваются.</li>
        </ul>
      </AdminCard>
    </div>
  );
}
