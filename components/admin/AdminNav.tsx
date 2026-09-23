'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Clock, Image, LogOut, Settings, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin/bookings', label: 'Записи', icon: Calendar },
  { href: '/admin/services', label: 'Услуги', icon: Wrench },
  { href: '/admin/schedule', label: 'График', icon: Clock },
  { href: '/admin/content', label: 'Контент', icon: Image },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="container-x flex h-14 items-center justify-between gap-3">
        <Link href="/admin/bookings" className="font-extrabold tracking-[0.06em]">
          КЕРЕЙ · АДМИНКА
        </Link>
        <button type="button" className="btn btn-secondary !min-h-[40px] !px-3 text-[14px]" onClick={() => void logout()}>
          <LogOut className="size-4" aria-hidden="true" />
          Выйти
        </button>
      </div>

      <nav className="no-scrollbar container-x flex gap-1 overflow-x-auto pb-2" aria-label="Разделы админки">
        {LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[14px]',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]'
                  : 'border-[var(--color-line)] text-[var(--color-muted)]',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
