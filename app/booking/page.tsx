import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, MapPin, Phone } from 'lucide-react';
import { BUSINESS, SEO, TWO_GIS } from '@/content/business';
import { ratingsWord, reviewsWord } from '@/lib/format';
import BookingWizard from '@/components/booking/BookingWizard';
import Header from '@/components/site/Header';
import { Footer } from '@/components/site/Sections';

export const metadata: Metadata = {
  title: 'Онлайн-запись на ремонт',
  description: `Запишитесь в автокомплекс «Керей» в Кокшетау: выберите услугу, удобный день и время. ${BUSINESS.hours.text}, ${BUSINESS.address}. Подтвердим запись по телефону или в WhatsApp.`,
  alternates: { canonical: '/booking' },
};

/** Отдельная страница записи — удобная ссылка для 2ГИС, Instagram и визиток. */
export default function BookingPage() {
  return (
    <>
      <Header />

      <main id="booking" className="scroll-mt-24 pb-[76px] md:pb-0">
        <div className="container-x grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)] lg:gap-16">
          <div>
            <p className="eyebrow">Онлайн-запись</p>
            <h1 className="h2 mt-4">Записаться в «{BUSINESS.name}»</h1>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-muted)]">
              Пять шагов и меньше минуты: услуга, автомобиль, дата, время и контакты. Свободное время видно сразу,
              а мы подтвердим запись — позвоним или напишем в WhatsApp.
            </p>

            <ul className="mt-7 grid gap-4 text-[15px]">
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                <span>
                  <strong className="block font-semibold">{BUSINESS.hours.text}</strong>
                  <span className="hint">без выходных</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                <span>
                  <strong className="block font-semibold">{BUSINESS.address}</strong>
                  <span className="hint">
                    {BUSINESS.city} · остановка «{BUSINESS.nearestStop.name}» в {BUSINESS.nearestStop.distance}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                <span>
                  <a
                    href={`tel:${BUSINESS.phone.e164}`}
                    className="inline-flex min-h-[44px] items-center font-semibold hover:text-[var(--color-accent)]"
                  >
                    {BUSINESS.phone.display}
                  </a>
                  <span className="hint block">контакт-центр: {BUSINESS.phoneCenterHours}</span>
                </span>
              </li>
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={TWO_GIS.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary !min-h-[48px]"
              >
                Построить маршрут
              </a>
              {BUSINESS.whatsapp.map((entry) => (
                <a
                  key={entry.wa}
                  href={`https://wa.me/${entry.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost !min-h-[48px]"
                >
                  WhatsApp {entry.display}
                </a>
              ))}
            </div>

            <p className="mt-8 text-[14px] text-[var(--color-muted)]">
              {ratingsWord(BUSINESS.rating.ratingsCount)} и {reviewsWord(BUSINESS.rating.reviewsCount)} в карточке
              компании, рейтинг {BUSINESS.rating.value.toLocaleString('ru-RU')}.{' '}
              <a
                href={TWO_GIS.reviews}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                Смотреть отзывы
              </a>
              .
            </p>

            <p className="hint mt-6">
              Нет времени заполнять? Позвоните по номеру{' '}
              <a href={`tel:${BUSINESS.phone.e164}`} className="text-[var(--color-chrome)] underline-offset-4 hover:underline">
                {BUSINESS.phone.display}
              </a>{' '}
              — примем запись по телефону. Или вернитесь{' '}
              <Link href="/" className="text-[var(--color-chrome)] underline-offset-4 hover:underline">
                на главную
              </Link>
              , чтобы посмотреть услуги и отзывы.
            </p>
          </div>

          <div className="card overflow-hidden">
            <BookingWizard embedded />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export const revalidate = 3600;
