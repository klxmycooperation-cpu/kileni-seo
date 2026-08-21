import type Database from "better-sqlite3";

export type RateLimitRule = { windowMs: number; limit: number };

export function consumeRateLimit(sqlite: Database.Database, key: string, rule: RateLimitRule, now = Date.now()): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const transaction = sqlite.transaction(() => {
    const current = sqlite.prepare("SELECT window_start AS windowStart, count FROM rate_limits WHERE key = ?").get(key) as { windowStart: number; count: number } | undefined;
    if (!current || now - current.windowStart >= rule.windowMs) {
      sqlite.prepare("INSERT INTO rate_limits(key, window_start, count, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start, count=1, updated_at=excluded.updated_at").run(key, now, now);
      return { allowed: true, remaining: rule.limit - 1, retryAfterMs: 0 };
    }
    if (current.count >= rule.limit) return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, rule.windowMs - (now - current.windowStart)) };
    sqlite.prepare("UPDATE rate_limits SET count=count+1, updated_at=? WHERE key=?").run(now, key);
    return { allowed: true, remaining: Math.max(0, rule.limit - current.count - 1), retryAfterMs: 0 };
  });
  return transaction();
}
