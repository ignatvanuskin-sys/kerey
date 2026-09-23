import type { Metadata } from 'next';
import AdminSettings from '@/components/admin/AdminSettings';

export const metadata: Metadata = { title: 'Настройки', robots: { index: false } };

export default function AdminSettingsPage() {
  return <AdminSettings />;
}
