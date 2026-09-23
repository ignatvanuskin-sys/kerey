'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AccordionItem = { question: string; answer: string };

/** Accessible accordion: real buttons, aria-expanded/aria-controls, keyboard operable (§5). */
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
                className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-4 text-left text-[17px] font-semibold hover:text-[var(--color-accent)] md:px-5"
                onClick={() => setOpenIndex(open ? null : index)}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={cn('size-5 shrink-0 transition-transform duration-200', open && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="px-4 pb-5 text-[15px] leading-relaxed text-[var(--color-muted)] md:px-5"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
