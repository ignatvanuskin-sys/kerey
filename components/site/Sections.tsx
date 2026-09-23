import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { CircleCheck, Clock, MapPin, MessageCircle, Phone, Shield, Wrench } from 'lucide-react';
import { BUSINESS, LEGAL_ENTITY } from '@/content/business';
import { formatKzt } from '@/lib/utils';
import { formatLocal } from '@/lib/tz';
import { computeOpenStatus } from '@/lib/open-status';
import type { PhotoRow, ReviewRow, ServiceRow } from '@/db/repo';
import type { Settings } from '@/lib/settings';
import { effectiveContacts } from '@/lib/settings';
import type { DayOffRow } from '@/lib/settings-store';
import BookButton from '@/components/booking/BookButton';
import TrackedLink from '@/components/site/TrackedLink';
import OpenStatus from '@/components/site/OpenStatus';
import Accordion, { type AccordionItem } from '@/components/site/Accordion';
import MapEmbed from '@/components/site/MapEmbed';
import { ServiceIcon } from '@/components/site/icons';

type Contacts = ReturnType<typeof effectiveContacts>;

function SectionTitle({ id, title, subtitle }: { id?: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-6 md:mb-8">
      <h2 id={id} className="h2">
        {title}
      </h2>
      {subtitle ? <p className="mt-2 max-w-2xl text-[16px] text-[var(--color-muted)]">{subtitle}</p> : null}
    </header>
  );
}

/* ---------------------------------- hero ---------------------------------- */

function heroVisual(): React.ReactNode {
  const photoPath = path.join(process.cwd(), 'public', 'images', 'hero.jpg');
  if (fs.existsSync(photoPath)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/images/hero.jpg"
        alt={`${BUSINESS.name} — ${BUSINESS.descriptor} в ${BUSINESS.city}`}
        width={1200}
        height={800}
        className="h-full w-full rounded-[var(--radius-card)] object-cover"
        fetchPriority="high"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 480 260"
      role="img"
      aria-label="Схематичный силуэт легкового автомобиля"
      className="h-full w-full"
    >
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0v24" fill="none" stroke="#2A2E34" strokeWidth="1" />
        </pattern>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect width="480" height="260" fill="url(#grid)" />
      <path d="M60 190 H420" stroke="#2A2E34" strokeWidth="2" strokeDasharray="10 10" />
      <path
        d="M96 186c0-14 6-24 16-27l20-38c5-9 14-14 24-14h108c11 0 21 5 27 14l24 38c12 3 20 13 20 27v6H96z"
        fill="url(#body)"
        stroke="#FF5A1F"
        strokeWidth="2.5"
      />
      <path d="M150 147l22-32h58v32zM246 115h52l20 32h-72z" fill="#0E0F11" stroke="#FF5A1F" strokeWidth="2" />
      <circle cx="156" cy="190" r="24" fill="#0E0F11" stroke="#FF5A1F" strokeWidth="2.5" />
      <circle cx="156" cy="190" r="9" fill="#2A2E34" stroke="#FF5A1F" strokeWidth="2" />
      <circle cx="352" cy="190" r="24" fill="#0E0F11" stroke="#FF5A1F" strokeWidth="2.5" />
      <circle cx="352" cy="190" r="9" fill="#2A2E34" stroke="#FF5A1F" strokeWidth="2" />
      <circle cx="240" cy="86" r="30" fill="none" stroke="#FF5A1F" strokeWidth="2" strokeDasharray="6 8" opacity="0.7" />
    </svg>
  );
}

export function HeroSection({ contacts, settings, daysOff }: { contacts: Contacts; settings: Settings; daysOff: DayOffRow[] }) {
  const today = formatLocal(new Date(), 'yyyy-MM-dd');
  const dayOffToday = daysOff.find((row) => row.local_date === today) ?? null;
  const initialStatus = computeOpenStatus(settings, dayOffToday, new Date());

  return (
    <section className="relative overflow-hidden border-b border-[var(--color-line)]">
      <div className="ornament pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="container-x relative grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
        <div>
          <h1 className="h1">Автосервис в Кокшетау — запись онлайн за минуту</h1>
          <p className="mt-4 max-w-xl text-[17px] text-[var(--color-muted)]">
            Ремонт и обслуживание легковых авто. Выберите время — мы подтвердим запись по телефону или в WhatsApp.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <BookButton label="Записаться онлайн" source="hero" className="grow sm:grow-0" />
            <TrackedLink
              href={`https://wa.me/${contacts.whatsapp[0].wa}`}
              event="click_whatsapp"
              external
              className="btn btn-secondary grow sm:grow-0"
            >
              <MessageCircle className="size-5" aria-hidden="true" />
              Написать в WhatsApp
            </TrackedLink>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <TrackedLink
              href={BUSINESS.twogis.reviews}
              event="click_2gis_reviews"
              external
              className="chip"
              ariaLabel="Отзывы о Керей в 2ГИС"
            >
              ★ {BUSINESS.twogis.rating.toLocaleString('ru-RU')} в 2ГИС · {BUSINESS.twogis.ratingsCount} оценок
            </TrackedLink>
            <OpenStatus settings={settings} dayOffToday={dayOffToday} initial={initialStatus} />
            <span className="chip">
              <MapPin className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
              {contacts.address}
            </span>
          </div>
        </div>

        <div className="relative aspect-[480/260] w-full">{heroVisual()}</div>
      </div>
    </section>
  );
}

/* -------------------------------- services -------------------------------- */

export function ServicesSection({ services }: { services: ServiceRow[] }) {
  return (
    <section id="services" className="scroll-mt-24 py-12 md:py-16" aria-labelledby="services-title">
      <div className="container-x">
        <SectionTitle
          id="services-title"
          title="Услуги"
          subtitle="Выберите, что нужно сделать. Если не уверены — запишитесь на диагностику, мастер разберётся на месте."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const price = formatKzt(service.price_from);
            return (
              <article key={service.id} className="card flex flex-col gap-3 p-4">
                <ServiceIcon name={service.icon} className="size-7 text-[var(--color-accent)]" />
                <h3 className="text-[18px] font-bold">{service.title}</h3>
                <p className="grow text-[15px] text-[var(--color-muted)]">{service.short_description}</p>
                <p className="text-[15px] font-semibold">
                  {price ? `от ${price}` : (service.price_note ?? 'по результатам диагностики')}
                </p>
                <BookButton
                  serviceSlug={service.slug}
                  label="Записаться"
                  variant="secondary"
                  withIcon={false}
                  source="service_card"
                  className="!min-h-[44px]"
                />
              </article>
            );
          })}

          <article className="card flex flex-col gap-3 border-dashed p-4">
            <Wrench className="size-7 text-[var(--color-accent)]" aria-hidden="true" />
            <h3 className="text-[18px] font-bold">Не знаете, что сломалось?</h3>
            <p className="grow text-[15px] text-[var(--color-muted)]">
              Запишитесь на диагностику — мастер осмотрит автомобиль и объяснит, что нужно делать.
            </p>
            <BookButton
              label="Записаться на диагностику"
              variant="secondary"
              withIcon={false}
              source="service_unknown"
              className="!min-h-[44px]"
            />
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- how ---------------------------------- */

const STEPS = [
  { title: 'Выберите услугу', text: 'Если не уверены — подойдёт диагностика.' },
  { title: 'Выберите время', text: 'Свободные слоты на три недели вперёд.' },
  { title: 'Мы подтвердим', text: 'Позвоним или напишем в WhatsApp.' },
  { title: 'Приезжайте', text: `${BUSINESS.address} — ждём вас.` },
];

export function StepsSection() {
  return (
    <section id="how" className="scroll-mt-24 border-y border-[var(--color-line)] bg-[var(--color-surface)] py-12 md:py-16">
      <div className="container-x">
        <SectionTitle id="how-title" title="Как записаться" subtitle="Четыре шага, около минуты времени." />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card flex gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] font-extrabold text-[var(--color-accent-ink)]">
                {index + 1}
              </span>
              <span>
                <span className="block font-bold">{step.title}</span>
                <span className="mt-1 block text-[15px] text-[var(--color-muted)]">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------- brands -------------------------------- */

export function BrandsSection() {
  return (
    <section id="brands" className="scroll-mt-24 py-12 md:py-16" aria-labelledby="brands-title">
      <div className="container-x">
        <SectionTitle id="brands-title" title="Обслуживаем марки" />
        <ul className="flex flex-wrap gap-2">
          {BUSINESS.brands.map((brand) => (
            <li key={brand} className="chip">
              {brand}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[15px] text-[var(--color-muted)]">
          Вашей марки нет в списке?{' '}
          <TrackedLink
            href={`https://wa.me/${BUSINESS.whatsapp[0].wa}`}
            event="click_whatsapp"
            external
            className="underline"
          >
            Напишите в WhatsApp
          </TrackedLink>{' '}
          или позвоните — уточним.
        </p>
      </div>
    </section>
  );
}

/* --------------------------------- why us -------------------------------- */

export function WhyUsSection({ settings }: { settings: Settings }) {
  const facts = [
    {
      icon: <Shield className="size-6 text-[var(--color-accent)]" aria-hidden="true" />,
      title: `Рейтинг ${BUSINESS.twogis.rating.toLocaleString('ru-RU')} в 2ГИС`,
      text: `${BUSINESS.twogis.ratingsCount} оценок и ${BUSINESS.twogis.reviewsCount} отзывов на ${formatLocalDay(BUSINESS.twogis.asOf)}.`,
    },
    {
      icon: <Clock className="size-6 text-[var(--color-accent)]" aria-hidden="true" />,
      title: 'Работаем каждый день',
      text: `${BUSINESS.hours.text}`,
    },
    {
      icon: <Wrench className="size-6 text-[var(--color-accent)]" aria-hidden="true" />,
      title: `${BUSINESS.brands.length} марок в работе`,
      text: 'Легковые автомобили популярных марок — от бюджетных до премиальных.',
    },
    {
      icon: <CircleCheck className="size-6 text-[var(--color-accent)]" aria-hidden="true" />,
      title: 'Онлайн-запись',
      text: 'Свободное время видно сразу, подтверждение приходит в течение дня.',
    },
  ];

  const ownerTexts = [
    { title: 'Гарантия', text: settings.texts.warranty },
    { title: 'Опыт', text: settings.texts.experience },
    { title: 'Оборудование', text: settings.texts.equipment },
  ].filter((item) => item.text && item.text.trim().length > 0);

  return (
    <section id="why" className="scroll-mt-24 border-y border-[var(--color-line)] bg-[var(--color-surface)] py-12 md:py-16">
      <div className="container-x">
        <SectionTitle id="why-title" title="Почему выбирают нас" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <article key={fact.title} className="card p-4">
              {fact.icon}
              <h3 className="mt-3 text-[17px] font-bold">{fact.title}</h3>
              <p className="mt-1 text-[15px] text-[var(--color-muted)]">{fact.text}</p>
            </article>
          ))}
        </div>

        {ownerTexts.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ownerTexts.map((item) => (
              <article key={item.title} className="card p-4">
                <h3 className="text-[17px] font-bold">{item.title}</h3>
                <p className="mt-1 text-[15px] text-[var(--color-muted)]">{item.text}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatLocalDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/* --------------------------------- reviews -------------------------------- */

export function ReviewsSection({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <section id="reviews" className="scroll-mt-24 py-12 md:py-16" aria-labelledby="reviews-title">
      <div className="container-x">
        <SectionTitle id="reviews-title" title="Отзывы" />

        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[28px] font-extrabold">
              ★ {BUSINESS.twogis.rating.toLocaleString('ru-RU')}
              <span className="ml-2 text-[15px] font-normal text-[var(--color-muted)]">
                {BUSINESS.twogis.ratingsCount} оценок · {BUSINESS.twogis.reviewsCount} отзывов
              </span>
            </p>
            <p className="hint mt-1">
              Рейтинг и отзывы — на карточке 2ГИС (по состоянию на {formatLocalDay(BUSINESS.twogis.asOf)}).
            </p>
          </div>
          <TrackedLink href={BUSINESS.twogis.reviews} event="click_2gis_reviews" external className="btn btn-secondary">
            Читать отзывы в 2ГИС
          </TrackedLink>
        </div>

        {reviews.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reviews.map((review) => (
              <blockquote key={review.id} className="card p-4">
                <p className="text-[15px] leading-relaxed">«{review.text}»</p>
                <footer className="mt-3 text-[14px] text-[var(--color-muted)]">
                  {review.author}
                  {review.rating ? ` · ★ ${review.rating}` : ''}
                  {review.review_date ? ` · ${review.review_date}` : ''}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* --------------------------------- gallery -------------------------------- */

export function GallerySection({ photos }: { photos: PhotoRow[] }) {
  if (photos.length === 0) return null; // no invented photos: the block stays hidden (§12)

  return (
    <section id="gallery" className="scroll-mt-24 border-y border-[var(--color-line)] bg-[var(--color-surface)] py-12 md:py-16">
      <div className="container-x">
        <SectionTitle id="gallery-title" title="Фото" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.alt}
              width={800}
              height={600}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[var(--radius-card)] border border-[var(--color-line)] object-cover"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- faq ---------------------------------- */

const FAQ: AccordionItem[] = [
  {
    question: 'Как записаться на сервис?',
    answer:
      'Нажмите «Записаться онлайн», выберите услугу, дату и время, оставьте имя и телефон. Мы свяжемся, чтобы подтвердить запись.',
  },
  {
    question: 'Не знаю, что сломалось. Что выбрать?',
    answer:
      'Выберите «Не знаю, что сломалось — нужна диагностика». Мастер осмотрит автомобиль, определит причину и объяснит, что делать дальше.',
  },
  {
    question: 'Как быстро подтвердят запись?',
    answer:
      'Обычно в течение дня в рабочее время. Мы позвоним или напишем в WhatsApp — как вам удобнее. До подтверждения запись видна в статусе «Ожидает подтверждения».',
  },
  {
    question: 'Как отменить или перенести запись?',
    answer:
      'Откройте страницу своей записи (ссылка есть на экране после отправки) и нажмите «Отменить запись». Перенос — это отмена и новая запись на удобное время.',
  },
  {
    question: 'Можно приехать без записи?',
    answer:
      'Можно, но лучше записаться заранее — так вы не будете ждать в очереди, а мастер освободит для вас время.',
  },
  {
    question: 'Как с вами связаться?',
    answer: `Позвоните по номеру ${BUSINESS.phone.display} или напишите в WhatsApp. Адрес: ${BUSINESS.address}, ${BUSINESS.city}. ${BUSINESS.hours.text}.`,
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-12 md:py-16" aria-labelledby="faq-title">
      <div className="container-x">
        <SectionTitle id="faq-title" title="Частые вопросы" />
        <Accordion items={FAQ} />
      </div>
    </section>
  );
}

/* --------------------------------- contacts -------------------------------- */

export function ContactsSection({ contacts }: { contacts: Contacts }) {
  return (
    <section
      id="contacts"
      className="scroll-mt-24 border-t border-[var(--color-line)] bg-[var(--color-surface)] py-12 md:py-16"
      aria-labelledby="contacts-title"
    >
      <div className="container-x">
        <SectionTitle id="contacts-title" title="Контакты" />

        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-3">
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <span>
                <span className="block font-semibold">{contacts.address}</span>
                <span className="hint">{BUSINESS.city}</span>
              </span>
            </p>

            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <span className="font-semibold">{BUSINESS.hours.text}</span>
            </p>

            <p className="flex items-start gap-3">
              <Phone className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <TrackedLink
                href={`tel:${contacts.phoneE164}`}
                event="click_phone"
                className="font-semibold underline-offset-4 hover:underline"
              >
                {contacts.phoneDisplay}
              </TrackedLink>
            </p>

            <p className="flex flex-wrap items-start gap-3">
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <span className="flex flex-wrap gap-3">
                {contacts.whatsapp.map((entry) => (
                  <TrackedLink
                    key={entry.wa}
                    href={`https://wa.me/${entry.wa}`}
                    event="click_whatsapp"
                    external
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    WhatsApp {entry.display}
                  </TrackedLink>
                ))}
              </span>
            </p>

            <p className="flex items-start gap-3">
              <span className="mt-0.5 size-5 shrink-0 text-center text-[var(--color-accent)]" aria-hidden="true">
                @
              </span>
              <TrackedLink
                href={contacts.instagramUrl}
                event="click_whatsapp"
                external
                className="font-semibold underline-offset-4 hover:underline"
              >
                Instagram @{contacts.instagramHandle}
              </TrackedLink>
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <TrackedLink href={BUSINESS.twogis.route} event="click_route" external className="btn btn-secondary">
                Маршрут в 2ГИС
              </TrackedLink>
              <TrackedLink href={BUSINESS.maps.google} event="click_route" external className="btn btn-secondary">
                Google Maps
              </TrackedLink>
              <TrackedLink href={BUSINESS.maps.yandex} event="click_route" external className="btn btn-secondary">
                Яндекс Карты
              </TrackedLink>
            </div>
          </div>

          <MapEmbed />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- footer --------------------------------- */

export function Footer({ contacts }: { contacts: Contacts }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-line)] py-8">
      <div className="container-x flex flex-col gap-4 text-[14px] text-[var(--color-muted)]">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Политика конфиденциальности
          </Link>
          <TrackedLink
            href={BUSINESS.twogis.card}
            event="click_2gis_reviews"
            external
            className="underline-offset-4 hover:underline"
          >
            2ГИС
          </TrackedLink>
          <TrackedLink
            href={contacts.instagramUrl}
            event="click_whatsapp"
            external
            className="underline-offset-4 hover:underline"
          >
            Instagram
          </TrackedLink>
          <Link href="/zapis" className="underline-offset-4 hover:underline">
            Онлайн-запись
          </Link>
        </div>
        <p>
          © {year} {BUSINESS.name} — {BUSINESS.descriptor}, {BUSINESS.city}. Реквизиты: {LEGAL_ENTITY}
        </p>
      </div>
    </footer>
  );
}
