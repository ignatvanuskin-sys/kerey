/**
 * SQLite connection (better-sqlite3). Synchronous by design: the availability
 * transaction (`BEGIN IMMEDIATE`) must be atomic without await-points (§6.5).
 */
import fs from 'node:fs';
import path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import type { Database } from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';
import { databaseUrl } from '@/lib/env';

const globalForDb = globalThis as unknown as { __kereyDb?: Database };

function resolveFile(url: string): string {
  if (url === ':memory:' || url.includes(':memory:')) return ':memory:';
  const raw = url.startsWith('file:') ? url.slice('file:'.length) : url;
  if (path.isAbsolute(raw)) return raw;
  // Relative paths are resolved against the project root; the ignore comment keeps
  // Turbopack from tracing the whole project because of this dynamic path.
  return path.join(process.cwd(), /* turbopackIgnore: true */ raw);
}

export function getDb(): Database {
  if (globalForDb.__kereyDb) return globalForDb.__kereyDb;

  const file = resolveFile(databaseUrl());
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new BetterSqlite3(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 10000');
  db.exec(SCHEMA_SQL);

  globalForDb.__kereyDb = db;
  return db;
}

/** Fresh in-memory database for tests. */
export function createMemoryDb(): Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}

export function nowIso(): string {
  return new Date().toISOString();
}
