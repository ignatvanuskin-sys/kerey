import type { MetadataRoute } from 'next';
import { publicBaseUrl } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicBaseUrl();
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/zapis`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
