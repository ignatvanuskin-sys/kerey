'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Phone, X } from 'lucide-react';
import { BUSINESS } from '@/content/business';
import { cn } from '@/lib/cn';
import BookButton from '@/components/booking/BookButton';

const NAV = [
  { href: '/#services', label: 'Услуги' },
  { href: '/#about', label: 'О компании' },
  { href: '/#reviews', label: 'Отзывы' },
  { href: '/#faq', label: 'Вопросы' },
  { href: '/#contacts', label: 'Контакты' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  // Компактная шапка после прокрутки — на мобильном освобождает экран.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-bg)]/92 backdrop-blur-md transition-[height] duration-200',
        compact ? 'md:py-0' : 'md:py-1',
      )}
    >
      <div className={cn('container-x flex items-center justify-between gap-3', compact ? 'h-16' : 'h-[72px]')}>
        <Link href="/" className="flex items-center gap-2.5" aria-label="Керей — на главную">
          <span className="font-[family-name:var(--font-display)] text-[26px] font-semibold uppercase leading-none tracking-[0.06em]">
            Керей
          </span>
          <span className="mt-0.5 hidden text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:inline">
            {BUSINESS.kind}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Основная навигация">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14px] uppercase tracking-[0.08em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${BUSINESS.phone.e164}`}
            className="hidden items-center gap-2 text-[15px] font-semibold transition-colors hover:text-[var(--color-accent)] md:inline-flex"
          >
            <Phone className="size-4" aria-hidden="true" />
            {BUSINESS.phone.display}
          </a>
          <BookButton label="Записаться" className="!min-h-[44px] !px-5 !text-[15px]" />
          <button
            type="button"
            className="btn btn-secondary !min-h-[44px] !px-3 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="mobile-nav" hidden={!open} className="border-t border-[var(--color-line)] bg-[var(--color-surface)] lg:hidden">
        <nav className="container-x flex flex-col py-2" aria-label="Мобильная навигация">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[52px] items-center border-b border-[var(--color-line)] text-[15px] uppercase tracking-[0.06em] last:border-b-0"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={`tel:${BUSINESS.phone.e164}`}
            onClick={() => setOpen(false)}
            className="flex min-h-[52px] items-center gap-2 text-[15px] font-semibold text-[var(--color-accent)]"
          >
            <Phone className="size-4" aria-hidden="true" />
            {BUSINESS.phone.display}
          </a>
        </nav>
      </div>
    </header>
  );
}
