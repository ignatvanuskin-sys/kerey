import type { Metadata } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';
import { loadSiteData } from '@/lib/site-data';
import { toServiceOption } from '@/components/booking/types';
import BookingWizard from '@/components/booking/BookingWizard';
import { BUSINESS } from '@/content/business';
import { publicBaseUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Онлайн-запись на СТО в Кокшетау',
  description:
    'Запишитесь в автокомплекс «Керей» в Кокшетау онлайн: выберите услугу, удобный день и время. Подтвердим запись по телефону или в WhatsApp.',
  alternates: { canonical: '/zapis' },
};

export default function ZapisPage() {
  const data = loadSiteData();
  const serviceOptions = data.services.map(toServiceOption);

  return (
    <main className="min-h-dvh pb-[84px] md:pb-10">
      <div className="container-x py-8 md:py-12">
        <Link href="/" className="hint inline-flex items-center gap-1">
          ← На главную
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
          <div>
            <h1 className="h2">Онлайн-запись в «{BUSINESS.name}»</h1>
            <p className="mt-3 max-w-xl text-[16px] text-[var(--color-muted)]">
              Выберите услугу, автомобиль и удобное время. Мы подтвердим запись по телефону или в WhatsApp.
            </p>

            <ul className="mt-6 grid gap-3 text-[15px]">
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                {BUSINESS.hours.text}
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                {data.contacts.address}, {BUSINESS.city}
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                <a href={`tel:${data.contacts.phoneE164}`} className="font-semibold underline-offset-4 hover:underline">
                  {data.contacts.phoneDisplay}
                </a>
              </li>
            </ul>

            <p className="mt-6 flex flex-wrap items-center gap-2 text-[15px] text-[var(--color-muted)]">
              Или напишите в WhatsApp:
              <a
                href={`https://wa.me/${data.contacts.whatsapp[0].wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--color-ink)] underline-offset-4 hover:underline"
              >
                {data.contacts.whatsapp[0].display}
                <ArrowRight className="ml-1 inline size-4" aria-hidden="true" />
              </a>
            </p>

            <p className="hint mt-6">
              {publicBaseUrl().includes('localhost')
                ? 'Локальная сборка: ссылка для соцсетей и 2ГИС появится после настройки PUBLIC_BASE_URL.'
                : 'Сохраните адрес этой страницы — её удобно давать в 2ГИС, Instagram и на визитках.'}
            </p>

            {fs.existsSync(path.join(process.cwd(), 'public', 'images', 'hero.jpg')) ? null : null}
          </div>

          <div className="card overflow-hidden">
            <BookingWizard
              services={serviceOptions}
              embedded
              phoneDisplay={data.contacts.phoneDisplay}
              phoneE164={data.contacts.phoneE164}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
