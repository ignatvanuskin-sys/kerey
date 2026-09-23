/**
 * Repositories: services, reviews, photos, rate limiting.
 */
import { getDb, nowIso } from './client';

export type ServiceRow = {
  id: number;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  icon: string;
  price_from: number | null;
  price_note: string | null;
  duration_min: number;
  is_active: number;
  is_featured: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ServiceInput = {
  slug: string;
  title: string;
  short_description?: string;
  description?: string;
  icon?: string;
  price_from?: number | null;
  price_note?: string | null;
  duration_min?: number;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
};

export function listServices(includeInactive = false): ServiceRow[] {
  const sql = includeInactive
    ? 'SELECT * FROM services ORDER BY sort_order, id'
    : 'SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order, id';
  return getDb().prepare(sql).all() as ServiceRow[];
}

export function getService(id: number): ServiceRow | null {
  return (getDb().prepare('SELECT * FROM services WHERE id = ?').get(id) as ServiceRow | undefined) ?? null;
}

export function getServiceBySlug(slug: string): ServiceRow | null {
  return (
    (getDb().prepare('SELECT * FROM services WHERE slug = ?').get(slug) as ServiceRow | undefined) ?? null
  );
}

export function createService(input: ServiceInput): ServiceRow {
  const ts = nowIso();
  const info = getDb()
    .prepare(
      `INSERT INTO services
        (slug, title, short_description, description, icon, price_from, price_note, duration_min,
         is_active, is_featured, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.slug,
      input.title,
      input.short_description ?? '',
      input.description ?? '',
      input.icon ?? 'wrench',
      input.price_from ?? null,
      input.price_note ?? null,
      input.duration_min ?? 60,
      input.is_active === false ? 0 : 1,
      input.is_featured ? 1 : 0,
      input.sort_order ?? nextServiceSortOrder(),
      ts,
      ts,
    );
  return getService(Number(info.lastInsertRowid))!;
}

function nextServiceSortOrder(): number {
  const row = getDb().prepare('SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM services').get() as {
    next: number;
  };
  return row.next;
}

export function updateService(id: number, patch: Partial<ServiceInput>): ServiceRow | null {
  const current = getService(id);
  if (!current) return null;

  const merged = {
    slug: patch.slug ?? current.slug,
    title: patch.title ?? current.title,
    short_description: patch.short_description ?? current.short_description,
    description: patch.description ?? current.description,
    icon: patch.icon ?? current.icon,
    price_from: patch.price_from === undefined ? current.price_from : patch.price_from,
    price_note: patch.price_note === undefined ? current.price_note : patch.price_note,
    duration_min: patch.duration_min ?? current.duration_min,
    is_active: patch.is_active === undefined ? Boolean(current.is_active) : patch.is_active,
    is_featured: patch.is_featured === undefined ? Boolean(current.is_featured) : patch.is_featured,
    sort_order: patch.sort_order ?? current.sort_order,
  };

  getDb()
    .prepare(
      `UPDATE services SET
         slug = ?, title = ?, short_description = ?, description = ?, icon = ?,
         price_from = ?, price_note = ?, duration_min = ?, is_active = ?, is_featured = ?,
         sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      merged.slug,
      merged.title,
      merged.short_description,
      merged.description,
      merged.icon,
      merged.price_from,
      merged.price_note,
      merged.duration_min,
      merged.is_active ? 1 : 0,
      merged.is_featured ? 1 : 0,
      merged.sort_order,
      nowIso(),
      id,
    );

  return getService(id);
}

export function deleteService(id: number): void {
  getDb().prepare('DELETE FROM services WHERE id = ?').run(id);
}

/** Drag-and-drop / up-down ordering in the admin panel. */
export function reorderServices(orderedIds: number[]): ServiceRow[] {
  const db = getDb();
  const update = db.prepare('UPDATE services SET sort_order = ?, updated_at = ? WHERE id = ?');
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => update.run((index + 1) * 10, nowIso(), id));
  });
  tx.immediate();
  return listServices(true);
}

/* ------------------------------- reviews -------------------------------- */

export type ReviewRow = {
  id: number;
  author: string;
  text: string;
  rating: number | null;
  review_date: string | null;
  is_published: number;
  sort_order: number;
  created_at: string;
};

export function listReviews(publishedOnly = true): ReviewRow[] {
  const sql = publishedOnly
    ? 'SELECT * FROM reviews WHERE is_published = 1 ORDER BY sort_order, id DESC'
    : 'SELECT * FROM reviews ORDER BY sort_order, id DESC';
  return getDb().prepare(sql).all() as ReviewRow[];
}

export function createReview(input: {
  author: string;
  text: string;
  rating?: number | null;
  review_date?: string | null;
  is_published?: boolean;
}): ReviewRow {
  const info = getDb()
    .prepare(
      `INSERT INTO reviews (author, text, rating, review_date, is_published, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.author,
      input.text,
      input.rating ?? null,
      input.review_date ?? null,
      input.is_published === false ? 0 : 1,
      0,
      nowIso(),
    );
  return getDb().prepare('SELECT * FROM reviews WHERE id = ?').get(Number(info.lastInsertRowid)) as ReviewRow;
}

export function updateReview(
  id: number,
  patch: { author?: string; text?: string; rating?: number | null; is_published?: boolean; sort_order?: number },
): void {
  const current = getDb().prepare('SELECT * FROM reviews WHERE id = ?').get(id) as ReviewRow | undefined;
  if (!current) return;
  getDb()
    .prepare('UPDATE reviews SET author = ?, text = ?, rating = ?, is_published = ?, sort_order = ? WHERE id = ?')
    .run(
      patch.author ?? current.author,
      patch.text ?? current.text,
      patch.rating === undefined ? current.rating : patch.rating,
      patch.is_published === undefined ? current.is_published : patch.is_published ? 1 : 0,
      patch.sort_order ?? current.sort_order,
      id,
    );
}

export function deleteReview(id: number): void {
  getDb().prepare('DELETE FROM reviews WHERE id = ?').run(id);
}

/* -------------------------------- photos -------------------------------- */

export type PhotoRow = {
  id: number;
  url: string;
  alt: string;
  sort_order: number;
  is_published: number;
  created_at: string;
};

export function listPhotos(publishedOnly = true): PhotoRow[] {
  const sql = publishedOnly
    ? 'SELECT * FROM photos WHERE is_published = 1 ORDER BY sort_order, id'
    : 'SELECT * FROM photos ORDER BY sort_order, id';
  return getDb().prepare(sql).all() as PhotoRow[];
}

export function createPhoto(input: { url: string; alt?: string; sort_order?: number }): PhotoRow {
  const info = getDb()
    .prepare('INSERT INTO photos (url, alt, sort_order, is_published, created_at) VALUES (?, ?, ?, 1, ?)')
    .run(input.url, input.alt ?? '', input.sort_order ?? 0, nowIso());
  return getDb().prepare('SELECT * FROM photos WHERE id = ?').get(Number(info.lastInsertRowid)) as PhotoRow;
}

export function updatePhoto(id: number, patch: { url?: string; alt?: string; sort_order?: number; is_published?: boolean }): void {
  const current = getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id) as PhotoRow | undefined;
  if (!current) return;
  getDb()
    .prepare('UPDATE photos SET url = ?, alt = ?, sort_order = ?, is_published = ? WHERE id = ?')
    .run(
      patch.url ?? current.url,
      patch.alt ?? current.alt,
      patch.sort_order ?? current.sort_order,
      patch.is_published === undefined ? current.is_published : patch.is_published ? 1 : 0,
      id,
    );
}

export function deletePhoto(id: number): void {
  getDb().prepare('DELETE FROM photos WHERE id = ?').run(id);
}

/* ------------------------------ rate limits ----------------------------- */

/**
 * Fixed-window counter. Returns the number of hits inside the current window.
 * Stored in the DB because in-memory counters do not survive serverless cold starts (§10).
 */
export function hitRateLimit(key: string, windowSeconds: number, now: Date = new Date()): number {
  const db = getDb();
  const bucketMs = Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000;
  const bucket = new Date(bucketMs).toISOString();

  db.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
  ).run(key, bucket);

  const row = db
    .prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?')
    .get(key, bucket) as { count: number } | undefined;

  // Opportunistic cleanup of expired buckets (cheap, no scheduler needed).
  if (Math.random() < 0.02) {
    db.prepare('DELETE FROM rate_limits WHERE window_start < ?').run(
      new Date(now.getTime() - 7 * 86_400_000).toISOString(),
    );
  }

  return row?.count ?? 1;
}

export function resetRateLimit(key: string): void {
  getDb().prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
}
/* --------------------------- rate limit (read) --------------------------- */

/** Current counter value of a fixed window without incrementing it. */
export function rateLimitCount(key: string, windowSeconds: number, now: Date = new Date()): number {
  const bucketMs = Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000;
  const row = getDb()
    .prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?')
    .get(key, new Date(bucketMs).toISOString()) as { count: number } | undefined;
  return row?.count ?? 0;
}
