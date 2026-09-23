'use client';

import { useEffect, useRef, useState } from 'react';
import BookingWizard from './BookingWizard';
import { onBookingOpen } from './booking-ui';

/**
 * Одна форма записи на всю страницу: на телефоне — «шторка» снизу, на компьютере — окно по центру.
 * Любая кнопка «Записаться» открывает её через событие (components/booking/booking-ui.ts).
 */
export default function BookingRoot() {
  const [open, setOpen] = useState(false);
  const [serviceSlug, setServiceSlug] = useState<string | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onBookingOpen((slug) => {
        setServiceSlug(slug);
        setOpen(true);
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const focusTimer = setTimeout(() => panelRef.current?.focus(), 40);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Онлайн-запись в автокомплекс «Керей»"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="sheet-in w-full overflow-hidden rounded-t-[18px] border border-[var(--color-line)] bg-[var(--color-surface)] outline-none md:max-w-[620px] md:rounded-[var(--radius-card)]"
      >
        <BookingWizard
          key={serviceSlug ?? 'any'}
          initialServiceSlug={serviceSlug}
          onClose={() => setOpen(false)}
        />
      </div>
    </div>
  );
}
