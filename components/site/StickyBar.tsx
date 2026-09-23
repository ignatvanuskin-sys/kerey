'use client';

import { CalendarCheck, Phone } from 'lucide-react';
import { BUSINESS } from '@/content/business';
import { openBooking } from '@/components/booking/booking-ui';

/** Нижняя панель на телефоне: до обеих кнопок достаёт большой палец. */
export default function StickyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-surface)]/96 backdrop-blur md:hidden">
      <div
        className="grid grid-cols-2 gap-2 px-3 pt-2"
        style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        <a href={`tel:${BUSINESS.phone.e164}`} className="btn btn-secondary !min-h-[48px] !px-3 text-[15px]">
          <Phone className="size-5" aria-hidden="true" />
          Позвонить
        </a>
        <button type="button" className="btn btn-primary !min-h-[48px] !px-3 text-[15px]" onClick={() => openBooking()}>
          <CalendarCheck className="size-5" aria-hidden="true" />
          Записаться
        </button>
      </div>
    </div>
  );
}
