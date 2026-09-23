import type { MetadataRoute } from 'next';
import { publicBaseUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = publicBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Booking pages contain personal links; the admin panel must never be indexed (§11).
        disallow: ['/admin', '/admin/', '/booking/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
