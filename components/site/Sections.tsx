import Link from 'next/link';
import { CircleCheck, Clock, CreditCard, MapPin, Phone, Star, Wrench } from 'lucide-react';
import { BUSINESS, OWNER_INPUT, TWO_GIS } from '@/content/business';
import { SERVICES, priceLabel, type Service } from '@/content/services';
import { REVIEWS, REVIEWS_AS_OF, REVIEWS_SOURCE_URL } from '@/content/reviews';
import { FAQ } from '@/content/faq';
import { ratingsWord, reviewsWord, humanDate, humanDuration } from '@/lib/format';
import Reveal from '@/components/ui/Reveal';
import BookButton from '@/components/booking/BookButton';
import Accordion from '@/components/site/Accordion';
import MapEmbed from '@/components/site/MapEmbed';
import GalleryGrid from '@/components/site/GalleryGrid';
import ServiceIcon from '@/components/site/ServiceIcon';

/* ------------------------------- служебное ------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  id,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div className="mb-9 max-w-3xl md:mb-12">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="h2 mt-4">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-[16px] leading-relaxed text-[var(--color-muted)]">{subtitle}</p> : null}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Оценка ${rating} из 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={
            value <= rating
              ? 'size-4 fill-[var(--color-accent)] text-[var(--color-accent)]'
              : 'size-4 text-[var(--color-line-strong)]'
          }
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/* -------------------------------- услуги --------------------------------- */

function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <Reveal delay={index * 60} className="h-full">
      <article className="group card flex h-full flex-col gap-4 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-accent)]/60 hover:shadow-[0_20px_50px_-30px_rgba(255,90,31,0.55)]">
        <span className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-accent)] transition-colors group-hover:border-[var(--color-accent)]/50">
          <ServiceIcon name={service.icon} className="size-6" />
        </span>

        <h3 className="h3 text-[19px] leading-tight">{service.title}</h3>
        <p className="grow text-[15px] leading-relaxed text-[var(--color-muted)]">{service.summary}</p>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
          <span className="text-[14px] text-[var(--color-chrome)]">{priceLabel(service)}</span>
          <span className="text-[13px] text-[var(--color-muted)]">приём ≈ {humanDuration(service.durationMin)}</span>
        </div>

        <BookButton
          serviceSlug={service.slug}
          label="Записаться"
          withIcon={false}
          className="!min-h-[46px] w-full !text-[15px]"
        />
      </article>
    </Reveal>
  );
}

export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-24 py-16 md:py-24">
      <div className="container-x">
        <SectionHeading
          id="services-title"
          eyebrow="Услуги"
          title="Чем занимается сервис"
          subtitle="Направления работ по данным карточки 2ГИС. Прайса у компании нет — стоимость зависит от неисправности и запчастей, её называют после осмотра."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, index) => (
            <ServiceCard key={service.slug} service={service} index={index} />
          ))}
        </div>

        <p className="mt-6 text-[14px] text-[var(--color-muted)]">
          Не нашли нужную работу? Опишите проблему в заявке — мастер посмотрит автомобиль и скажет, что делать.
        </p>
      </div>
    </section>
  );
}

/* ---------------------------- как это работает --------------------------- */

const STEPS = [
  { title: 'Выбираете услугу', text: 'Ходовая, двигатель, развал-схождение или «не знаю, что сломалось».' },
  { title: 'Выбираете время', text: 'Свободные слоты видны сразу — работаем ежедневно 08:30–21:00.' },
  { title: 'Оставляете контакты', text: 'Имя и телефон. Больше ничего заполнять не нужно.' },
  { title: 'Получаете подтверждение', text: 'Мы связываемся и подтверждаем время приезда.' },
];

export function HowItWorksSection() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24 border-y border-[var(--color-line)] bg-[var(--color-surface)] py-16 md:py-24">
      <div className="container-x">
        <SectionHeading eyebrow="Как записаться" title="Четыре шага и одна минута" id="how-title" />

        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="h-full">
              <Reveal delay={index * 70} className="h-full border-t border-[var(--color-line-strong)] pt-5">
                <span className="font-[family-name:var(--font-display)] text-[34px] leading-none text-[var(--color-accent)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="h3 mt-3 text-[18px]">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted)]">{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <BookButton label="Записаться онлайн" />
        </div>
      </div>
    </section>
  );
}

/* --------------------------- почему выбирают ----------------------------- */

type Advantage = { icon: typeof Wrench; title: string; text: string; href?: string };

function advantages(): Advantage[] {
  return [
    {
      icon: Star,
      title: `${BUSINESS.rating.value.toLocaleString('ru-RU')} в ${BUSINESS.rating.source}`,
      text: `${ratingsWord(BUSINESS.rating.ratingsCount)} и ${reviewsWord(BUSINESS.rating.reviewsCount)} в карточке компании. Статус «${BUSINESS.rating.cardState}».`,
      href: TWO_GIS.reviews,
    },
    {
      icon: Clock,
      title: 'Работаем без выходных',
      text: `${BUSINESS.hours.text}. Записаться можно на сегодня или на любую дату вперёд.`,
    },
    {
      icon: Wrench,
      title: 'Профильные направления',
      text: `${BUSINESS.subRubrics.join(', ')} — этим сервис занимается по данным 2ГИС.`,
    },
    {
      icon: CreditCard,
      title: 'Удобная оплата и запчасти',
      text: `${BUSINESS.payment.join(', ')}. Здесь же можно подобрать запчасти для иномарок.`,
    },
  ];
}

export function WhyUsSection() {
  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-24 py-16 md:py-24">
      <div className="container-x">
        <SectionHeading
          id="why-title"
          eyebrow={`Почему ${BUSINESS.name}`}
          title="Что подтверждается карточкой 2ГИС"
          subtitle="Мы не пишем «гарантия качества» и «опыт 20 лет»: таких данных о компании нет. Ниже — только то, что можно проверить по карточке."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {advantages().map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 60}>
                <article className="card flex h-full gap-4 p-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="h3 text-[18px]">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted)]">{item.text}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-[14px] font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
                      >
                        Смотреть отзывы в 2ГИС →
                      </a>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- соцдоказательство ----------------------- */

export function ReviewsSection() {
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24 border-y border-[var(--color-line)] bg-[var(--color-surface)] py-16 md:py-24">
      <div className="container-x">
        <SectionHeading
          id="reviews-title"
          eyebrow="Отзывы"
          title="Что пишут клиенты"
          subtitle={`Отзывы взяты из карточки 2ГИС и приведены без правок — включая критические. Мы не удаляем неудобные оценки: полный список, ${reviewsWord(BUSINESS.rating.reviewsCount)}, доступен в источнике.`}
        />

        <div className="card flex flex-wrap items-center justify-between gap-5 p-6">
          <div className="flex items-center gap-4">
            <span className="font-[family-name:var(--font-display)] text-[46px] leading-none text-[var(--color-ink)]">
              {BUSINESS.rating.value.toLocaleString('ru-RU')}
            </span>
            <span>
              <Stars rating={5} />
              <span className="mt-1 block text-[14px] text-[var(--color-muted)]">
                {ratingsWord(BUSINESS.rating.ratingsCount)} · {reviewsWord(BUSINESS.rating.reviewsCount)} · данные на{' '}
                {humanDate(REVIEWS_AS_OF)}
              </span>
            </span>
          </div>

          <a href={REVIEWS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary !min-h-[46px]">
            Все отзывы в 2ГИС
          </a>
        </div>

        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {REVIEWS.map((review, index) => (
            <li key={`${review.author}-${review.date}`} className="h-full">
              <Reveal delay={index * 40} className="h-full">
                <div className="card h-full p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={review.rating} />
                    <span className="text-[13px] text-[var(--color-muted)]">{humanDate(review.date)}</span>
                  </div>
                  <blockquote className="mt-3 text-[15px] leading-relaxed text-[var(--color-chrome)]">
                    «{review.text}»
                  </blockquote>
                  <footer className="mt-3 text-[14px] font-semibold text-[var(--color-ink)]">{review.author}</footer>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[13px] text-[var(--color-muted)]">
          Источник: карточка компании в 2ГИС. Тексты приведены как есть, орфография авторов сохранена.
        </p>
      </div>
    </section>
  );
}

/* --------------------------------- о компании ---------------------------- */

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-24 py-16 md:py-24">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="about-title"
            eyebrow="О компании"
            title={`Автокомплекс «${BUSINESS.name}»`}
          />
          <div className="grid gap-4 text-[16px] leading-relaxed text-[var(--color-chrome)]">
            <p>
              «{BUSINESS.name}» — автокомплекс в {BUSINESS.city}е по адресу {BUSINESS.address}. Основное направление —
              ремонт и обслуживание легковых автомобилей: ходовая часть, бензиновые двигатели, развал-схождение и
              запчасти для иномарок.
            </p>
            <p>
              Работаем ежедневно, {BUSINESS.hours.text.toLowerCase()}, без выходных. В карточке 2ГИС у компании{' '}
              {BUSINESS.brands.length} марок в списке обслуживания — от бюджетных Lada, Daewoo и Ravon до
              Mercedes-Benz и Lexus.
            </p>
            <p>
              Рейтинг в {BUSINESS.rating.source} — {BUSINESS.rating.value.toLocaleString('ru-RU')} при{' '}
              {ratingsWord(BUSINESS.rating.ratingsCount)} и {reviewsWord(BUSINESS.rating.reviewsCount)}. Полный список
              направлений и отзывов доступен в карточке компании.
            </p>
            {OWNER_INPUT.description ? <p>{OWNER_INPUT.description}</p> : null}
            {OWNER_INPUT.warranty ? (
              <p className="flex gap-3 text-[15px]">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                {OWNER_INPUT.warranty}
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <BookButton label="Записаться онлайн" />
            <a href={TWO_GIS.card} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              Карточка в 2ГИС
            </a>
          </div>
        </div>

        <Reveal className="h-full">
          <div className="grid h-full content-start gap-4">
            <GalleryGrid />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------- марки -------------------------------- */

export function BrandsSection() {
  return (
    <section id="brands" aria-labelledby="brands-title" className="scroll-mt-24 border-y border-[var(--color-line)] bg-[var(--color-surface)] py-16 md:py-24">
      <div className="container-x">
        <SectionHeading
          id="brands-title"
          eyebrow="Марки"
          title={`${BUSINESS.brands.length} марок в обслуживании`}
          subtitle="Список марок взят из карточки 2ГИС. Если вашей марки нет в списке — позвоните, уточним возможность работ."
        />

        <ul className="flex flex-wrap gap-2">
          {BUSINESS.brands.map((brand) => (
            <li
              key={brand}
              className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[14px] text-[var(--color-chrome)] transition-colors hover:border-[var(--color-accent)]/60 hover:text-[var(--color-ink)]"
            >
              {brand}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`tel:${BUSINESS.phone.e164}`} className="btn btn-secondary">
            <Phone className="size-5" aria-hidden="true" />
            {BUSINESS.phone.display}
          </a>
          <BookButton label="Записаться онлайн" variant="ghost" />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- вопросы ------------------------------ */

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 py-16 md:py-24">
      <div className="container-x">
        <SectionHeading
          id="faq-title"
          eyebrow="Вопросы"
          title="Частые вопросы"
          subtitle="Ответы основаны на данных карточки компании. Там, где данных нет, мы говорим прямо: уточните у администратора."
        />
        <Accordion items={FAQ} />
      </div>
    </section>
  );
}

/* ---------------------------------- контакты ----------------------------- */

export function ContactsSection() {
  return (
    <section
      id="contacts"
      aria-labelledby="contacts-title"
      className="scroll-mt-24 border-t border-[var(--color-line)] bg-[var(--color-surface)] py-16 md:py-24"
    >
      <div className="container-x">
        <SectionHeading id="contacts-title" eyebrow="Контакты" title={`${BUSINESS.name} — ${BUSINESS.kind}`} />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="grid gap-5">
            <p className="flex items-start gap-3 text-[16px]">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <span>
                <span className="block font-semibold">{BUSINESS.address}</span>
                <span className="hint">
                  {BUSINESS.city}, индекс {BUSINESS.postcode} · ближайшая остановка «{BUSINESS.nearestStop.name}» (
                  {BUSINESS.nearestStop.distance})
                </span>
              </span>
            </p>

            <p className="flex items-start gap-3 text-[16px]">
              <Clock className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <span>
                <span className="block font-semibold">{BUSINESS.hours.text}</span>
                <span className="hint">без выходных</span>
              </span>
            </p>

            <p className="flex items-start gap-3 text-[16px]">
              <Phone className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
              <span>
                <a href={`tel:${BUSINESS.phone.e164}`} className="block font-semibold hover:text-[var(--color-accent)]">
                  {BUSINESS.phone.display}
                </a>
                <span className="hint">контакт-центр: {BUSINESS.phoneCenterHours}</span>
              </span>
            </p>

            <div className="grid gap-2 text-[16px]">
              {BUSINESS.whatsapp.map((entry) => (
                <a
                  key={entry.wa}
                  href={`https://wa.me/${entry.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
                >
                  WhatsApp {entry.display}
                </a>
              ))}
              <a
                href={BUSINESS.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
              >
                Instagram @{BUSINESS.instagram.handle}
              </a>
            </div>

            <div className="mt-1 flex flex-wrap gap-3">
              <a href={`tel:${BUSINESS.phone.e164}`} className="btn btn-secondary">
                <Phone className="size-5" aria-hidden="true" />
                Позвонить
              </a>
              <a href={TWO_GIS.directions} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <MapPin className="size-5" aria-hidden="true" />
                Построить маршрут
              </a>
              <BookButton label="Записаться" variant="ghost" />
            </div>
          </div>

          <MapEmbed />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- футер ------------------------------- */

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-line)] py-10">
      <div className="container-x grid gap-6 text-[14px] text-[var(--color-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-[family-name:var(--font-display)] text-[22px] uppercase tracking-[0.08em] text-[var(--color-ink)]">
            Керей
          </span>
          <nav className="flex flex-wrap gap-5" aria-label="Ссылки в подвале">
            <Link href="/#services" className="hover:text-[var(--color-ink)]">
              Услуги
            </Link>
            <Link href="/#reviews" className="hover:text-[var(--color-ink)]">
              Отзывы
            </Link>
            <Link href="/booking" className="hover:text-[var(--color-ink)]">
              Онлайн-запись
            </Link>
            <a href={TWO_GIS.card} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-ink)]">
              2ГИС
            </a>
            <a href={BUSINESS.instagram.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-ink)]">
              Instagram
            </a>
            <Link href="/privacy" className="hover:text-[var(--color-ink)]">
              Политика данных
            </Link>
          </nav>
        </div>

        <div className="metal-line" />

        <div className="grid gap-1">
          <p>
            {BUSINESS.address}, {BUSINESS.city}. {BUSINESS.hours.text}. Телефон:{' '}
            <a href={`tel:${BUSINESS.phone.e164}`} className="hover:text-[var(--color-ink)]">
              {BUSINESS.phone.display}
            </a>
            .
          </p>
          <p>
            © {year} Автокомплекс «{BUSINESS.name}».
            {OWNER_INPUT.legalEntity ? ` ${OWNER_INPUT.legalEntity}` : ''}
          </p>
          <p className="text-[13px]">
            Информация о компании (адрес, часы работы, рейтинг, марки, направления) взята из публичной карточки 2ГИС.
            Изображения на сайте — демонстрационные и заменяются фотографиями сервиса.
          </p>
        </div>
      </div>
    </footer>
  );
}
