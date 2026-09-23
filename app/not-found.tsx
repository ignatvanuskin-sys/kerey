import Link from 'next/link';
import { BUSINESS } from '@/content/business';

export default function NotFound() {
  return (
    <main className="container-x flex min-h-dvh max-w-[640px] flex-col items-start justify-center py-16">
      <p className="text-[64px] font-extrabold leading-none text-[var(--color-accent)]">404</p>
      <h1 className="h2 mt-3">Страница не найдена</h1>
      <p className="mt-2 text-[16px] text-[var(--color-muted)]">
        Возможно, ссылка устарела. Записаться на сервис можно в любое время.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/zapis" className="btn btn-primary">
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
