'use client';

import type { ReactNode } from 'react';
import { track } from '@/lib/analytics';
import type { AnalyticsEvent } from '@/lib/analytics';

type Props = {
  href: string;
  event: AnalyticsEvent;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  external?: boolean;
  target?: string;
};

/**
 * Anchor that reports an analytics event on click (§11).
 * Renders a normal link, so it keeps working without JavaScript and with keyboard navigation.
 */
export default function TrackedLink({
  href,
  event,
  className,
  children,
  ariaLabel,
  external = false,
  target,
}: Props) {
  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      {...(external ? { rel: 'noopener noreferrer', target: target ?? '_blank' } : {})}
      onClick={() => track(event, { href })}
    >
      {children}
    </a>
  );
}
