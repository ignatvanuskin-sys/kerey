'use client';

import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { openBooking } from '@/lib/booking-ui';

type Props = {
  /** Pre-selects the service in the wizard (used by the service cards). */
  serviceSlug?: string;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
  withIcon?: boolean;
  /** Landing hero placement, for analytics segmentation. */
  source?: string;
};

export default function BookButton({
  serviceSlug,
  label = 'Записаться',
  className,
  variant = 'primary',
  withIcon = true,
  source = 'site',
}: Props) {
  return (
    <button
      type="button"
      className={cn('btn', variant === 'primary' ? 'btn-primary' : 'btn-secondary', className)}
      onClick={() => {
        track('booking_open', { source, service: serviceSlug ?? 'any' });
        openBooking(serviceSlug);
      }}
    >
      {withIcon ? <Calendar className="size-5" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
