import type { Metadata } from 'next';
import AdminContent from '@/components/admin/AdminContent';

export const metadata: Metadata = { title: 'Контент', robots: { index: false } };

export default function AdminContentPage() {
  return <AdminContent />;
}
