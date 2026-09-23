'use client';

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AccordionItem = { question: string; answer: string };

/** Аккордеон на нативных кнопках: работает с клавиатуры и со скринридером. */
export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.question}>
            <h3 className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex min-h-[62px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:text-[var(--color-accent)] md:px-7"
              >
                <span className="font-[family-name:var(--font-display)] text-[17px] uppercase leading-snug tracking-[0.01em]">
                  {item.question}
                </span>
                <Plus
                  className={cn(
                    'size-5 shrink-0 text-[var(--color-accent)] transition-transform duration-200',
                    open && 'rotate-45',
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="px-5 pb-6 text-[15px] leading-relaxed text-[var(--color-muted)] md:px-7"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
