'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { computeOpenStatus, type OpenStatus as Status } from '@/lib/open-status';
import type { Settings } from '@/lib/settings';

type Props = {
  settings: Settings;
  dayOffToday: { local_date: string; open_from: string | null; open_to: string | null } | null;
  /** Rendered on the server so the badge is there before hydration. */
  initial: Status;
  className?: string;
};

export default function OpenStatus({ settings, dayOffToday, initial, className }: Props) {
  const [status, setStatus] = useState<Status>(initial);

  useEffect(() => {
    const update = () => setStatus(computeOpenStatus(settings, dayOffToday, new Date()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [settings, dayOffToday]);

  return (
    <span
      className={cn('chip', className)}
      title="Время указано по Кокшетау (Asia/Almaty)"
      data-open={status.open}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', status.open ? 'bg-[var(--color-success)]' : 'bg-[var(--color-muted)]')}
      />
      {status.label}
    </span>
  );
}
