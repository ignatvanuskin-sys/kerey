'use client';

import { Phone, MessageCircle, Calendar } from 'lucide-react';
import { track } from '@/lib/analytics';
import { openBooking } from '@/lib/booking-ui';

type Props = { phoneDisplay: string; phoneE164: string; waNumber: string };

/** Mobile-only action bar. Content is padded at the bottom so nothing is covered (§4). */
export default function StickyBar({ phoneDisplay, phoneE164, waNumber }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur md:hidden">
      <div
        className="grid grid-cols-3 gap-2 px-3 py-2"
        style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        <a
          href={`tel:${phoneE164}`}
          onClick={() => track('click_phone', { place: 'sticky' })}
          className="btn btn-secondary !px-2 text-[15px]"
          aria-label={`Позвонить ${phoneDisplay}`}
        >
          <Phone className="size-5" aria-hidden="true" />
          Позвонить
        </a>
        <a
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('click_whatsapp', { place: 'sticky' })}
          className="btn btn-secondary !px-2 text-[15px]"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          WhatsApp
        </a>
        <button
          type="button"
          className="btn btn-primary !px-2 text-[15px]"
          onClick={() => {
            track('booking_open', { source: 'sticky' });
            openBooking();
          }}
        >
          <Calendar className="size-5" aria-hidden="true" />
          Записаться
        </button>
      </div>
    </div>
  );
}
