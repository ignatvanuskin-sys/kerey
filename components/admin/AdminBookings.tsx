'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, LoaderCircle, MessageCircle, Phone, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskPhoneInput, normalizePhone, waDigits } from '@/lib/phone';
import { AdminCard, AdminField, Notice, Skeleton, StatusBadge, TelegramBadge } from '@/components/admin/ui';

type AdminBooking = {
  id: number;
  number: string;
  status: string;
  statusLabel: string;
  serviceTitle: string;
  car: string;
  carYear: string | null;
  carPlate: string | null;
  clientName: string;
  clientPhone: string;
  contactMethod: string;
  comment: string | null;
  startAt: string;
  endAt: string;
  durationMin: number;
  source: string;
  utmSource: string | null;
  createdAt: string;
  tgState: 'none' | 'pending' | 'sent' | 'failed';
};

type Service = { id: number; title: string; duration_min: number; is_active: number };

const TABS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'new', label: 'Новые' },
  { key: 'all', label: 'Все' },
] as const;

const STATUSES = [
  ['new', 'Ожидает подтверждения'],
  ['confirmed', 'Подтверждена'],
  ['done', 'Выполнена'],
  ['no_show', 'Не приехал'],
  ['rejected', 'Отклонена'],
  ['cancelled_by_owner', 'Отменена сервисом'],
  ['cancelled_by_client', 'Отменена клиентом'],
] as const;

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Almaty',
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' });
}

export default function AdminBookings() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('today');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const load = useCallback(async () => {
    setBookings(null);
    const query = new URLSearchParams({ tab });
    if (status !== 'all') query.set('status', status);
    if (search.trim()) query.set('search', search.trim());
    if (date && tab === 'all') query.set('date', date);
    try {
      const response = await fetch(`/api/admin/bookings?${query.toString()}`, { cache: 'no-store' });
      const data = (await response.json()) as { bookings?: AdminBooking[] };
      setBookings(data.bookings ?? []);
    } catch {
      setBookings([]);
      setNotice({ kind: 'error', text: 'Не удалось загрузить записи.' });
    }
  }, [tab, status, search, date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: number, body: Record<string, unknown>, successText: string) {
    setBusyId(id);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; tgState?: string };
      if (!response.ok || !data.ok) {
        setNotice({ kind: 'error', text: data.error ?? 'Не получилось.' });
        return;
      }
      setNotice({ kind: 'success', text: successText });
      await load();
    } catch {
      setNotice({ kind: 'error', text: 'Нет связи с сервером.' });
    } finally {
      setBusyId(null);
    }
  }

  const grouped = useMemo(() => bookings ?? [], [bookings]);

  return (
    <div className="grid gap-4">
      <AdminCard
        title="Записи"
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary !min-h-[40px] !px-3 text-[14px]" onClick={() => void load()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Обновить
            </button>
            <a
              href="/api/admin/bookings/csv"
              className="btn btn-secondary !min-h-[40px] !px-3 text-[14px]"
              onClick={() => setNotice({ kind: 'info', text: 'Экспорт CSV начался.' })}
            >
              <Download className="size-4" aria-hidden="true" />
              CSV
            </a>
            <button
              type="button"
              className="btn btn-primary !min-h-[40px] !px-3 text-[14px]"
              onClick={() => setManualOpen((value) => !value)}
              aria-expanded={manualOpen}
            >
              <Plus className="size-4" aria-hidden="true" />
              Запись вручную
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={tab === entry.key}
              onClick={() => setTab(entry.key)}
              className={cn(
                'min-h-[40px] rounded-full border px-4 text-[14px]',
                tab === entry.key
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-line)] text-[var(--color-muted)]',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="sr-only" htmlFor="filter-status">
            Статус
          </label>
          <select
            id="filter-status"
            className="field"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Все статусы</option>
            {STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-date">
            Дата
          </label>
          <input
            id="filter-date"
            type="date"
            className="field"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={tab !== 'all'}
          />

          <label className="sr-only" htmlFor="filter-search">
            Поиск
          </label>
          <input
            id="filter-search"
            className="field"
            placeholder="Имя, телефон, авто"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {notice ? (
          <div className="mt-3">
            <Notice kind={notice.kind}>{notice.text}</Notice>
          </div>
        ) : null}
      </AdminCard>

      {manualOpen ? <ManualBookingForm onCreated={() => void load()} /> : null}

      {bookings === null ? (
        <div className="grid gap-3">
          <Skeleton />
          <Skeleton />
        </div>
      ) : grouped.length === 0 ? (
        <AdminCard>
          <p className="text-[15px] text-[var(--color-muted)]">Записей нет. Здесь появятся новые заявки с сайта.</p>
        </AdminCard>
      ) : (
        <div className="grid gap-3">
          {grouped.map((booking) => (
            <AdminCard key={booking.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] text-[var(--color-muted)]">
                    №{booking.number} · {fmtDateTime(booking.startAt)} ({fmtTime(booking.startAt)}, ≈ {booking.durationMin} мин)
                  </p>
                  <h3 className="mt-1 text-[17px] font-bold">{booking.serviceTitle}</h3>
                  <p className="text-[15px]">
                    {booking.car}
                    {booking.carYear ? `, ${booking.carYear}` : ''}
                    {booking.carPlate ? ` · ${booking.carPlate}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={booking.status} label={booking.statusLabel} />
                  <TelegramBadge state={booking.tgState} />
                </div>
              </div>

              <dl className="mt-3 grid gap-1 text-[15px] sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--color-muted)]">Клиент</dt>
                  <dd className="font-semibold">{booking.clientName}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Телефон</dt>
                  <dd className="font-semibold">{booking.clientPhone}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Связь</dt>
                  <dd>{booking.contactMethod === 'call' ? 'Звонок' : booking.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Источник</dt>
                  <dd>
                    {booking.source === 'admin' ? 'админка' : 'сайт'}
                    {booking.utmSource ? ` (${booking.utmSource})` : ''}
                  </dd>
                </div>
                {booking.comment ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--color-muted)]">Комментарий</dt>
                    <dd>{booking.comment}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a href={`tel:${booking.clientPhone}`} className="btn btn-secondary !min-h-[40px] !px-3 text-[14px]">
                  <Phone className="size-4" aria-hidden="true" />
                  Позвонить
                </a>
                <a
                  href={`https://wa.me/${waDigits(booking.clientPhone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary !min-h-[40px] !px-3 text-[14px]"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>

                <label className="sr-only" htmlFor={`status-${booking.id}`}>
                  Изменить статус
                </label>
                <div className="relative">
                  <select
                    id={`status-${booking.id}`}
                    className="field !min-h-[40px] !w-auto !pr-8 text-[14px]"
                    value={booking.status}
                    disabled={busyId === booking.id}
                    onChange={(event) =>
                      void patch(booking.id, { action: 'status', status: event.target.value }, 'Статус обновлён.')
                    }
                  >
                    {STATUSES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
                </div>

                <button
                  type="button"
                  className="btn btn-secondary !min-h-[40px] !px-3 text-[14px]"
                  disabled={busyId === booking.id}
                  onClick={() => void patch(booking.id, { action: 'resend' }, 'Карточка отправлена повторно.')}
                >
                  {busyId === booking.id ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  )}
                  В Telegram повторно
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- manual booking ----------------------------- */

function ManualBookingForm({ onCreated }: { onCreated: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<'call' | 'whatsapp' | 'telegram'>('call');
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/admin/services', { cache: 'no-store' });
      const data = (await response.json()) as { services?: Service[] };
      setServices((data.services ?? []).filter((service) => service.is_active));
    })();
  }, []);

  useEffect(() => {
    if (!date) return;
    void (async () => {
      const query = new URLSearchParams({ date });
      if (serviceId) query.set('serviceId', serviceId);
      const response = await fetch(`/api/availability?${query.toString()}`, { cache: 'no-store' });
      const data = (await response.json()) as { slots?: Array<{ time: string; available: boolean }> };
      setSlots(data.slots ?? []);
      setTime('');
    })();
  }, [date, serviceId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: serviceId ? Number(serviceId) : null,
          date,
          time,
          carBrand,
          carModel,
          carYear: carYear || null,
          carPlate: carPlate || null,
          clientName,
          phone,
          contactMethod,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setMessage({ kind: 'error', text: data.error ?? 'Не удалось создать запись.' });
        return;
      }
      setMessage({ kind: 'success', text: 'Запись создана и отправлена в Telegram.' });
      setCarBrand('');
      setCarModel('');
      setCarYear('');
      setCarPlate('');
      setClientName('');
      setPhone('');
      setTime('');
      onCreated();
    } catch {
      setMessage({ kind: 'error', text: 'Нет связи с сервером.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminCard title="Запись вручную (звонок или визит)">
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminField label="Услуга" htmlFor="m-service">
            <select id="m-service" className="field" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">Диагностика (по умолчанию)</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title} · {service.duration_min} мин
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Дата" htmlFor="m-date">
            <input id="m-date" type="date" className="field" value={date} onChange={(event) => setDate(event.target.value)} required />
          </AdminField>
          <AdminField label="Телефон" htmlFor="m-phone">
            <input
              id="m-phone"
              className="field"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(maskPhoneInput(event.target.value))}
              placeholder="+7 (___) ___-__-__"
              required
            />
          </AdminField>
        </div>

        {date ? (
          <div>
            <p className="label">Время</p>
            {slots.length === 0 ? (
              <p className="hint">На эту дату слотов нет.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    aria-pressed={time === slot.time}
                    onClick={() => setTime(slot.time)}
                    className={cn(
                      'min-h-[40px] rounded-[var(--radius-control)] border px-3 text-[14px]',
                      time === slot.time
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                        : 'border-[var(--color-line)] bg-[var(--color-surface-2)]',
                      !slot.available && 'cursor-not-allowed opacity-40 line-through',
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-4">
          <AdminField label="Марка" htmlFor="m-brand">
            <input id="m-brand" className="field" value={carBrand} onChange={(event) => setCarBrand(event.target.value)} required />
          </AdminField>
          <AdminField label="Модель" htmlFor="m-model">
            <input id="m-model" className="field" value={carModel} onChange={(event) => setCarModel(event.target.value)} required />
          </AdminField>
          <AdminField label="Год" htmlFor="m-year">
            <input
              id="m-year"
              className="field"
              inputMode="numeric"
              maxLength={4}
              value={carYear}
              onChange={(event) => setCarYear(event.target.value.replace(/\D/g, ''))}
            />
          </AdminField>
          <AdminField label="Гос. номер" htmlFor="m-plate">
            <input
              id="m-plate"
              className="field"
              value={carPlate}
              onChange={(event) => setCarPlate(event.target.value.toUpperCase().slice(0, 12))}
            />
          </AdminField>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <AdminField label="Имя клиента" htmlFor="m-name">
            <input id="m-name" className="field" value={clientName} onChange={(event) => setClientName(event.target.value)} required />
          </AdminField>
          <AdminField label="Связь" htmlFor="m-contact">
            <select
              id="m-contact"
              className="field"
              value={contactMethod}
              onChange={(event) => setContactMethod(event.target.value as 'call' | 'whatsapp' | 'telegram')}
            >
              <option value="call">Звонок</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </select>
          </AdminField>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy || !time || !normalizePhone(phone)}
              aria-disabled={busy || !time || !normalizePhone(phone)}
            >
              {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
              Создать запись
            </button>
          </div>
        </div>

        {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
      </form>
    </AdminCard>
  );
}
