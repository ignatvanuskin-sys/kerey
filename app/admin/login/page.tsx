import { redirect } from 'next/navigation';
import { isAdminRequest } from '@/lib/auth';
import LoginForm from '@/components/admin/LoginForm';
import { BUSINESS } from '@/content/business';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdminRequest()) redirect('/admin/bookings');

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-4 py-10">
      <h1 className="h2">Админка «{BUSINESS.name}»</h1>
      <p className="mt-2 text-[15px] text-[var(--color-muted)]">Введите пароль владельца.</p>
      <div className="card mt-5 p-5">
        <LoginForm />
      </div>
    </main>
  );
}
