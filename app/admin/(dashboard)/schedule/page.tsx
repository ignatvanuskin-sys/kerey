import type { Metadata } from 'next';
import AdminSchedule from '@/components/admin/AdminSchedule';

export const metadata: Metadata = { title: 'График', robots: { index: false } };

export default function AdminSchedulePage() {
  return <AdminSchedule />;
}
