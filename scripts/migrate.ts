/**
 * Applies the schema (idempotent). `--reset` deletes the SQLite file first.
 * Usage: npm run db:migrate  |  npm run db:reset
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '@/db/client';

const reset = process.argv.includes('--reset');
const url = process.env.DATABASE_URL ?? 'file:./data/kerey.db';
const file = path.isAbsolute(url.replace(/^file:/, ''))
  ? url.replace(/^file:/, '')
  : path.join(process.cwd(), url.replace(/^file:/, ''));

if (reset) {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const target = `${file}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target);
      console.log(`removed ${target}`);
    }
  }
}

const db = getDb();
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as Array<{ name: string }>;

console.log(`database: ${file}`);
console.log(`tables:   ${tables.map((t) => t.name).join(', ')}`);
console.log('schema up to date.');
