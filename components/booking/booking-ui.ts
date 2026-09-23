/**
 * Общая точка открытия формы записи: любая кнопка «Записаться» на сайте
 * открывает один и тот же мастер через событие окна. Так на странице не появляется
 * несколько копий формы, а состояние не теряется.
 */
export const BOOKING_EVENT = 'kerey:open-booking';

export function openBooking(serviceSlug?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BOOKING_EVENT, { detail: { serviceSlug } }));
}

export function onBookingOpen(handler: (serviceSlug?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ serviceSlug?: string }>).detail;
    handler(detail?.serviceSlug);
  };
  window.addEventListener(BOOKING_EVENT, listener);
  return () => window.removeEventListener(BOOKING_EVENT, listener);
}
