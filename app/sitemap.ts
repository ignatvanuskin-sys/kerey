import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/booking`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
