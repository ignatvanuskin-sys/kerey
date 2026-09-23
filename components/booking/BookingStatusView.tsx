'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Clock, LoaderCircle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusPayload = {
  number: string;
  status: string;
  statusLabel: string;
  serviceTitle: string;
  car: string;
  clientFirstName: string;
  startAt: string;
  endAt: string;
  address: string;
  canCancel: boolean;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Almaty',
  });
}

const STATUS_STYLES: Record<string, string> = {
  new: 'text-[var(--color-accent)]',
  confirmed: 'text-[var(--color-success)]',
  rejected: 'text-[var(--color-danger)]',
  cancelled_by_client: 'text-[var(--color-muted)]',
  cancelled_by_owner: 'text-[var(--color-muted)]',
  no_show: 'text-[var(--color-danger)]',
  done: 'text-[var(--color-success)]',
};

/** Public booking status page (§6.4): polls every 30 seconds. */
export default function BookingStatusView({ token, initial }: { token: string; initial: StatusPayload }) {
  const [data, setData] = useState<StatusPayload>(initial);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${token}`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as StatusPayload & { ok?: boolean };
      setData(payload);
    } catch {
      // network hiccup — keep the last known state
    }
  }, [token]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${token}/cancel`, { method: 'POST' });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Не удалось отменить запись.');
        return;
      }
      await refresh();
      setConfirming(false);
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <p className="hint">Запись №{data.number}</p>
        <h1 className="mt-1 text-[24px] font-extrabold">
          <span className={cn(STATUS_STYLES[data.status] ?? '')}>{data.statusLabel}</span>
        </h1>
        <p className="mt-2 text-[15px] text-[var(--color-muted)]">
          {data.clientFirstName}, ниже — детали вашей записи. Статус обновляется автоматически.
        </p>

        <dl className="mt-4 grid gap-2 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Услуга</dt>
            <dd className="text-right font-semibold">{data.serviceTitle}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Авто</dt>
            <dd className="text-right font-semibold">{data.car}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">
              <Clock className="inline size-4" aria-hidden="true" /> Когда
            </dt>
            <dd className="text-right font-semibold">{formatWhen(data.startAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">
              <MapPin className="inline size-4" aria-hidden="true" /> Адрес
            </dt>
            <dd className="text-right font-semibold">{data.address}</dd>
          </div>
        </dl>

        <p className="hint mt-3">Время указано по Кокшетау.</p>

        {error ? (
          <p role="alert" className="mt-3 flex items-center gap-2 text-[15px] text-[var(--color-danger)]">
            <CircleAlert className="size-5" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>

      {data.canCancel ? (
        <div className="card p-5">
          <h2 className="text-[17px] font-bold">Нужно изменить планы?</h2>
          <p className="mt-1 text-[15px] text-[var(--color-muted)]">
            Отмена освобождает время для других. Перенос — это отмена и новая запись.
          </p>

          {confirming ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={cancelling}>
                Оставить запись
              </button>
              <button
                type="button"
                className="btn btn-secondary !border-[var(--color-danger)] !text-[var(--color-danger)]"
                onClick={() => void cancel()}
                disabled={cancelling}
                aria-disabled={cancelling}
              >
                {cancelling ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
                Да, отменить запись
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary mt-3 w-full sm:w-auto" onClick={() => setConfirming(true)}>
              Отменить запись
            </button>
          )}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link href="/zapis" className="btn btn-primary">
          Записаться снова
        </Link>
        <Link href="/" className="btn btn-secondary">
          На главную
        </Link>
      </div>
    </div>
  );
}
