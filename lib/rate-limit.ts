/**
 * Простой лимит запросов в памяти процесса.
 * Защищает от спама формой и от перебора пароля в панели.
 * При перезапуске сервера счётчики сбрасываются — для одного инстанса этого достаточно.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type LimitResult = { allowed: boolean; remaining: number; retryAfterSec: number };

export function hitLimit(key: string, limit: number, windowMs: number, now = Date.now()): LimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function resetLimit(key: string): void {
  buckets.delete(key);
}

/** Периодическая уборка, чтобы карта не росла бесконечно. */
if (typeof globalThis !== 'undefined') {
  const globalKey = '__kereyRateLimitCleanup' as const;
  const holder = globalThis as unknown as Record<string, unknown>;
  if (!holder[globalKey]) {
    holder[globalKey] = setInterval(
      () => {
        const now = Date.now();
        for (const [key, bucket] of buckets) {
          if (bucket.resetAt <= now) buckets.delete(key);
        }
      },
      10 * 60 * 1000,
    );
    // процесс не должен держаться из-за таймера
    (holder[globalKey] as { unref?: () => void }).unref?.();
  }
}
