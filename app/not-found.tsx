import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS } from '@/content/business';

export const metadata: Metadata = {
  title: 'Страница не найдена',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="container-x flex min-h-dvh max-w-[680px] flex-col justify-center py-16">
      <p className="font-[family-name:var(--font-display)] text-[88px] leading-none text-[var(--color-accent)]">404</p>
      <h1 className="h2 mt-4">Страница не найдена</h1>
      <p className="mt-3 text-[16px] text-[var(--color-muted)]">
        Возможно, ссылка устарела. Записаться на ремонт можно в любое время — это занимает меньше минуты.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/booking" className="btn btn-primary">
          Записаться онлайн
        </Link>
        <Link href="/" className="btn btn-secondary">
          На главную
        </Link>
        <a href={`tel:${BUSINESS.phone.e164}`} className="btn btn-ghost">
          {BUSINESS.phone.display}
        </a>
      </div>
    </main>
  );
}
