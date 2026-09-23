/**
 * Server-side data loader for the public pages.
 * Never throws: an empty or missing database degrades into hidden blocks instead of a 500 (QA 12).
 */
import { listPhotos, listReviews, listServices, type PhotoRow, type ReviewRow, type ServiceRow } from '@/db/repo';
import { listDaysOff, getSettings, type DayOffRow } from '@/lib/settings-store';
import { effectiveContacts, type Settings } from '@/lib/settings';

export type SiteData = {
  services: ServiceRow[];
  reviews: ReviewRow[];
  photos: PhotoRow[];
  settings: Settings;
  daysOff: DayOffRow[];
  contacts: ReturnType<typeof effectiveContacts>;
  degraded: boolean;
};

export function loadSiteData(): SiteData {
  try {
    const settings = getSettings();
    return {
      services: listServices(false),
      reviews: listReviews(true),
      photos: listPhotos(true),
      settings,
      daysOff: listDaysOff(),
      contacts: effectiveContacts(settings),
      degraded: false,
    };
  } catch (error) {
    console.error('[site-data] failed to load, falling back to empty content', error);
    const settings = getSettings();
    return {
      services: [],
      reviews: [],
      photos: [],
      settings,
      daysOff: [],
      contacts: effectiveContacts(settings),
      degraded: true,
    };
  }
}
