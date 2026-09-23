'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { GALLERY, HAS_DEMO_IMAGES } from '@/content/gallery';

/**
 * Галерея с лайтбоксом: клик открывает кадр крупно, стрелки листают, Esc закрывает.
 * Изображения пока демонстрационные — подпись под галереей это честно сообщает.
 */
export default function GalleryGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const images = GALLERY;

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + direction + images.length) % images.length;
      });
    },
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [openIndex, close, step]);

  if (images.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)]"
            aria-label={`Открыть изображение: ${image.alt}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Expand
              className="absolute bottom-3 right-3 size-5 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      {HAS_DEMO_IMAGES ? (
        <p className="mt-3 text-[13px] text-[var(--color-muted)]">
          Изображения демонстрационные (в карточке 2ГИС 14 фото) — заменяются фотографиями сервиса.
        </p>
      ) : null}

      {openIndex !== null ? (
        <div
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={images[openIndex].alt}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-white/60"
            aria-label="Закрыть"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIndex].src}
            alt={images[openIndex].alt}
            className="max-h-[82vh] w-auto max-w-full rounded-[var(--radius-card)] object-contain"
          />

          <button
            type="button"
            onClick={() => step(-1)}
            className="absolute left-3 grid size-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-white/60 md:left-6"
            aria-label="Предыдущее изображение"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            className="absolute right-3 grid size-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-white/60 md:right-6"
            aria-label="Следующее изображение"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>

          <p className="absolute bottom-5 left-1/2 max-w-[80vw] -translate-x-1/2 text-center text-[13px] text-white/70">
            {images[openIndex].alt}
          </p>
        </div>
      ) : null}
    </div>
  );
}
