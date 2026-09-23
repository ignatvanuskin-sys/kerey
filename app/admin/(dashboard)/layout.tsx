import { redirect } from 'next/navigation';
import { isAdminRequest } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

/** Every page below /admin (except the login form) requires a valid session cookie (§8). */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminRequest())) redirect('/admin/login');

  return (
    <>
      <AdminNav />
      <main className="container-x py-5 md:py-8">{children}</main>
    </>
  );
}
