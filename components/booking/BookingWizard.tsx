'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, LoaderCircle, X } from 'lucide-react';
import { BUSINESS } from '@/content/business';
import { SERVICES, priceLabel } from '@/content/services';
import { cn } from '@/lib/cn';
import { maskPhoneInput } from '@/lib/phone';
import { humanDate, humanDuration, relativeDayLabel, weekdayShort } from '@/lib/format';
import {
  MAX_COMMENT,
  validateBooking,
  validateField,
  type BookingFormValues,
  type FieldErrors,
} from '@/lib/validation';
import ServiceIcon from '@/components/site/ServiceIcon';

const STEP_TITLES = ['Услуга', 'Автомобиль', 'Дата', 'Время', 'Контакты'] as const;
const TOTAL_STEPS = STEP_TITLES.length;

type DayInfo = { date: string; hasFreeSlots: boolean };
type SlotInfo = { time: string; available: boolean };

type SuccessPayload = {
  number: number;
  name: string;
  date: string;
  time: string;
  serviceTitle: string;
  car: string;
};

const EMPTY_VALUES: BookingFormValues = {
  serviceSlug: '',
  date: '',
  time: '',
  carBrand: '',
  carModel: '',
  carYear: '',
  carPlate: '',
  name: '',
  phone: '',
  comment: '',
};

type Props = {
  initialServiceSlug?: string;
  /** На странице /booking форма встроена в страницу, в остальных местах — в модальном окне. */
  embedded?: boolean;
  onClose?: () => void;
  onSuccess?: (booking: SuccessPayload) => void;
};

export default function BookingWizard({ initialServiceSlug, embedded = false, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<BookingFormValues>({
    ...EMPTY_VALUES,
    serviceSlug: initialServiceSlug ?? '',
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [days, setDays] = useState<DayInfo[] | null>(null);
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessPayload | null>(null);
  const [foreignTimeZone, setForeignTimeZone] = useState(false);

  const startedAt = useRef<number>(0);
  const utm = useRef<{ source?: string; medium?: string; campaign?: string }>({});
  const trap = useRef<string>('');

  const selectedService = useMemo(
    () => SERVICES.find((service) => service.slug === values.serviceSlug) ?? null,
    [values.serviceSlug],
  );

  /* --------------------------- подготовка данных -------------------------- */

  /**
   * Отсчёт времени заполнения нужен антиспаму. В эффекте только запись в ref,
   * без setState — иначе React делает лишние перерисовки на монтировании.
   */
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  /** UTM-метки читаем из адреса в момент отправки — они нужны только для заявки. */
  function readUtm(): void {
    const params = new URLSearchParams(window.location.search);
    utm.current = {
      source: params.get('utm_source') ?? params.get('source') ?? undefined,
      medium: params.get('utm_medium') ?? undefined,
      campaign: params.get('utm_campaign') ?? undefined,
    };
  }

  const loadDays = useCallback(async () => {
    try {
      const response = await fetch('/api/availability', { cache: 'no-store' });
      if (!response.ok) throw new Error('availability');
      const data = (await response.json()) as { days?: DayInfo[] };
      setDays(data.days ?? []);
    } catch {
      setDays([]);
    }
  }, []);

  const loadSlots = useCallback(async (date: string, serviceSlug: string) => {
    setSlotsLoading(true);
    try {
      const query = new URLSearchParams({ date, service: serviceSlug });
      const response = await fetch(`/api/availability?${query.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('slots');
      const data = (await response.json()) as { slots?: SlotInfo[] };
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  /** Доступные дни подгружаем при входе на шаг выбора даты. */
  async function prepareDates(): Promise<void> {
    setForeignTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone !== 'Asia/Almaty');
    if (days === null) await loadDays();
  }

  /** Слоты — сразу после выбора даты. */
  async function chooseDate(date: string): Promise<void> {
    setSlotNotice(null);
    setValues((current) => ({ ...current, date, time: '' }));
    await loadSlots(date, values.serviceSlug);
  }

  /* ------------------------------- навигация ------------------------------ */

  function setField<K extends keyof BookingFormValues>(field: K, value: BookingFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function fieldsOfStep(current: number): Array<keyof BookingFormValues> {
    if (current === 1) return ['serviceSlug'];
    if (current === 2) return ['carBrand', 'carModel', 'carYear', 'carPlate'];
    if (current === 3) return ['date'];
    if (current === 4) return ['time'];
    return ['name', 'phone', 'comment'];
  }

  function validateCurrentStep(): boolean {
    const stepErrors: FieldErrors = {};
    for (const field of fieldsOfStep(step)) {
      const error = validateField(field, values);
      if (error) stepErrors[field] = error;
    }
    if (step === TOTAL_STEPS && !consent) stepErrors.consent = 'Нужно согласие на обработку данных';

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function goNext(): void {
    setServerError(null);
    if (!validateCurrentStep()) return;

    const next = Math.min(TOTAL_STEPS, step + 1);

    // Данные подгружаем в обработчике действия, а не в эффекте: так нет каскадных перерисовок.
    if (next === 3) void prepareDates();
    if (next === 4 && values.date) void loadSlots(values.date, values.serviceSlug);

    setStep(next);
  }

  function goBack(): void {
    setServerError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  /* ------------------------------- отправка ------------------------------- */

  async function submit(): Promise<void> {
    setServerError(null);
    const allErrors = validateBooking(values, consent);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstBroken = fieldsOfStep(step).find((field) => allErrors[field]);
      if (firstBroken) return;
      setStep(TOTAL_STEPS);
      return;
    }

    readUtm();
    setSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          consent: true,
          utm: utm.current,
          trap: trap.current,
          elapsedMs: Date.now() - startedAt.current,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        errors?: FieldErrors;
        reason?: string;
        booking?: SuccessPayload;
      };

      if (response.ok && data.ok && data.booking) {
        setResult(data.booking);
        onSuccess?.(data.booking);
        return;
      }

      if (response.status === 409) {
        setSlotNotice(data.message ?? 'Это время только что заняли — выберите другое.');
        setValues((current) => ({ ...current, time: '' }));
        setStep(4);
        await loadSlots(values.date, values.serviceSlug);
        return;
      }

      if (data.errors) setErrors(data.errors);
      setServerError(data.message ?? 'Не удалось отправить заявку. Позвоните нам, пожалуйста.');
    } catch {
      setServerError('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------ экран успеха ---------------------------- */

  if (result) {
    return (
      <div className="step-in flex flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-16 place-items-center rounded-full border border-[var(--color-success)]/40 bg-[var(--color-success)]/10">
            <CircleCheck className="size-8 text-[var(--color-success)]" aria-hidden="true" />
          </span>
          <p className="eyebrow !justify-center">Запись принята</p>
          <h2 className="h2 text-[26px] md:text-[32px]">Спасибо, {result.name}!</h2>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
            Мы свяжемся с вами для подтверждения записи — позвоним или напишем в WhatsApp.
          </p>
        </div>

        <dl className="card divide-y divide-[var(--color-line)]">
          {[
            ['Номер заявки', `№${String(result.number).padStart(4, '0')}`],
            ['Услуга', result.serviceTitle],
            ['Автомобиль', result.car],
            ['Дата', humanDate(result.date)],
            ['Время', result.time],
            ['Адрес', `${BUSINESS.address}, ${BUSINESS.city}`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-5 px-5 py-3.5 text-[15px]">
              <dt className="text-[var(--color-muted)]">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/" className="btn btn-primary">
            Вернуться на сайт
          </Link>
          <a href={`tel:${BUSINESS.phone.e164}`} className="btn btn-secondary">
            {BUSINESS.phone.display}
          </a>
        </div>

        <p className="hint text-center">
          Приехать раньше или позже? Позвоните — договоримся. Работаем {BUSINESS.hours.text.toLowerCase()}.
        </p>
      </div>
    );
  }

  /* -------------------------------- основная форма ------------------------ */

  const slotGroups = slots
    ? [
        { title: 'Утро', items: slots.filter((slot) => slot.time < '12:00') },
        { title: 'День', items: slots.filter((slot) => slot.time >= '12:00' && slot.time < '17:00') },
        { title: 'Вечер', items: slots.filter((slot) => slot.time >= '17:00') },
      ].filter((group) => group.items.length > 0)
    : [];

  return (
    <div className="flex max-h-[92vh] flex-col">
      {/* Шапка формы и прогресс */}
      <div className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-surface)] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Шаг {step} из {TOTAL_STEPS} · {STEP_TITLES[step - 1]}
            </p>
            <h2 className="h2 mt-2 text-[22px] md:text-[26px]">
              {step === 1 && 'Что нужно сделать?'}
              {step === 2 && 'Данные автомобиля'}
              {step === 3 && 'Когда вам удобно?'}
              {step === 4 && 'Выберите время'}
              {step === 5 && 'Куда сообщить о подтверждении'}
            </h2>
          </div>
          {!embedded && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary !min-h-[42px] !px-3"
              aria-label="Закрыть форму записи"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <ol className="mt-4 flex gap-1.5" aria-label="Этапы записи">
          {STEP_TITLES.map((title, index) => (
            <li
              key={title}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                index + 1 <= step ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]',
              )}
            >
              <span className="sr-only">{title}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Содержимое шага */}
      <div className="grow overflow-y-auto p-5 md:p-6">
        {serverError ? (
          <p
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-3.5 text-[15px]"
          >
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
            {serverError}
          </p>
        ) : null}

        {slotNotice && step === 4 ? (
          <p
            role="status"
            className="mb-5 rounded-[var(--radius-control)] border border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-3.5 text-[15px]"
          >
            {slotNotice}
          </p>
        ) : null}

        {step === 1 ? (
          <fieldset className="grid gap-2.5">
            <legend className="sr-only">Выберите услугу</legend>
            {SERVICES.map((service) => {
              const selected = values.serviceSlug === service.slug;
              return (
                <button
                  key={service.slug}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setField('serviceSlug', service.slug)}
                  className={cn(
                    'flex items-center gap-3.5 rounded-[var(--radius-control)] border p-4 text-left transition-colors',
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                      : 'border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-line-strong)]',
                  )}
                >
                  <ServiceIcon name={service.icon} className="size-6 shrink-0 text-[var(--color-accent)]" />
                  <span className="grow">
                    <span className="block font-semibold">{service.title}</span>
                    <span className="mt-0.5 block text-[13px] text-[var(--color-muted)]">
                      {priceLabel(service)} · приём ≈ {humanDuration(service.durationMin)}
                    </span>
                  </span>
                  {selected ? <Check className="size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" /> : null}
                </button>
              );
            })}
            {errors.serviceSlug ? <p className="error-text">{errors.serviceSlug}</p> : null}
          </fieldset>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5">
            <div>
              <label className="label" htmlFor="carBrand">
                Марка
              </label>
              <input
                id="carBrand"
                className="field"
                list="brand-list"
                autoComplete="off"
                placeholder="Toyota"
                value={values.carBrand}
                aria-invalid={Boolean(errors.carBrand)}
                onChange={(event) => setField('carBrand', event.target.value)}
              />
              <datalist id="brand-list">
                {BUSINESS.brands.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
              {errors.carBrand ? <p className="error-text">{errors.carBrand}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="carModel">
                Модель
              </label>
              <input
                id="carModel"
                className="field"
                autoComplete="off"
                placeholder="Camry"
                value={values.carModel}
                aria-invalid={Boolean(errors.carModel)}
                onChange={(event) => setField('carModel', event.target.value)}
              />
              {errors.carModel ? <p className="error-text">{errors.carModel}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="carYear">
                  Год <span className="font-normal normal-case text-[var(--color-muted)]">(не обязательно)</span>
                </label>
                <input
                  id="carYear"
                  className="field"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="2012"
                  value={values.carYear}
                  aria-invalid={Boolean(errors.carYear)}
                  onChange={(event) => setField('carYear', event.target.value.replace(/\D/g, ''))}
                />
                {errors.carYear ? <p className="error-text">{errors.carYear}</p> : null}
              </div>
              <div>
                <label className="label" htmlFor="carPlate">
                  Госномер <span className="font-normal normal-case text-[var(--color-muted)]">(не обязательно)</span>
                </label>
                <input
                  id="carPlate"
                  className="field"
                  placeholder="123ABC02"
                  value={values.carPlate}
                  aria-invalid={Boolean(errors.carPlate)}
                  onChange={(event) => setField('carPlate', event.target.value.toUpperCase().slice(0, 12))}
                />
                {errors.carPlate ? <p className="error-text">{errors.carPlate}</p> : null}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="problem">
                Что беспокоит? <span className="font-normal normal-case text-[var(--color-muted)]">(не обязательно)</span>
              </label>
              <textarea
                id="problem"
                className="field min-h-[104px]"
                maxLength={MAX_COMMENT}
                placeholder="Например: стук спереди справа на неровностях"
                value={values.comment}
                onChange={(event) => setField('comment', event.target.value)}
              />
              <p className="hint mt-1">{values.comment.length}/{MAX_COMMENT}</p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5">
            {foreignTimeZone ? (
              <p className="chip !whitespace-normal">
                Время указано по Кокшетау (UTC+5) — {BUSINESS.hours.text.toLowerCase()}
              </p>
            ) : null}

            {days === null ? (
              <div className="flex gap-2.5 overflow-hidden">
                {[0, 1, 2, 3].map((key) => (
                  <div key={key} className="skeleton h-[92px] w-[92px] shrink-0" />
                ))}
              </div>
            ) : days.length === 0 ? (
              <p className="card p-5 text-[15px] text-[var(--color-muted)]">
                Свободных дней не нашлось. Позвоните нам — подберём время вручную.
              </p>
            ) : (
              <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
                {days.map((day, index) => {
                  const selected = values.date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={!day.hasFreeSlots}
                      aria-pressed={selected}
                      onClick={() => void chooseDate(day.date)}
                      className={cn(
                        'flex w-[92px] shrink-0 flex-col items-center gap-0.5 rounded-[var(--radius-control)] border px-2 py-3 transition-colors',
                        selected
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                          : 'border-[var(--color-line)] bg-[var(--color-surface-2)]',
                        !day.hasFreeSlots && 'cursor-not-allowed opacity-35',
                      )}
                    >
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-muted)]">
                        {relativeDayLabel(day.date)}
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-[24px] leading-none">
                        {day.date.slice(8, 10)}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted)]">{weekdayShort(day.date)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {errors.date ? <p className="error-text">{errors.date}</p> : null}

            {values.date ? (
              <p className="hint">Вы выбрали: {humanDate(values.date)}. Дальше — время приёма.</p>
            ) : (
              <p className="hint">Выберите день: серые дни недоступны — на них нет свободного времени.</p>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-5">
            <p className="text-[15px] text-[var(--color-muted)]">
              {humanDate(values.date)}
              {selectedService ? ` · ${selectedService.title} · приём ≈ ${humanDuration(selectedService.durationMin)}` : ''}
            </p>

            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, key) => (
                  <div key={key} className="skeleton h-[52px]" />
                ))}
              </div>
            ) : slots && slots.length > 0 ? (
              <div className="grid gap-5">
                {slotGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2.5 text-[12px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {group.title}
                    </p>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                      {group.items.map((slot) => {
                        const selected = values.time === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            aria-pressed={selected}
                            onClick={() => {
                              setField('time', slot.time);
                              setSlotNotice(null);
                              setServerError(null);
                            }}
                            className={cn(
                              'min-h-[52px] rounded-[var(--radius-control)] border font-semibold transition-colors',
                              selected
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                                : 'border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-line-strong)]',
                              !slot.available && 'cursor-not-allowed border-dashed opacity-35 line-through',
                            )}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="hint">
                  Занятое время отмечено серым. Если удобного часа нет — позвоните, посмотрим загрузку.
                </p>
              </div>
            ) : (
              <p className="card p-5 text-[15px] text-[var(--color-muted)]">
                На эту дату свободного времени нет. Вернитесь и выберите другой день.
              </p>
            )}

            {errors.time ? <p className="error-text">{errors.time}</p> : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-5">
            <div className="card grid gap-2 p-4 text-[14px]">
              <p className="flex justify-between gap-4">
                <span className="text-[var(--color-muted)]">Услуга</span>
                <span className="text-right font-semibold">{selectedService?.title}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[var(--color-muted)]">Автомобиль</span>
                <span className="text-right font-semibold">
                  {values.carBrand} {values.carModel}
                  {values.carYear ? `, ${values.carYear}` : ''}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[var(--color-muted)]">Когда</span>
                <span className="text-right font-semibold">
                  {humanDate(values.date)}, {values.time}
                </span>
              </p>
            </div>

            <div>
              <label className="label" htmlFor="name">
                Имя
              </label>
              <input
                id="name"
                className="field"
                autoComplete="name"
                placeholder="Как к вам обращаться"
                value={values.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setField('name', event.target.value)}
              />
              {errors.name ? <p className="error-text">{errors.name}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Телефон
              </label>
              <input
                id="phone"
                className="field"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (705) 206-21-64"
                value={values.phone}
                aria-invalid={Boolean(errors.phone)}
                onChange={(event) => setField('phone', maskPhoneInput(event.target.value))}
              />
              {errors.phone ? <p className="error-text">{errors.phone}</p> : null}
              <p className="hint mt-1">По нему подтвердим запись — звонком или в WhatsApp.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed">
              <input
                type="checkbox"
                className="mt-0.5 size-6 shrink-0 accent-[var(--color-accent)]"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  if (errors.consent) setErrors((current) => ({ ...current, consent: undefined }));
                }}
                aria-invalid={Boolean(errors.consent)}
              />
              <span>
                Согласен на обработку персональных данных —{' '}
                <Link href="/privacy" className="text-[var(--color-accent)] underline-offset-4 hover:underline">
                  политика конфиденциальности
                </Link>
                .
              </span>
            </label>
            {errors.consent ? <p className="error-text">{errors.consent}</p> : null}

            {/* Приманка для ботов: поле скрыто от людей */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="company">Компания</label>
              <input
                id="company"
                tabIndex={-1}
                autoComplete="off"
                onChange={(event) => {
                  trap.current = event.target.value;
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Кнопки шага */}
      <div
        className="sticky bottom-0 z-10 grid grid-cols-2 gap-3 border-t border-[var(--color-line)] bg-[var(--color-surface)] p-5 md:p-6"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
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
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void submit()}
            disabled={submitting}
            aria-disabled={submitting}
          >
            {submitting ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
            {submitting ? 'Отправляем…' : 'Подтвердить запись'}
          </button>
        )}
      </div>
    </div>
  );
}
