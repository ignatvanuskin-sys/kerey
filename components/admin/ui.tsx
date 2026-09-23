'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AdminCard({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card p-4 md:p-5">
      {title || actions ? (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="text-[17px] font-bold">{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function AdminField({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="hint mt-1">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 accent-[var(--color-accent)]"
      />
      {label}
    </label>
  );
}

const STATUS_STYLES: Record<string, string> = {
  new: 'border-[var(--color-accent)] text-[var(--color-accent)]',
  confirmed: 'border-[var(--color-success)] text-[var(--color-success)]',
  rejected: 'border-[var(--color-danger)] text-[var(--color-danger)]',
  cancelled_by_client: 'border-[var(--color-line)] text-[var(--color-muted)]',
  cancelled_by_owner: 'border-[var(--color-line)] text-[var(--color-muted)]',
  no_show: 'border-[var(--color-danger)] text-[var(--color-danger)]',
  done: 'border-[var(--color-success)] text-[var(--color-success)]',
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn('rounded-full border px-3 py-1 text-[13px] font-semibold', STATUS_STYLES[status] ?? '')}>
      {label}
    </span>
  );
}

export function TelegramBadge({ state }: { state: 'none' | 'pending' | 'sent' | 'failed' }) {
  if (state === 'none') return null;
  const map = {
    sent: { text: 'Telegram доставлен', className: 'text-[var(--color-success)]' },
    pending: { text: 'Telegram: отправляется', className: 'text-[var(--color-accent)]' },
    failed: { text: 'Telegram не доставлен', className: 'text-[var(--color-danger)]' },
  } as const;
  const entry = map[state];
  return <span className={cn('text-[13px] font-semibold', entry.className)}>{entry.text}</span>;
}

export function Notice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-[var(--color-danger)] text-[var(--color-danger)]',
    success: 'border-[var(--color-success)] text-[var(--color-success)]',
    info: 'border-[var(--color-line)] text-[var(--color-muted)]',
  } as const;
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={cn('rounded-[var(--radius-control)] border p-3 text-[14px]', styles[kind])}>
      {children}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-16', className)} />;
}
