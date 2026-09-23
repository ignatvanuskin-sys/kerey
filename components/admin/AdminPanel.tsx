'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, CircleAlert, CircleCheck, Clock, Inbox, LoaderCircle, LogOut, Phone, RefreshCw, Search } from 'lucide-react';
import { BOOKING_STATUSES, STATUS_LABELS, bookingNumberLabel, type BookingRecord, type BookingStatus } from '@/lib/booking-types';
import { cn } from '@/lib/cn';
import { formatPhone, waDigits } from '@/lib/phone';
import { dayMonth, humanDate } from '@/lib/format';

type Dashboard = {
  newCount: number;
  todayCount: number;
  weekCount: number;
  totalCount: number;
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  NEW: 'border-[var(--color-accent)]/60 text-[var(--color-accent)]',
  CONFIRMED: 'border-[var(--color-success)]/60 text-[var(--color-success)]',
  COMPLETED: 'border-[var(--color-line-strong)] text-[var(--color-chrome)]',
  CANCELLED: 'border-[var(--color-danger)]/50 text-[var(--color-danger)]',
};

const FILTERS: Array<{ key: BookingStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Все' },
  { key: 'NEW', label: 'Новые' },
  { key: 'CONFIRMED', label: 'Подтверждённые' },
  { key: 'COMPLETED', label: 'Выполненные' },
  { key: 'CANCELLED', label: 'Отменённые' },
];

export default function AdminPanel({
  initialBookings,
  dashboard,
}: {
  initialBookings: BookingRecord[];
  dashboard: Dashboard;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRecord[]>(initialBookings);
  const [filter, setFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings
      .filter((booking) => (filter === 'ALL' ? true : booking.status === filter))
      .filter((booking) =>
        query
          ? `${booking.name} ${booking.phone} ${booking.carBrand} ${booking.carModel} ${booking.serviceTitle}`
              .toLowerCase()
              .includes(query)
          : true,
      );
  }, [bookings, filter, search]);

  async function changeStatus(id: string, status: BookingStatus): Promise<void> {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; booking?: BookingRecord };

      if (!response.ok || !data.ok || !data.booking) {
        setMessage({ kind: 'error', text: data.message ?? 'Не удалось изменить статус' });
        return;
      }

      setBookings((current) => current.map((item) => (item.id === id ? data.booking! : item)));
      setMessage({ kind: 'ok', text: `Статус обновлён: ${STATUS_LABELS[status]}` });
      router.refresh();
    } catch {
      setMessage({ kind: 'error', text: 'Нет связи с сервером' });
    } finally {
      setBusyId(null);
    }
  }

  async function logout(): Promise<void> {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  const stats = [
    { label: 'Новых заявок', value: dashboard.newCount, icon: Inbox, hint: 'ждут подтверждения' },
    { label: 'Записей на сегодня', value: dashboard.todayCount, icon: Clock, hint: 'активные визиты' },
    { label: 'Записей на неделю', value: dashboard.weekCount, icon: CalendarClock, hint: 'ближайшие 7 дней' },
    { label: 'Всего заявок', value: dashboard.totalCount, icon: CircleCheck, hint: 'за всё время' },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h2 text-[26px]">Заявки</h1>
          <p className="hint mt-2">
            Заявки с сайта приходят сюда. Клиенты, которые оставили запись, ожидают звонка или сообщения.
          </p>
        </div>
        <button type="button" className="btn btn-secondary !min-h-[44px] !px-4" onClick={() => void logout()}>
          <LogOut className="size-4" aria-hidden="true" />
          Выйти
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{stat.label}</span>
                <Icon className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-none">{stat.value}</p>
              <p className="hint mt-1">{stat.hint}</p>
            </article>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                'min-h-[40px] rounded-full border px-4 text-[14px] transition-colors',
                filter === item.key
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]'
                  : 'border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-line-strong)]',
              )}
            >
              {item.label}
            </button>
          ))}

          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true" />
            <input
              className="field !min-h-[44px] !pl-9"
              placeholder="Имя, телефон, авто"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Поиск по заявкам"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary !min-h-[44px] !px-4"
            onClick={() => router.refresh()}
            aria-label="Обновить список"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Обновить
          </button>
        </div>

        {message ? (
          <p
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'mt-4 flex items-center gap-2 rounded-[var(--radius-control)] border p-3 text-[14px]',
              message.kind === 'error'
                ? 'border-[var(--color-danger)] text-[var(--color-danger)]'
                : 'border-[var(--color-success)] text-[var(--color-success)]',
            )}
          >
            {message.kind === 'error' ? <CircleAlert className="size-4" /> : <CircleCheck className="size-4" />}
            {message.text}
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-10 text-center">
          <Inbox className="size-7 text-[var(--color-muted)]" aria-hidden="true" />
          <p className="font-semibold">
            {bookings.length === 0 ? 'Заявок пока нет' : 'Ничего не найдено'}
          </p>
          <p className="hint max-w-[46ch]">
            {bookings.length === 0
              ? 'Как только клиент оформит запись на сайте, заявка появится здесь — со всеми данными и статусом «Новая».'
              : 'Измените фильтр или строку поиска.'}
          </p>
        </div>
      ) : (
        <>
          {/* Таблица для большого экрана */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] border-collapse text-[14px]">
              <caption className="sr-only">Список заявок клиентов</caption>
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[12px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  <th className="px-4 py-3 font-medium">№</th>
                  <th className="px-4 py-3 font-medium">Имя</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Услуга</th>
                  <th className="px-4 py-3 font-medium">Дата и время</th>
                  <th className="px-4 py-3 font-medium">Авто / комментарий</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => (
                  <tr key={booking.id} className="border-b border-[var(--color-line)] last:border-b-0 align-top">
                    <td className="px-4 py-4 font-semibold">{bookingNumberLabel(booking.number)}</td>
                    <td className="px-4 py-4">
                      <span className="block font-semibold">{booking.name}</span>
                      <span className="hint">создана {dayMonth(booking.createdAt.slice(0, 10))}</span>
                    </td>
                    <td className="px-4 py-4">
                      <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-2 hover:text-[var(--color-accent)]">
                        <Phone className="size-3.5" aria-hidden="true" />
                        {formatPhone(booking.phone)}
                      </a>
                      <a
                        href={`https://wa.me/${waDigits(booking.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hint mt-1 block hover:text-[var(--color-accent)]"
                      >
                        WhatsApp →
                      </a>
                    </td>
                    <td className="px-4 py-4">{booking.serviceTitle}</td>
                    <td className="px-4 py-4">
                      <span className="block font-semibold">{humanDate(booking.date)}</span>
                      <span className="hint">{booking.time}</span>
                    </td>
                    <td className="max-w-[280px] px-4 py-4">
                      <span className="block">
                        {booking.carBrand} {booking.carModel}
                        {booking.carYear ? `, ${booking.carYear}` : ''}
                      </span>
                      {booking.comment ? <span className="hint mt-1 block">{booking.comment}</span> : null}
                    </td>
                    <td className="px-4 py-4">
                      <StatusSelect booking={booking} busy={busyId === booking.id} onChange={changeStatus} />
                      {booking.notification?.status === 'failed' ? (
                        <span className="hint mt-1 block text-[var(--color-danger)]">Уведомление не отправлено</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Карточки для телефона */}
          <ul className="grid gap-3 lg:hidden">
            {visible.map((booking) => (
              <li key={booking.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      {bookingNumberLabel(booking.number)} · создана {dayMonth(booking.createdAt.slice(0, 10))}
                    </p>
                    <p className="mt-1.5 font-semibold">{booking.name}</p>
                  </div>
                  <span className={cn('rounded-full border px-3 py-1 text-[12px] font-semibold', STATUS_STYLE[booking.status])}>
                    {STATUS_LABELS[booking.status]}
                  </span>
                </div>

                <dl className="mt-4 grid gap-2 text-[14px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Телефон</dt>
                    <dd>
                      <a href={`tel:${booking.phone}`} className="font-semibold">
                        {formatPhone(booking.phone)}
                      </a>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Услуга</dt>
                    <dd className="text-right">{booking.serviceTitle}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Когда</dt>
                    <dd className="text-right font-semibold">
                      {humanDate(booking.date)}, {booking.time}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Авто</dt>
                    <dd className="text-right">
                      {booking.carBrand} {booking.carModel}
                    </dd>
                  </div>
                  {booking.comment ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--color-muted)]">Комментарий</dt>
                      <dd className="text-right">{booking.comment}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a href={`tel:${booking.phone}`} className="btn btn-secondary !min-h-[46px]">
                    Позвонить
                  </a>
                  <a
                    href={`https://wa.me/${waDigits(booking.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary !min-h-[46px]"
                  >
                    WhatsApp
                  </a>
                  <div className="sm:col-span-2">
                    <StatusSelect booking={booking} busy={busyId === booking.id} onChange={changeStatus} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="hint">
        Панель показывает персональные данные клиентов — не публикуйте ссылку на неё и не оставляйте открытой на
        чужом устройстве.
      </p>
    </div>
  );
}

function StatusSelect({
  booking,
  busy,
  onChange,
}: {
  booking: BookingRecord;
  busy: boolean;
  onChange: (id: string, status: BookingStatus) => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`status-${booking.id}`}>
        Статус заявки {bookingNumberLabel(booking.number)}
      </label>
      <select
        id={`status-${booking.id}`}
        className="field !min-h-[42px] !w-auto !py-0 text-[14px]"
        value={booking.status}
        disabled={busy}
        onChange={(event) => void onChange(booking.id, event.target.value as BookingStatus)}
      >
        {BOOKING_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {busy ? <LoaderCircle className="size-4 animate-spin text-[var(--color-accent)]" aria-hidden="true" /> : null}
    </div>
  );
}
