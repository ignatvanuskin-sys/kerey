/**
 * ХРАНИЛИЩЕ ЗАЯВОК.
 *
 * Поддерживаются два бэкенда, выбор автоматический по переменным окружения:
 *
 *  1. Redis (Vercel KV / Upstash) — если заданы KV_REST_API_URL + KV_REST_API_TOKEN
 *     или UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 *     Нужен на Vercel и любом serverless-хостинге: файловая система там только для чтения.
 *     Запись защищена блокировкой Redis, чтобы две одновременные заявки не перезаписали друг друга.
 *
 *  2. JSON-файл `data/bookings.json` — по умолчанию для локальной работы и обычного сервера (VPS).
 *     Запись атомарная (временный файл + переименование), операции выстроены в очередь.
 *
 * Сервис заявок (lib/booking.ts) не зависит от выбранного бэкенда: он работает через
 * readStore/mutateStore, поэтому замена хранилища не требует правок логики записи.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BookingRecord } from './booking-types';

export type StoreShape = {
  version: 1;
  /** Сквозная нумерация заявок для номера вида №0007. */
  seq: number;
  bookings: BookingRecord[];
};

const EMPTY_STORE: StoreShape = { version: 1, seq: 0, bookings: [] };

/* ------------------------------- Redis-бэкенд ----------------------------- */

const KV_URL = process.env.KV_REST_API_URL?.trim() || process.env.UPSTASH_REDIS_REST_URL?.trim();
const KV_TOKEN = process.env.KV_REST_API_TOKEN?.trim() || process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const KV_KEY = 'kerey:bookings:v1';
const KV_LOCK = 'kerey:lock:v1';
const LOCK_TTL_MS = 10_000;

export const kvConfigured = Boolean(KV_URL && KV_TOKEN);

async function kvCommand(args: Array<string | number>): Promise<unknown> {
  const response = await fetch(KV_URL as string, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Redis ответил ${response.status}`);
  const json = (await response.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`Redis: ${json.error}`);
  return json.result;
}

async function kvRead(): Promise<StoreShape> {
  const raw = (await kvCommand(['GET', KV_KEY])) as string | null;
  if (!raw) return { ...EMPTY_STORE };
  return normalize(JSON.parse(raw));
}

async function kvWrite(store: StoreShape): Promise<void> {
  await kvCommand(['SET', KV_KEY, JSON.stringify(store)]);
}

async function acquireLock(token: string, attempts = 25): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await kvCommand(['SET', KV_LOCK, token, 'NX', 'PX', String(LOCK_TTL_MS)]);
    if (result === 'OK') return true;
    await new Promise((resolve) => setTimeout(resolve, 60 + Math.random() * 120));
  }
  return false;
}

async function releaseLock(token: string): Promise<void> {
  // Освобождаем только свою блокировку — чужую снимать нельзя.
  await kvCommand([
    'EVAL',
    'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
    '1',
    KV_LOCK,
    token,
  ]);
}

/* -------------------------------- Файл-бэкенд ----------------------------- */

const DATA_DIR = process.env.KEREY_DATA_DIR
  ? path.resolve(process.env.KEREY_DATA_DIR)
  : path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'bookings.json');

let queue: Promise<unknown> = Promise.resolve();

async function fileRead(): Promise<StoreShape> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return normalize(JSON.parse(raw));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && code !== 'ENOENT') {
      console.error('[storage] файл заявок недоступен:', code);
    }
    return { ...EMPTY_STORE };
  }
}

async function fileWrite(store: StoreShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
}

/* --------------------------------- Общее ---------------------------------- */

function normalize(parsed: Partial<StoreShape> | null): StoreShape {
  return {
    version: 1,
    seq: typeof parsed?.seq === 'number' ? parsed.seq : 0,
    bookings: Array.isArray(parsed?.bookings) ? (parsed!.bookings as BookingRecord[]) : [],
  };
}

/** Чтение данных. Никогда не бросает исключение: при сбое возвращает пустой список. */
export async function readStore(): Promise<StoreShape> {
  try {
    return kvConfigured ? await kvRead() : await fileRead();
  } catch (error) {
    console.error('[storage] не удалось прочитать заявки:', error instanceof Error ? error.message : error);
    return { ...EMPTY_STORE };
  }
}

/** Изменение с блокировкой: две одновременные заявки не перезапишут друг друга. */
export async function mutateStore<T>(mutator: (store: StoreShape) => T | Promise<T>): Promise<T> {
  if (kvConfigured) {
    const token = randomUUID();
    const locked = await acquireLock(token);
    if (!locked) throw new Error('Не удалось получить блокировку хранилища, повторите попытку');
    try {
      const store = await kvRead();
      const result = await mutator(store);
      await kvWrite(store);
      return result;
    } finally {
      await releaseLock(token).catch(() => undefined);
    }
  }

  const run = async (): Promise<T> => {
    const store = await fileRead();
    const result = await mutator(store);
    await fileWrite(store);
    return result;
  };

  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/**
 * Готово ли хранилище принимать заявки.
 * На serverless без подключённой базы запись невозможна — об этом честно сообщаем
 * в форме и в панели вместо непонятной ошибки 500.
 */
export async function isStorageWritable(): Promise<boolean> {
  if (kvConfigured) return true;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, '.write-probe');
    await fs.writeFile(probe, 'ok', 'utf8');
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

/** Описание хранилища для служебных сообщений. */
export function storageLabel(): string {
  if (kvConfigured) return 'Redis (Vercel KV / Upstash)';
  return `файл ${FILE}`;
}

export const STORAGE_FILE = FILE;
