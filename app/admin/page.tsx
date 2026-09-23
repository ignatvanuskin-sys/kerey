import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getBookings, getDashboard } from '@/lib/booking';
import { isStorageWritable } from '@/lib/storage';
import AdminPanel from '@/components/admin/AdminPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Заявки',
  robots: { index: false, follow: false, nocache: true },
};

/** Панель владельца: счётчики и список заявок со сменой статуса. */
export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [bookings, dashboard, storageReady] = await Promise.all([
    getBookings(),
    getDashboard(),
    isStorageWritable(),
  ]);

  return (
    <main className="min-h-dvh pb-16">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-x flex h-16 items-center justify-between">
          <a href="/admin" className="font-[family-name:var(--font-display)] text-[20px] uppercase tracking-[0.08em]">
            Керей · панель заявок
          </a>
          <Link href="/" className="hint hover:text-[var(--color-ink)]">
            Открыть сайт →
          </Link>
        </div>
      </header>

      <div className="container-x grid gap-6 py-7">
        {!storageReady ? (
          <p
            role="status"
            className="rounded-[var(--radius-card)] border border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-5 text-[14px] leading-relaxed"
          >
            <strong className="block">Хранилище заявок не подключено.</strong>
            Этот сервер не сохраняет файлы, поэтому новые заявки не записываются. Подключите базу
            (Vercel → Storage → Redis/Upstash или PostgreSQL) и задайте переменные окружения
            <code className="mx-1">KV_REST_API_URL</code> и<code className="mx-1">KV_REST_API_TOKEN</code>,
            затем перезапустите деплой. До этого записывайте клиентов по телефону.
          </p>
        ) : null}

        <AdminPanel initialBookings={bookings} dashboard={dashboard} />
      </div>
    </main>
  );
}
