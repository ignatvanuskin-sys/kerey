/**
 * Analytics events (§11), disabled by default and enabled only through env.
 * `track` is a no-op unless NEXT_PUBLIC_YM_ID or NEXT_PUBLIC_GA_ID is set.
 */

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    ym?: (id: number, action: string, goal: string, params?: Params) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const ANALYTICS_EVENTS = [
  'booking_open',
  'booking_step_1',
  'booking_step_2',
  'booking_step_3',
  'booking_step_4',
  'booking_submit',
  'booking_success',
  'click_phone',
  'click_whatsapp',
  'click_route',
  'click_2gis_reviews',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

function ymId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_YM_ID;
  return value && value.trim() ? value.trim() : undefined;
}

function gaId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_GA_ID;
  return value && value.trim() ? value.trim() : undefined;
}

export function analyticsEnabled(): boolean {
  return Boolean(ymId() ?? gaId());
}

export function track(event: AnalyticsEvent | string, params: Params = {}): void {
  if (typeof window === 'undefined') return;

  const clean: Params = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ) as Params;

  try {
    const yandex = ymId();
    if (yandex && typeof window.ym === 'function') {
      window.ym(Number(yandex), 'reachGoal', event, clean);
    }
    if (gaId() && typeof window.gtag === 'function') {
      window.gtag('event', event, clean);
    }
  } catch {
    // analytics must never break the UI
  }
}
