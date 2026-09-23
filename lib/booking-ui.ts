/**
 * Tiny event bus so that any "Записаться" button on the page can open the single wizard (§6.2).
 * Plain DOM events — no global state library required.
 */
export const BOOKING_EVENT = 'kerey:open-booking';

export type BookingEventDetail = { serviceSlug?: string };

export function openBooking(serviceSlug?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BookingEventDetail>(BOOKING_EVENT, { detail: { serviceSlug } }));
}

export function onBookingOpen(handler: (detail: BookingEventDetail) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<BookingEventDetail>).detail ?? {});
  window.addEventListener(BOOKING_EVENT, listener);
  return () => window.removeEventListener(BOOKING_EVENT, listener);
}
