'use client';

import { useEffect, useRef, useState } from 'react';
import BookingWizard from '@/components/booking/BookingWizard';
import { onBookingOpen } from '@/lib/booking-ui';
import type { ServiceOption } from '@/components/booking/types';

type Props = {
  services: ServiceOption[];
  phoneDisplay: string;
  phoneE164: string;
};

/**
 * Single wizard instance for the whole page: bottom sheet on mobile, dialog on desktop (§6.2).
 * Any BookButton opens it through a DOM event.
 */
export default function BookingRoot({ services, phoneDisplay, phoneE164 }: Props) {
  const [open, setOpen] = useState(false);
  const [serviceSlug, setServiceSlug] = useState<string | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onBookingOpen((detail) => {
        setServiceSlug(detail.serviceSlug);
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
    const timer = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Онлайн-запись"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="slide-up w-full max-h-[92vh] overflow-hidden rounded-t-[20px] border border-[var(--color-line)] bg-[var(--color-surface)] outline-none md:max-w-[560px] md:rounded-[var(--radius-card)]"
      >
        <BookingWizard
          key={serviceSlug ?? 'default'}
          services={services}
          initialServiceSlug={serviceSlug}
          phoneDisplay={phoneDisplay}
          phoneE164={phoneE164}
          onClose={() => setOpen(false)}
        />
      </div>
    </div>
  );
}
