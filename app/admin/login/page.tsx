import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import AdminLogin from '@/components/admin/AdminLogin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Вход в панель заявок',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');

  return (
    <main className="container-x flex min-h-dvh max-w-[440px] flex-col justify-center py-12">
      <AdminLogin />
    </main>
  );
}
