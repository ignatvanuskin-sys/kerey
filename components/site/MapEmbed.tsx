'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { BUSINESS, TWO_GIS } from '@/content/business';

const { lat, lon } = BUSINESS.geo;

/** Карта подгружается только по клику — это экономит трафик и не тормозит первый экран. */
const EMBED_SRC = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.006}%2C${lat - 0.004}%2C${
  lon + 0.006
}%2C${lat + 0.004
}&layer=mapnik&marker=${lat}%2C${lon}`;

export default function MapEmbed() {
  const [shown, setShown] = useState(false);

  return (
    <div className="card relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:min-h-[420px]">
      {shown ? (
        <iframe
          title={`Карта: ${BUSINESS.name}, ${BUSINESS.address}`}
          src={EMBED_SRC}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface-2)] text-center"
        >
          <span className="grid-texture absolute inset-0 opacity-60" aria-hidden="true" />
          <MapPin className="size-9 text-[var(--color-accent)]" aria-hidden="true" />
          <span className="relative font-semibold">Показать карту</span>
          <span className="hint relative max-w-[24ch]">
            {BUSINESS.address}, {BUSINESS.city}
          </span>
        </button>
      )}

      {/* Кнопка маршрута вверху: низ карты оставляем свободным для подписи OSM */}
      <a
        href={TWO_GIS.directions}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-bg)]/92 px-4 py-2.5 text-[14px] font-semibold backdrop-blur transition-colors hover:border-[var(--color-accent)]"
      >
        <MapPin className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
        Построить маршрут в 2ГИС
      </a>
    </div>
  );
}
