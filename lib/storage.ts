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
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BookingRecord } from './booking-types';
import { isServerless } from './site-url';

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
/** Временное хранилище: каталог временных файлов. На Vercel это единственное место для записи. */
const TEMP_DIR = path.join(os.tmpdir(), 'kerey-data');

let queue: Promise<unknown> = Promise.resolve();

/** Проверка записи в каталог. Одна повторная попытка — на случай кратковременной блокировки файла. */
async function canWrite(dir: string, attempt = 0): Promise<boolean> {
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    await fs.writeFile(probe, 'ok', 'utf8');
    await fs.unlink(probe).catch(() => undefined); // не смогли удалить — не повод считать каталог недоступным
    return true;
  } catch {
    if (attempt === 0) return canWrite(dir, 1);
    return false;
  }
}

async function resolveDir(): Promise<string> {
  return (await storageMode()) === 'temp' ? TEMP_DIR : DATA_DIR;
}

async function fileRead(): Promise<StoreShape> {
  const dir = await resolveDir();
  try {
    await fs.mkdir(dir, { recursive: true });
    const raw = await fs.readFile(path.join(dir, 'bookings.json'), 'utf8');
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
  const dir = await resolveDir();
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, 'bookings.json');
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tmp, target);
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

export type StorageMode = 'redis' | 'file' | 'temp';

let resolvedMode: StorageMode | null = null;

/**
 * Какое хранилище реально используется:
 *  • redis — подключена база, данные постоянные;
 *  • file  — обычный сервер, файл на диске, данные постоянные;
 *  • temp  — serverless без базы: пишем во временный каталог, чтобы демонстрация работала,
 *            но данные могут исчезнуть после перезапуска инстанса.
 *
 * ВАЖНО: положительный результат кэшируется, а `temp` — нет. Иначе одна случайная осечка
 * проверки записи (занятый файл, антивирус) навсегда переводила бы рабочий сайт в демо-режим:
 * панель читала бы пустой временный каталог и показывала пустой список.
 */
export async function storageMode(): Promise<StorageMode> {
  if (resolvedMode === 'redis' || resolvedMode === 'file') return resolvedMode;

  if (kvConfigured) {
    resolvedMode = 'redis';
    return resolvedMode;
  }

  // На обычном сервере (не serverless) постоянное хранилище — это файл на диске.
  if (!isServerless() && (await canWrite(DATA_DIR))) {
    resolvedMode = 'file';
    return resolvedMode;
  }

  // Остаётся serverless без базы либо недоступный каталог данных.
  if (await canWrite(TEMP_DIR)) {
    console.warn('[storage] постоянное хранилище недоступно, включён временный режим (демо)');
    return 'temp';
  }

  console.error('[storage] нет доступного хранилища');
  return 'temp';
}

/** Демо-режим: данные не переживут перезапуск, значит и настоящих данных там быть не может. */
export async function isTemporaryStorage(): Promise<boolean> {
  return (await storageMode()) === 'temp';
}

/** Готово ли хранилище принимать заявки. */
export async function isStorageWritable(): Promise<boolean> {
  const mode = await storageMode();
  if (mode === 'redis') return true;
  return canWrite(mode === 'temp' ? TEMP_DIR : DATA_DIR);
}

/** Описание хранилища для служебных сообщений. */
export async function storageLabel(): Promise<string> {
  const mode = await storageMode();
  if (mode === 'redis') return 'Redis (Vercel KV / Upstash) — постоянное';
  if (mode === 'file') return `файл ${path.join(DATA_DIR, 'bookings.json')} — постоянное`;
  return `временный каталог ${TEMP_DIR} — демо-режим, данные могут исчезнуть`;
}

/** Путь к файлу заявок в текущем режиме (для служебных скриптов). */
export async function storageFilePath(): Promise<string> {
  return path.join(await resolveDir(), 'bookings.json');
}
