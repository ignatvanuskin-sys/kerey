import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getBookings, getDashboard } from '@/lib/booking';
import { isTemporaryStorage } from '@/lib/storage';
import AdminPanel from '@/components/admin/AdminPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Заявки',
  robots: { index: false, follow: false, nocache: true },
};

/** Панель владельца: счётчики и список заявок со сменой статуса. */
export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [bookings, dashboard, temporary] = await Promise.all([
    getBookings(),
    getDashboard(),
    isTemporaryStorage(),
  ]);

  return (
    <main className="min-h-dvh pb-16">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-x flex h-16 items-center justify-between">
          <a
            href="/admin"
            className="inline-flex min-h-[44px] items-center font-[family-name:var(--font-display)] text-[20px] uppercase tracking-[0.08em]"
          >
            Керей · панель заявок
          </a>
          <Link href="/" className="hint inline-flex min-h-[44px] items-center hover:text-[var(--color-ink)]">
            Открыть сайт →
          </Link>
        </div>
      </header>

      <div className="container-x grid gap-6 py-7">
        {temporary ? (
          <p
            role="status"
            className="rounded-[var(--radius-card)] border border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-5 text-[14px] leading-relaxed"
          >
            <strong className="block">Демонстрационный режим</strong>
            База не подключена, поэтому заявки сохраняются во временном хранилище и могут исчезнуть после
            перезапуска сервера. Для рабочего запуска подключите базу (Vercel → Storage → Upstash Redis) и задайте
            <code className="mx-1">ADMIN_PASSWORD</code> — после этого режим выключится сам.
          </p>
        ) : null}

        <AdminPanel initialBookings={bookings} dashboard={dashboard} />
      </div>
    </main>
  );
}
