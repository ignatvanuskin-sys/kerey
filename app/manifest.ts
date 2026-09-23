import type { MetadataRoute } from 'next';
import { BUSINESS } from '@/content/business';

/** PWA-манифест: сайт добавляется на домашний экран телефона (§11). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BUSINESS.name} — ${BUSINESS.descriptor}, ${BUSINESS.city}`,
    short_name: BUSINESS.name,
    description:
      'Ремонт и обслуживание легковых автомобилей в Кокшетау. Онлайн-запись на сервис, ежедневно 08:30–21:00.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0E0F11',
    theme_color: '#0E0F11',
    lang: 'ru',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
