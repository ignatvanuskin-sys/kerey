import type { Metadata } from 'next';
import AdminServices from '@/components/admin/AdminServices';

export const metadata: Metadata = { title: 'Услуги', robots: { index: false } };

export default function AdminServicesPage() {
  return <AdminServices />;
}
