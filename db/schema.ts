/**
 * Database schema (SQLite dialect). Applied idempotently on every cold start
 * (`CREATE TABLE IF NOT EXISTS`) and by `npm run db:migrate`.
 *
 * Decisions (documented in README → «Допущения»):
 *  - timestamps are ISO-8601 UTC strings (TEXT) — sortable and TZ-safe;
 *  - `bookings.id` is the human-facing booking number (№0042);
 *  - `day_locks` serialises concurrent bookings for the same local date.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS services (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT    NOT NULL UNIQUE,
  title             TEXT    NOT NULL,
  short_description TEXT    NOT NULL DEFAULT '',
  description       TEXT    NOT NULL DEFAULT '',
  icon              TEXT    NOT NULL DEFAULT 'wrench',
  price_from        INTEGER,
  price_note        TEXT,
  duration_min      INTEGER NOT NULL DEFAULT 60,
  is_active         INTEGER NOT NULL DEFAULT 1,
  is_featured       INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  token            TEXT    NOT NULL UNIQUE,
  status           TEXT    NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','confirmed','rejected','cancelled_by_client','cancelled_by_owner','no_show','done')),
  service_id       INTEGER REFERENCES services(id) ON DELETE SET NULL,
  service_title    TEXT    NOT NULL,
  duration_min     INTEGER NOT NULL DEFAULT 60,
  car_brand        TEXT    NOT NULL,
  car_model        TEXT    NOT NULL,
  car_year         TEXT,
  car_plate        TEXT,
  client_name      TEXT    NOT NULL,
  client_phone     TEXT    NOT NULL,
  contact_method   TEXT    NOT NULL DEFAULT 'call'
                   CHECK (contact_method IN ('call','whatsapp','telegram')),
  comment          TEXT,
  start_at         TEXT    NOT NULL,
  end_at           TEXT    NOT NULL,
  source           TEXT    NOT NULL DEFAULT 'site' CHECK (source IN ('site','admin')),
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  idempotency_key  TEXT    UNIQUE,
  ip_hash          TEXT,
  status_changed_by TEXT   CHECK (status_changed_by IN ('owner_tg','admin','client') OR status_changed_by IS NULL),
  status_changed_at TEXT,
  tg_chat_id       TEXT,
  confirmed_at     TEXT,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status_start ON bookings(status, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(client_phone);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS days_off (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  local_date TEXT NOT NULL UNIQUE,
  open_from  TEXT,
  open_to    TEXT,
  reason     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS day_locks (
  local_date TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS notifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id      INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('booking_created','booking_cancelled','test')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  next_attempt_at TEXT NOT NULL,
  tg_message_refs TEXT NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL,
  sent_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_status_next ON notifications(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  author       TEXT NOT NULL,
  text         TEXT NOT NULL,
  rating       INTEGER,
  review_date  TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  url          TEXT NOT NULL,
  alt          TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  action     TEXT NOT NULL,
  actor      TEXT NOT NULL,
  booking_id INTEGER,
  details    TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
`;
