'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Phone, X } from 'lucide-react';
import { BUSINESS } from '@/content/business';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import BookButton from '@/components/booking/BookButton';

const NAV = [
  { href: '/#services', label: 'Услуги' },
  { href: '/#how', label: 'Как записаться' },
  { href: '/#brands', label: 'Марки' },
  { href: '/#contacts', label: 'Контакты' },
];

export default function Header({ phoneDisplay, phoneE164 }: { phoneDisplay: string; phoneE164: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-bg)]/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-baseline gap-2" aria-label={`${BUSINESS.name} — на главную`}>
          <span className="text-[22px] font-extrabold tracking-[0.08em] text-[var(--color-ink)]">
            {BUSINESS.name.toUpperCase()}
          </span>
          <span className="hidden text-[13px] text-[var(--color-muted)] sm:inline">{BUSINESS.descriptor}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Основная навигация">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-[15px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${phoneE164}`}
            onClick={() => track('click_phone', { place: 'header' })}
            className="hidden text-[15px] font-semibold hover:text-[var(--color-accent)] lg:inline"
          >
            {phoneDisplay}
          </a>
          <BookButton className="!min-h-[44px] !px-4 text-[15px]" label="Записаться" source="header" />
          <button
            type="button"
            className="btn btn-secondary !min-h-[44px] !px-3 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className={cn('border-t border-[var(--color-line)] bg-[var(--color-surface)] md:hidden')}
      >
        <nav className="container-x flex flex-col py-2" aria-label="Мобильная навигация">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="min-h-[48px] py-3 text-[16px]"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a
            href={`tel:${phoneE164}`}
            className="flex min-h-[48px] items-center gap-2 py-3 text-[16px] font-semibold"
            onClick={() => {
              track('click_phone', { place: 'mobile_menu' });
              setOpen(false);
            }}
          >
            <Phone className="size-5" aria-hidden="true" />
            {phoneDisplay}
          </a>
        </nav>
      </div>
    </header>
  );
}
