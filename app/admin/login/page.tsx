import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin, isDemoAccess } from '@/lib/auth';
import AdminLogin from '@/components/admin/AdminLogin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Вход в панель заявок',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');

  const demoAccess = await isDemoAccess();

  return (
    <main className="container-x flex min-h-dvh max-w-[460px] flex-col justify-center py-12">
      <AdminLogin demoAccess={demoAccess} />
    </main>
  );
}
