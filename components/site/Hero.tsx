import { MapPin, Phone, Star } from 'lucide-react';
import { BUSINESS, TWO_GIS } from '@/content/business';
import { HERO_IMAGE } from '@/content/gallery';
import { ratingsWord, reviewsWord } from '@/lib/format';
import BookButton from '@/components/booking/BookButton';

/**
 * Первый экран отвечает на четыре вопроса: что это, где, почему стоит обратиться
 * и что делать дальше. Единственный H1 на странице.
 */
export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--color-line)]">
      {/* Фон: демонстрационное изображение поверх тёмной основы — если картинку убрать, блок не сломается */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[var(--color-bg)]">
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_80%_0%,rgba(255,90,31,0.16),transparent_55%)]" />
        {/* Телефон получает облегчённую версию — так первый экран рисуется быстрее */}
        <link
          rel="preload"
          as="image"
          href="/images/hero-mobile.jpg"
          imageSrcSet="/images/hero-mobile.jpg 960w, /images/hero.jpg 1920w"
          imageSizes="100vw"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE.src}
          srcSet="/images/hero-mobile.jpg 960w, /images/hero.jpg 1920w"
          sizes="100vw"
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/78 to-[var(--color-bg)]/40" />
        <div className="grid-texture absolute inset-0 opacity-70" />
      </div>

      {/* На телефоне отступы компактнее: так строка рейтинга и часов остаётся над панелью действий */}
      <div className="container-x grid gap-8 pt-9 pb-14 md:gap-10 md:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16 lg:py-28">
        <div>
          <p className="eyebrow">Автокомплекс в Кокшетау</p>

          <h1 className="h1 mt-5 max-w-[16ch]">
            Ремонт <span className="text-[var(--color-accent)]">ходовой</span> и двигателя — с записью онлайн
          </h1>

          <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-ink)]/85 md:mt-6 md:text-[18px]">
            {BUSINESS.rubric} полного цикла: ходовая часть, бензиновые двигатели, развал-схождение и запчасти для
            иномарок. Выбираете удобное время на сайте — мы подтверждаем запись и ждём вас.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-8">
            <BookButton label="Записаться онлайн" className="sm:!px-8" />
            <a
              href={`tel:${BUSINESS.phone.e164}`}
              className="btn btn-secondary sm:!px-7"
              aria-label={`Позвонить по номеру ${BUSINESS.phone.display}`}
            >
              <Phone className="size-5" aria-hidden="true" />
              {BUSINESS.phone.display}
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14px] text-[var(--color-muted)] md:mt-7">
            <a
              href={TWO_GIS.reviews}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[var(--color-ink)] transition-colors hover:text-[var(--color-accent)]"
            >
              <Star className="size-4 fill-[var(--color-accent)] text-[var(--color-accent)]" aria-hidden="true" />
              <strong className="font-semibold">{BUSINESS.rating.value.toLocaleString('ru-RU')}</strong>
              <span className="text-[var(--color-muted)]">
                в {BUSINESS.rating.source} · {ratingsWord(BUSINESS.rating.ratingsCount)} ·{' '}
                {reviewsWord(BUSINESS.rating.reviewsCount)}
              </span>
            </a>

            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
              {BUSINESS.address}
            </span>

            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--color-success)]" aria-hidden="true" />
              {BUSINESS.hours.text}
            </span>
          </div>
        </div>

        {/* Короткая карточка-«паспорт» сервиса: только подтверждённые факты */}
        <dl className="card grid gap-5 bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] p-6 backdrop-blur-sm md:p-7">
          <div>
            <dt className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Направления</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink)]">
              {BUSINESS.subRubrics.join(' · ')}
            </dd>
          </div>
          <div className="metal-line" />
          <div>
            <dt className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Марки</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink)]">
              {BUSINESS.brands.length} марок — от Lada и Daewoo до Mercedes-Benz и Lexus
            </dd>
          </div>
          <div className="metal-line" />
          <div>
            <dt className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Оплата</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink)]">{BUSINESS.payment.join(' · ')}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
