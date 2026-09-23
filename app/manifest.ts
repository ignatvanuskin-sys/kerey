import type { MetadataRoute } from 'next';
import { BUSINESS } from '@/content/business';

/** Веб-манифест: сайт можно добавить на домашний экран телефона. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Керей — ${BUSINESS.kind}, ${BUSINESS.city}`,
    short_name: 'Керей',
    description:
      'Ремонт ходовой части, ремонт бензиновых двигателей, развал-схождение и запчасти для иномарок в Кокшетау. Онлайн-запись.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0C0E',
    theme_color: '#0B0C0E',
    lang: 'ru',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
