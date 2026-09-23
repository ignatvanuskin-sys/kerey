/** Shape shared between the landing page (server) and the booking wizard (client). */
export type ServiceOption = {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  icon: string;
  durationMin: number;
  priceFrom: number | null;
  priceNote: string | null;
};

export function toServiceOption(service: {
  id: number;
  slug: string;
  title: string;
  short_description: string;
  icon: string;
  duration_min: number;
  price_from: number | null;
  price_note: string | null;
}): ServiceOption {
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    shortDescription: service.short_description,
    icon: service.icon,
    durationMin: service.duration_min,
    priceFrom: service.price_from,
    priceNote: service.price_note,
  };
}
