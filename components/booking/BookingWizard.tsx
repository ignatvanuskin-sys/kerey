'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Phone,
  X,
} from 'lucide-react';
import { BUSINESS } from '@/content/business';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { maskPhoneInput, normalizePhone } from '@/lib/phone';
import { buildIcs, downloadIcs } from '@/lib/ics';
import { ServiceIcon } from '@/components/site/icons';
import type { ServiceOption } from '@/components/booking/types';

const DRAFT_KEY = 'kerey:booking-draft';
const TOTAL_STEPS = 4;
const BUSINESS_TZ = BUSINESS.timezone;

type DayInfo = { date: string; hasFreeSlots: boolean };
type SlotInfo = { time: string; available: boolean };
type Success = { number: string; token: string; date: string; time: string; serviceTitle: string };

type Props = {
  services: ServiceOption[];
  initialServiceSlug?: string;
  onClose?: () => void;
  embedded?: boolean;
  phoneDisplay: string;
  phoneE164: string;
  /** Notified when the wizard finishes, so the modal wrapper can react. */
  onFinished?: (success: Success) => void;
};

type Draft = Partial<{
  step: number;
  serviceId: number | null;
  carBrand: string;
  carModel: string;
  carYear: string;
  carPlate: string;
  clientName: string;
  phone: string;
  contactMethod: 'call' | 'whatsapp' | 'telegram';
  comment: string;
}>;

function dayLabel(dateStr: string, index: number): { top: string; main: string; sub: string } {
  const iso = new Date(`${dateStr}T00:00:00Z`);
  const weekday = iso.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' });
  const day = iso.toLocaleDateString('ru-RU', { day: 'numeric', timeZone: 'UTC' });
  const month = iso.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  if (index === 0) return { top: 'Сегодня', main: day, sub: month };
  if (index === 1) return { top: 'Завтра', main: day, sub: month };
  return { top: weekday, main: day, sub: month };
}

function groupSlots(slots: SlotInfo[]) {
  return {
    morning: slots.filter((s) => s.time < '12:00'),
    afternoon: slots.filter((s) => s.time >= '12:00' && s.time < '17:00'),
    evening: slots.filter((s) => s.time >= '17:00'),
  };
}

export default function BookingWizard({
  services,
  initialServiceSlug,
  onClose,
  embedded = false,
  phoneDisplay,
  phoneE164,
  onFinished,
}: Props) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<'call' | 'whatsapp' | 'telegram'>('whatsapp');
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [days, setDays] = useState<DayInfo[] | null>(null);
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Success | null>(null);
  const [foreignTimeZone, setForeignTimeZone] = useState(false);
  const [restored, setRestored] = useState(false);

  const utm = useRef<{ source?: string; medium?: string; campaign?: string }>({});
  const startedAt = useRef<number>(Date.now());
  const idempotencyKey = useRef<string>('');

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services],
  );

  /* ------------------------------ initial state ---------------------------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    utm.current = {
      source: params.get('utm_source') ?? params.get('source') ?? undefined,
      medium: params.get('utm_medium') ?? undefined,
      campaign: params.get('utm_campaign') ?? undefined,
    };

    setForeignTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone !== BUSINESS_TZ);

    const requested = params.get('service');
    if (requested) {
      const match = services.find((service) => service.slug === requested);
      if (match) setServiceId(match.id);
    } else if (initialServiceSlug) {
      const match = services.find((service) => service.slug === initialServiceSlug);
      if (match) setServiceId(match.id);
    }

    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        setServiceId((current) => current ?? draft.serviceId ?? null);
        setCarBrand((v) => v || draft.carBrand || '');
        setCarModel((v) => v || draft.carModel || '');
        setCarYear((v) => v || draft.carYear || '');
        setCarPlate((v) => v || draft.carPlate || '');
        setClientName((v) => v || draft.clientName || '');
        setPhone((v) => v || draft.phone || '');
        if (draft.contactMethod) setContactMethod(draft.contactMethod);
        setComment((v) => v || draft.comment || '');
        if (draft.step && draft.step >= 1 && draft.step <= TOTAL_STEPS) setStep(draft.step);
        setRestored(true);
      }
    } catch {
      // corrupted draft — ignore
    }
    startedAt.current = Date.now();
  }, [initialServiceSlug, services]);

  /* -------------------------------- draft --------------------------------- */

  useEffect(() => {
    if (success) return;
    try {
      window.sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step,
          serviceId,
          carBrand,
          carModel,
          carYear,
          carPlate,
          clientName,
          phone,
          contactMethod,
          comment,
        } satisfies Draft),
      );
    } catch {
      // storage full / disabled — the wizard still works
    }
  }, [step, serviceId, carBrand, carModel, carYear, carPlate, clientName, phone, contactMethod, comment, success]);

  /* --------------------------- availability data --------------------------- */

  const loadDays = useCallback(async () => {
    try {
      const response = await fetch('/api/availability/days', { cache: 'no-store' });
      if (!response.ok) throw new Error('days');
      const data = (await response.json()) as { days: DayInfo[] };
      setDays(data.days);
    } catch {
      setDays([]);
    }
  }, []);

  const loadSlots = useCallback(
    async (targetDate: string) => {
      setSlotsLoading(true);
      try {
        const query = new URLSearchParams({ date: targetDate });
        if (serviceId) query.set('serviceId', String(serviceId));
        const response = await fetch(`/api/availability?${query.toString()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('slots');
        const data = (await response.json()) as { slots: SlotInfo[] };
        setSlots(data.slots);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [serviceId],
  );

  useEffect(() => {
    if (step === 3 && days === null) void loadDays();
  }, [step, days, loadDays]);

  useEffect(() => {
    if (step === 3 && date) void loadSlots(date);
  }, [step, date, loadSlots]);

  useEffect(() => {
    track(`booking_step_${step}` as never, { step });
  }, [step]);

  /* ------------------------------ validation ------------------------------ */

  function validateStep(current: number): string | null {
    if (current === 1 && !serviceId) return 'Выберите услугу, пожалуйста.';
    if (current === 2) {
      if (carBrand.trim().length < 1) return 'Укажите марку автомобиля.';
      if (carModel.trim().length < 1) return 'Укажите модель автомобиля.';
    }
    if (current === 3) {
      if (!date) return 'Выберите дату.';
      if (!time) return 'Выберите время.';
    }
    if (current === 4) {
      if (clientName.trim().length < 2) return 'Укажите имя.';
      if (!normalizePhone(phone)) return 'Проверьте номер телефона.';
      if (!consent) return 'Нужно согласие на обработку персональных данных.';
    }
    return null;
  }

  function goNext() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((value) => Math.min(TOTAL_STEPS, value + 1));
  }

  function goBack() {
    setError(null);
    setStep((value) => Math.max(1, value - 1));
  }

  /* -------------------------------- submit -------------------------------- */

  async function submit() {
    const problem = validateStep(4);
    if (problem) {
      setError(problem);
      return;
    }
    if (!date || !time) return;

    setSubmitting(true);
    setError(null);
    setConflict(null);

    if (!idempotencyKey.current) {
      idempotencyKey.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `k-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    track('booking_submit', { service: selectedService?.slug ?? 'any' });

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify({
          serviceId,
          date,
          time,
          carBrand: carBrand.trim(),
          carModel: carModel.trim(),
          carYear: carYear.trim() || null,
          carPlate: carPlate.trim() || null,
          clientName: clientName.trim(),
          phone,
          contactMethod,
          comment: comment.trim() || null,
          consent: true,
          utmSource: utm.current.source ?? null,
          utmMedium: utm.current.medium ?? null,
          utmCampaign: utm.current.campaign ?? null,
          honeypot,
          formElapsedMs: Date.now() - startedAt.current,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        fields?: Record<string, string>;
        number?: string;
        token?: string;
        slots?: SlotInfo[];
      };

      if (response.ok && data.ok && data.number && data.token) {
        const payload: Success = {
          number: data.number,
          token: data.token,
          date,
          time,
          serviceTitle: selectedService?.title ?? 'Диагностика',
        };
        setSuccess(payload);
        idempotencyKey.current = '';
        try {
          window.sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        track('booking_success', { service: selectedService?.slug ?? 'any' });
        onFinished?.(payload);
        return;
      }

      if (response.status === 409) {
        setConflict(data.error ?? 'Это время только что заняли, выберите другое.');
        if (data.slots) setSlots(data.slots);
        setTime(null);
        setStep(3);
        idempotencyKey.current = '';
        return;
      }

      setFieldErrors(data.fields ?? {});
      setError(data.error ?? 'Не удалось отправить заявку. Позвоните нам, пожалуйста.');
    } catch {
      setError('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------------------- render -------------------------------- */

  if (success) {
    return (
      <div className="flex flex-col gap-5 p-5 md:p-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheck className="size-14 text-[var(--color-success)]" aria-hidden="true" />
          <h2 className="h2">Запись №{success.number} отправлена мастеру</h2>
          <p className="text-[var(--color-muted)]">
            Мы подтвердим запись по телефону или в WhatsApp. Обычно это занимает несколько минут.
          </p>
        </div>

        <dl className="card grid gap-2 p-4 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Услуга</dt>
            <dd className="text-right font-semibold">{success.serviceTitle}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Авто</dt>
            <dd className="text-right font-semibold">
              {carBrand} {carModel}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Когда</dt>
            <dd className="text-right font-semibold">
              {new Date(`${success.date}T00:00:00Z`).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                timeZone: 'UTC',
              })}
              , {success.time}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Адрес</dt>
            <dd className="text-right font-semibold">{BUSINESS.address}</dd>
          </div>
        </dl>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              downloadIcs(
                `kerey-${success.number}.ics`,
                buildIcs({
                  uid: success.token,
                  title: `Запись в «${BUSINESS.name}»: ${success.serviceTitle}`,
                  description: `Номер записи ${success.number}. Адрес: ${BUSINESS.address}, ${BUSINESS.city}.`,
                  location: `${BUSINESS.address}, ${BUSINESS.city}`,
                  startAt: `${success.date}T${success.time}:00+05:00`,
                  endAt: `${success.date}T${success.time}:00+05:00`,
                }),
              )
            }
          >
            <Calendar className="size-5" aria-hidden="true" />
            Добавить в календарь
          </button>
          <Link href={`/booking/${success.token}`} className="btn btn-secondary">
            Изменить или отменить
          </Link>
          <a href={`tel:${phoneE164}`} className="btn btn-secondary sm:col-span-2">
            <Phone className="size-5" aria-hidden="true" />
            {phoneDisplay}
          </a>
        </div>

        {!embedded ? (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
        ) : null}
      </div>
    );
  }

  const grouped = slots ? groupSlots(slots) : null;

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* header + progress */}
      <div className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-[var(--color-muted)]">Шаг {step} из {TOTAL_STEPS}</p>
            <h2 className="text-[19px] font-extrabold">
              {step === 1 && 'Что нужно сделать?'}
              {step === 2 && 'Автомобиль'}
              {step === 3 && 'Когда удобно?'}
              {step === 4 && 'Контакты для подтверждения'}
            </h2>
          </div>
          {!embedded ? (
            <button
              type="button"
              className="btn btn-secondary !min-h-[40px] !px-3"
              onClick={onClose}
              aria-label="Закрыть форму записи"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
          aria-label="Прогресс записи"
        >
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-200"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        {restored && step > 1 ? (
          <p className="hint mt-2">Мы сохранили ваши ответы — можно продолжить с того же места.</p>
        ) : null}
      </div>

      {/* body */}
      <div className="grow overflow-y-auto p-4 md:p-5">
        {error ? (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-3 text-[15px]">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {conflict ? (
          <p role="alert" className="mb-4 rounded-[var(--radius-control)] border border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-3 text-[15px]">
            {conflict} Доступные слоты обновлены.
          </p>
        ) : null}

        {step === 1 ? (
          <fieldset>
            <legend className="sr-only">Выберите услугу</legend>
            <div className="grid gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={serviceId === service.id}
                  onClick={() => {
                    setServiceId(service.id);
                    setError(null);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-control)] border p-3 text-left transition-colors',
                    serviceId === service.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                      : 'border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]',
                  )}
                >
                  <ServiceIcon name={service.icon} className="size-6 shrink-0 text-[var(--color-accent)]" />
                  <span className="grow">
                    <span className="block font-semibold">{service.title}</span>
                    <span className="block text-[13px] text-[var(--color-muted)]">
                      приём ≈ {service.durationMin} мин
                      {service.priceFrom ? ` · от ${service.priceFrom.toLocaleString('ru-RU')} ₸` : ''}
                    </span>
                  </span>
                  {serviceId === service.id ? (
                    <Check className="size-5 text-[var(--color-accent)]" aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <div>
              <label className="label" htmlFor="carBrand">
                Марка
              </label>
              <input
                id="carBrand"
                className="field"
                list="brand-options"
                value={carBrand}
                onChange={(event) => setCarBrand(event.target.value)}
                placeholder="Например, Toyota"
                autoComplete="off"
              />
              <datalist id="brand-options">
                {BUSINESS.brands.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
              <p className="hint mt-1">Если вашей марки нет в списке — просто впишите её.</p>
            </div>
            <div>
              <label className="label" htmlFor="carModel">
                Модель
              </label>
              <input
                id="carModel"
                className="field"
                value={carModel}
                onChange={(event) => setCarModel(event.target.value)}
                placeholder="Например, Camry"
                autoComplete="off"
              />
              {fieldErrors.carModel ? <p className="hint text-[var(--color-danger)]">{fieldErrors.carModel}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="carYear">
                  Год <span className="font-normal text-[var(--color-muted)]">(необязательно)</span>
                </label>
                <input
                  id="carYear"
                  className="field"
                  inputMode="numeric"
                  maxLength={4}
                  value={carYear}
                  onChange={(event) => setCarYear(event.target.value.replace(/\D/g, ''))}
                  placeholder="2012"
                />
              </div>
              <div>
                <label className="label" htmlFor="carPlate">
                  Гос. номер <span className="font-normal text-[var(--color-muted)]">(необязательно)</span>
                </label>
                <input
                  id="carPlate"
                  className="field"
                  value={carPlate}
                  onChange={(event) => setCarPlate(event.target.value.toUpperCase().slice(0, 12))}
                  placeholder="123ABC02"
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4">
            {foreignTimeZone ? (
              <p className="chip !whitespace-normal">Время указано по Кокшетау ({BUSINESS_TZ})</p>
            ) : null}

            {days === null ? (
              <div className="flex gap-2 overflow-hidden">
                {[0, 1, 2, 3].map((key) => (
                  <div key={key} className="skeleton h-[68px] w-[76px] shrink-0" />
                ))}
              </div>
            ) : days.length === 0 ? (
              <p className="card p-4 text-[15px] text-[var(--color-muted)]">
                Свободных слотов нет. Позвоните нам — подберём время вручную.
              </p>
            ) : (
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                {days.map((day, index) => {
                  const label = dayLabel(day.date, index);
                  const selected = date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={!day.hasFreeSlots}
                      aria-pressed={selected}
                      onClick={() => {
                        setDate(day.date);
                        setTime(null);
                        setConflict(null);
                      }}
                      className={cn(
                        'flex w-[76px] shrink-0 flex-col items-center rounded-[var(--radius-control)] border px-2 py-2',
                        selected
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                          : 'border-[var(--color-line)] bg-[var(--color-surface-2)]',
                        !day.hasFreeSlots && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <span className="text-[12px] text-[var(--color-muted)]">{label.top}</span>
                      <span className="text-[18px] font-extrabold">{label.main}</span>
                      <span className="text-[12px] text-[var(--color-muted)]">{label.sub}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {date ? (
              slotsLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, key) => (
                    <div key={key} className="skeleton h-[48px]" />
                  ))}
                </div>
              ) : slots && slots.length > 0 ? (
                <div className="grid gap-4">
                  {(
                    [
                      ['Утро', grouped!.morning],
                      ['День', grouped!.afternoon],
                      ['Вечер', grouped!.evening],
                    ] as const
                  ).map(([title, group]) =>
                    group.length === 0 ? null : (
                      <div key={title}>
                        <p className="mb-2 text-[13px] font-semibold text-[var(--color-muted)]">{title}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              aria-pressed={time === slot.time}
                              onClick={() => {
                                setTime(slot.time);
                                setError(null);
                                setConflict(null);
                              }}
                              className={cn(
                                'min-h-[48px] rounded-[var(--radius-control)] border px-4 font-semibold',
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
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="card p-4 text-[15px] text-[var(--color-muted)]">
                  На эту дату свободных слотов нет. Выберите другой день или позвоните нам.
                </p>
              )
            ) : (
              <p className="hint">Выберите день, чтобы увидеть свободное время.</p>
            )}

            {selectedService ? (
              <p className="hint">
                Длительность приёма: ≈ {selectedService.durationMin} мин. Время приёма-осмотра, а не всего ремонта.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4">
            <div>
              <label className="label" htmlFor="clientName">
                Имя
              </label>
              <input
                id="clientName"
                className="field"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                autoComplete="name"
                placeholder="Как к вам обращаться"
              />
              {fieldErrors.clientName ? (
                <p className="hint text-[var(--color-danger)]">{fieldErrors.clientName}</p>
              ) : null}
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Телефон
              </label>
              <input
                id="phone"
                className="field"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(maskPhoneInput(event.target.value))}
                autoComplete="tel"
                placeholder="+7 (___) ___-__-__"
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone ? <p className="hint text-[var(--color-danger)]">{fieldErrors.phone}</p> : null}
            </div>

            <fieldset>
              <legend className="label">Как удобнее связаться?</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['whatsapp', 'WhatsApp'],
                    ['call', 'Звонок'],
                    ['telegram', 'Telegram'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      'flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-4',
                      contactMethod === value
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                        : 'border-[var(--color-line)] bg-[var(--color-surface-2)]',
                    )}
                  >
                    <input
                      type="radio"
                      name="contactMethod"
                      value={value}
                      checked={contactMethod === value}
                      onChange={() => setContactMethod(value)}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="label" htmlFor="comment">
                Комментарий <span className="font-normal text-[var(--color-muted)]">(необязательно)</span>
              </label>
              <textarea
                id="comment"
                className="field min-h-[96px]"
                maxLength={500}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Например: стук спереди справа"
              />
              <p className="hint mt-1">{comment.length}/500</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 size-5 accent-[var(--color-accent)]"
              />
              <span>
                Согласен(-на) на обработку персональных данных —{' '}
                <Link href="/privacy" className="underline" target="_blank">
                  политика конфиденциальности
                </Link>
                .
              </span>
            </label>

            {/* honeypot: hidden from people, tempting for bots */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="company-website">Сайт</label>
              <input
                id="company-website"
                name="company-website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* sticky actions */}
      <div
        className="sticky bottom-0 z-10 grid grid-cols-2 gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:p-5"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={goBack}
          disabled={step === 1 || submitting}
          aria-disabled={step === 1 || submitting}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          Назад
        </button>
        {step < TOTAL_STEPS ? (
          <button type="button" className="btn btn-primary" onClick={goNext}>
            Далее
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={submitting} aria-disabled={submitting}>
            {submitting ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
            {submitting ? 'Отправляем…' : 'Отправить'}
          </button>
        )}
      </div>
    </div>
  );
}
