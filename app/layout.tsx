import type { Metadata, Viewport } from 'next';
import { Inter, Oswald } from 'next/font/google';
import './globals.css';
import { BUSINESS, SEO, TWO_GIS } from '@/content/business';
import { siteUrl } from '@/lib/site-url';

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Только те начертания, которые реально используются в интерфейсе — меньше весит шрифт.
const oswald = Oswald({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-oswald',
});

/** Адрес сайта определяется в lib/site-url.ts: PUBLIC_BASE_URL → домен Vercel → localhost. */
const baseUrl = siteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: SEO.title,
    template: '%s | Керей — автокомплекс в Кокшетау',
  },
  description: SEO.description,
  keywords: SEO.keywords,
  applicationName: `Керей — ${BUSINESS.kind}`,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    url: '/',
    siteName: `Керей — ${BUSINESS.kind}, ${BUSINESS.city}`,
    title: SEO.title,
    description: SEO.description,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Автокомплекс «Керей» в Кокшетау' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO.title,
    description: SEO.description,
    images: ['/og.jpg'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/icon.svg' },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: '#0B0C0E',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * LocalBusiness-разметка. Только проверенные данные из карточки 2ГИС.
 * aggregateRating сознательно не указываем: рейтинг принадлежит 2ГИС, а не сайту компании.
 */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: `Керей — ${BUSINESS.kind}`,
    description: SEO.description,
    url: baseUrl(),
    telephone: BUSINESS.phone.e164,
    image: `${baseUrl()}/og.jpg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address,
      addressLocality: BUSINESS.city,
      postalCode: BUSINESS.postcode,
      addressCountry: 'KZ',
    },
    geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.geo.lat, longitude: BUSINESS.geo.lon },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: BUSINESS.hours.open,
        closes: BUSINESS.hours.close,
      },
    ],
    areaServed: { '@type': 'City', name: BUSINESS.city },
    sameAs: [TWO_GIS.card, BUSINESS.instagram.url],
    knowsAbout: BUSINESS.subRubrics,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${oswald.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          // Разметка собрана из статических данных проекта, пользовательский ввод сюда не попадает.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
