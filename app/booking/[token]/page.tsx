import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBookingByToken } from '@/db/bookings';
import { statusLabelRu, TERMINAL_STATUSES } from '@/lib/availability';
import { BUSINESS } from '@/content/business';
import BookingStatusView from '@/components/booking/BookingStatusView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Статус записи',
  robots: { index: false, follow: false },
};

export default async function BookingStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const booking = getBookingByToken(token);
  if (!booking) notFound();

  const initial = {
    number: String(booking.id).padStart(4, '0'),
    status: booking.status,
    statusLabel: statusLabelRu(booking.status),
    serviceTitle: booking.service_title,
    car: `${booking.car_brand} ${booking.car_model}`,
    clientFirstName: booking.client_name.split(' ')[0] || booking.client_name,
    startAt: booking.start_at,
    endAt: booking.end_at,
    address: `${BUSINESS.address}, ${BUSINESS.city}`,
    canCancel: !TERMINAL_STATUSES.includes(booking.status),
  };

  return (
    <main className="container-x max-w-[640px] py-8 md:py-14">
      <Link href="/" className="hint">
        ← {BUSINESS.name} — автокомплекс
      </Link>
      <div className="mt-4">
        <BookingStatusView token={token} initial={initial} />
      </div>
    </main>
  );
}
