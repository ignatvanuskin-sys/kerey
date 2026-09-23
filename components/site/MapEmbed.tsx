'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { BUSINESS } from '@/content/business';

/** The map loads only after a click, so the first paint stays fast (§11). */
export default function MapEmbed() {
  const [shown, setShown] = useState(false);

  return (
    <div className="card relative aspect-[4/3] w-full overflow-hidden md:aspect-[16/9]">
      {shown ? (
        <iframe
          title={`Карта: ${BUSINESS.name}, ${BUSINESS.address}`}
          src={BUSINESS.maps.osmEmbed}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface-2)] text-[var(--color-ink)]"
        >
          <MapPin className="size-8 text-[var(--color-accent)]" aria-hidden="true" />
          <span className="font-semibold">Показать карту</span>
          <span className="hint">{BUSINESS.address}</span>
        </button>
      )}
      <div className="ornament pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}
