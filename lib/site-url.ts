/**
 * Публичный адрес сайта — используется в Open Graph, sitemap и robots.
 *
 * Порядок определения:
 *  1. PUBLIC_BASE_URL — если задан вручную (свой домен);
 *  2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL — Vercel подставляет сам,
 *     поэтому на хостинге адрес правильный даже без ручных переменных;
 *  3. http://localhost:3000 — локальная разработка.
 */
export function siteUrl(): string {
  const explicit = process.env.PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

/** Работает ли сайт на Vercel (там файловая система только для чтения). */
export function isServerless(): boolean {
  return Boolean(process.env.VERCEL);
}
