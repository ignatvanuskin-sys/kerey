import type { Metadata } from 'next';
import AdminBookings from '@/components/admin/AdminBookings';

export const metadata: Metadata = { title: 'Записи', robots: { index: false } };

export default function AdminBookingsPage() {
  return <AdminBookings />;
}
