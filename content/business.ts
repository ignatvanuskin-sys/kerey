/**
 * BUSIENSS DATA — the single source of truth about the business (§1 of the master prompt).
 * Facts below are taken from the public 2GIS card of «Керей» (Кокшетау) as of 2026-09-21.
 * NEVER invent facts here that are not confirmed by the owner (see §12).
 */

export const TZ = 'Asia/Almaty';

export type WhatsappContact = { display: string; wa: string };

export const BUSINESS = {
  name: 'Керей',
  descriptor: 'автокомплекс',
  city: 'Кокшетау',
  address: 'ул. Шокана Уалиханова, 94',
  geo: { lat: 53.274052, lon: 69.387408 },
  timezone: TZ, // never hardcode a UTC offset
  hours: {
    text: 'Ежедневно 08:30–21:00',
    open: '08:30',
    close: '21:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7] as number[],
  },
  phone: { display: '+7 705 206 21 64', e164: '+77052062164' },
  whatsapp: [
    { display: '+7 705 206 21 64', wa: '77052062164' },
    { display: '+7 771 371 49 22', wa: '77713714922' },
  ] as WhatsappContact[],
  instagram: { handle: 'kerey_007', url: 'https://instagram.com/kerey_007' },
  twogis: {
    card: 'https://2gis.kz/kokshetau/firm/70000001034197419',
    reviews: 'https://2gis.kz/kokshetau/firm/70000001034197419/tab/reviews',
    route: 'https://2gis.kz/kokshetau/directions/points/%7C69.387408%2C53.274052%3B70000001034197419',
    rating: 4.9,
    ratingsCount: 201,
    reviewsCount: 132,
    photosCount: 13,
    asOf: '2026-09-21',
  },
  /**
   * Brands from the 2GIS card (35). Rendered as plain text chips — no marque logos (§0.6).
   * Do not add brands that are not in this list.
   */
  brands: [
    'Audi', 'Chery', 'Chevrolet', 'Citroen', 'Daewoo', 'FAW', 'Fiat', 'Ford', 'Geely', 'Honda',
    'Hyundai', 'Infiniti', 'JAC', 'Kia', 'Lada (ВАЗ)', 'Lexus', 'Lifan', 'Mazda', 'Mercedes-Benz',
    'MINI', 'Mitsubishi', 'Nissan', 'Opel', 'Ravon', 'Renault', 'SEAT', 'Skoda', 'SsangYong',
    'Subaru', 'Suzuki', 'Toyota', 'Volkswagen', 'Volvo', 'ЗАЗ', 'УАЗ',
  ],
  /** Map links for the contacts block. */
  maps: {
    google: 'https://www.google.com/maps/search/?api=1&query=53.274052,69.387408',
    yandex: 'https://yandex.kz/maps/?pt=69.387408,53.274052&z=17&l=map',
    osmEmbed:
      'https://www.openstreetmap.org/export/embed.html?bbox=69.379408%2C53.270052%2C69.395408%2C53.278052&layer=mapnik&marker=53.274052%2C69.387408',
  },
} as const;

/** Owner has not provided legal entity details yet — footer shows a TODO placeholder. */
export const LEGAL_ENTITY = 'TODO_OWNER' as const;

/**
 * Texts that must stay empty until the owner confirms them (§12).
 * While a field is `null`, the corresponding block is hidden on the site.
 */
export const OWNER_TEXTS = {
  warranty: null as string | null,
  experience: null as string | null,
  equipment: null as string | null,
} as const;

export const SEO = {
  title: 'Керей — автокомплекс в Кокшетау | Запись на СТО онлайн',
  description:
    'Автосервис «Керей» в Кокшетау: ремонт и обслуживание легковых автомобилей. Онлайн-запись за минуту, ежедневно 08:30–21:00. ул. Шокана Уалиханова, 94.',
  keywords: 'автосервис Кокшетау, СТО Кокшетау, диагностика авто Кокшетау, авторемонт Кокшетау',
} as const;
