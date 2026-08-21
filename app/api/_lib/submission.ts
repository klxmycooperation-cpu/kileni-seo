import type Database from "better-sqlite3";
import { z } from "zod";

import { apiError, retryAfterHeaders } from "./http";
import { consumeRateLimit, type RateLimitRule } from "@/src/lib/security/rate-limit";

export function zodError(error: z.ZodError) {
  return apiError(422, "VALIDATION_ERROR", "Проверьте заполненные поля", error.flatten());
}

export function consumeRules(
  sqlite: Database.Database,
  keyPrefix: string,
  rules: ReadonlyArray<{ suffix: string; rule: RateLimitRule }>,
) {
  for (const { suffix, rule } of rules) {
    const result = consumeRateLimit(sqlite, `${keyPrefix}:${suffix}`, rule);
    if (!result.allowed) {
      return apiError(
        429,
        "RATE_LIMITED",
        "Слишком много запросов. Попробуйте позже",
        undefined,
        retryAfterHeaders(result.retryAfterMs),
      );
    }
  }
  return null;
}

export function isFilledHoneypot(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function benignBotResponse() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 202,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
