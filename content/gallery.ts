/**
 * ГАЛЕРЕЯ.
 *
 * В карточке 2ГИС у компании 14 фотографий, но прямых ссылок на файлы карточка не отдаёт
 * (фото-API закрыто), поэтому скачать их автоматически нельзя.
 *
 * Поэтому в галерее стоят ДЕМОНСТРАЦИОННЫЕ изображения — они не выдаются за фотографии
 * компании, а подписаны как демонстрационные (см. `isDemo` и подпись в блоке галереи).
 * Владелец заменяет их своими кадрами: положите файлы в `public/images/` и перечислите
 * их здесь либо удалите демо-записи.
 */

export type GalleryImage = {
  src: string;
  alt: string;
  /** true — изображение демонстрационное, а не реальное фото компании. */
  isDemo: boolean;
};

export const GALLERY: GalleryImage[] = [
  {
    src: '/images/gallery-service-bay.jpg',
    alt: 'Пост в автосервисе: автомобиль на подъёмнике',
    isDemo: true,
  },
  {
    src: '/images/gallery-diagnostics.jpg',
    alt: 'Диагностика автомобиля в тёмном цехе',
    isDemo: true,
  },
  {
    src: '/images/gallery-suspension.jpg',
    alt: 'Ремонт ходовой части: детали подвески крупным планом',
    isDemo: true,
  },
  {
    src: '/images/gallery-tools.jpg',
    alt: 'Инструмент на верстаке в мастерской',
    isDemo: true,
  },
  {
    src: '/images/gallery-wheel.jpg',
    alt: 'Снятое колесо и тормозной механизм',
    isDemo: true,
  },
  {
    src: '/images/gallery-night.jpg',
    alt: 'Освещённый бокс автосервиса вечером',
    isDemo: true,
  },
];

/** Обложка первого экрана. Демонстрационное изображение (не фото компании). */
export const HERO_IMAGE = {
  src: '/images/hero.jpg',
  alt: 'Автомобиль в тёмном боксе автосервиса',
  isDemo: true,
} as const;

/** Есть ли в галерее демонстрационные изображения — чтобы показать подпись. */
export const HAS_DEMO_IMAGES = GALLERY.some((image) => image.isDemo);
