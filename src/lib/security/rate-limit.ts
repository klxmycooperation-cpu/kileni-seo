import type { Transaction } from "@libsql/client";

import { database } from "@/src/db/client";

export type RateLimitRule = { windowMs: number; limit: number };

type RateLimitRow = { windowStart: number; count: number };

export async function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  return database.transaction(async (transaction) => {
    const current = await currentRateLimit(transaction, key);
    if (!current || now - current.windowStart >= rule.windowMs) {
      await transaction.execute({
        sql: "INSERT INTO rate_limits(key, window_start, count, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start, count=1, updated_at=excluded.updated_at",
        args: [key, now, now],
      });
      return { allowed: true, remaining: rule.limit - 1, retryAfterMs: 0 };
    }
    if (current.count >= rule.limit) {
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, rule.windowMs - (now - current.windowStart)) };
    }
    await transaction.execute({ sql: "UPDATE rate_limits SET count=count+1, updated_at=? WHERE key=?", args: [now, key] });
    return { allowed: true, remaining: Math.max(0, rule.limit - current.count - 1), retryAfterMs: 0 };
  });
}

export async function purgeExpiredRateLimits(maxAgeMs = 7 * 24 * 60 * 60 * 1_000, now = Date.now()): Promise<number> {
  const age = Number.isFinite(maxAgeMs) ? Math.max(24 * 60 * 60 * 1_000, Math.floor(maxAgeMs)) : 7 * 24 * 60 * 60 * 1_000;
  const result = await database.execute({
    sql: "DELETE FROM rate_limits WHERE updated_at<?",
    args: [now - age],
  });
  return result.rowsAffected;
}

async function currentRateLimit(transaction: Transaction, key: string): Promise<RateLimitRow | null> {
  const result = await transaction.execute({ sql: "SELECT window_start AS windowStart, count FROM rate_limits WHERE key = ?", args: [key] });
  return (result.rows[0] as unknown as RateLimitRow | undefined) ?? null;
}
