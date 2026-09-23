'use client';

import { CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { openBooking } from './booking-ui';

type Props = {
  /** Услуга, которую нужно сразу выбрать в форме (клик по карточке каталога). */
  serviceSlug?: string;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  withIcon?: boolean;
  /** Ссылка вместо кнопки — например, якорь на странице записи. */
  href?: string;
};

export default function BookButton({
  serviceSlug,
  label = 'Записаться',
  className,
  variant = 'primary',
  withIcon = true,
  href,
}: Props) {
  const classes = cn(
    'btn',
    variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-ghost',
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {withIcon ? <CalendarCheck className="size-5" aria-hidden="true" /> : null}
        {label}
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={() => openBooking(serviceSlug)}>
      {withIcon ? <CalendarCheck className="size-5" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
