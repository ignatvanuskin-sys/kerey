import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { BUSINESS, SEO } from '@/content/business';
import { publicBaseUrl } from '@/lib/env';
import Analytics from '@/components/Analytics';

const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  metadataBase: new URL(publicBaseUrl()),
  title: {
    default: SEO.title,
    template: '%s | Керей — автокомплекс в Кокшетау',
  },
  description: SEO.description,
  keywords: SEO.keywords,
  applicationName: 'Керей — автокомплекс',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    url: '/',
    siteName: `${BUSINESS.name} — ${BUSINESS.descriptor}`,
    title: SEO.title,
    description: SEO.description,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: `${BUSINESS.name}, ${BUSINESS.descriptor} в ${BUSINESS.city}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO.title,
    description: SEO.description,
    images: ['/og.jpg'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: '#0E0F11',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Local-business structured data (§11). No aggregateRating: the rating belongs to 2GIS, not to us. */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: `${BUSINESS.name} — ${BUSINESS.descriptor}`,
    description: SEO.description,
    url: publicBaseUrl(),
    telephone: BUSINESS.phone.e164,
    image: `${publicBaseUrl()}/og.jpg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address,
      addressLocality: BUSINESS.city,
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
    sameAs: [BUSINESS.twogis.card, BUSINESS.instagram.url],
    areaServed: { '@type': 'City', name: BUSINESS.city },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          // Static, developer-authored JSON — no user input is interpolated here.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
