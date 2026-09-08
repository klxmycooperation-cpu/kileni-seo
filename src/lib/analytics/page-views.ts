import { createHash } from "node:crypto";

import { publicRoutes } from "../../config/site";
import { articleSlugs } from "../../content/articles";
import { auditChecks } from "../../content/audit-checks";
import { glossaryTerms } from "../../content/glossary";
import { database } from "../../db/client";
import { consumeRateLimit } from "../security/rate-limit";

const excludedPublicPath = /^\/(?:admin|api|_next)(?:\/|$)|^\/(?:en\/)?audit\/[^/]+\/?$/u;
const staticPublicPaths = new Set<string>([...publicRoutes, "articles", "checks"]);
const articlePathSlugs = new Set(articleSlugs);
const glossaryPathSlugs = new Set(glossaryTerms.map((term) => term.slug));
const auditCheckPathSlugs = new Set(auditChecks.map((check) => check.slug));

function isKnownPublicPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "en") parts.shift();
  const path = parts.join("/");
  if (staticPublicPaths.has(path)) return true;
  if ((parts[0] === "blog" || parts[0] === "articles") && parts.length === 2) return articlePathSlugs.has(parts[1]);
  if (parts[0] === "glossary" && parts.length === 2) return glossaryPathSlugs.has(parts[1]);
  if (parts[0] === "checks" && parts.length === 2) return auditCheckPathSlugs.has(parts[1]);
  return false;
}

export function normalizeCountedPublicPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 240 || /[?#\u0000-\u001f]/u.test(value)) return null;
  let pathname: string;
  try {
    pathname = new URL(value, "https://kileni.invalid").pathname;
  } catch {
    return null;
  }
  if (excludedPublicPath.test(pathname)) return null;
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/u, "") : "/";
  return isKnownPublicPath(normalized) ? normalized : null;
}

export function moscowDayKey(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function recordAnonymousPageView(
  path: string,
  options: { now?: number; visitorKey?: string } = {},
): Promise<boolean> {
  const normalized = normalizeCountedPublicPath(path);
  if (!normalized) return false;
  const now = options.now ?? Date.now();
  const visitorKey = createHash("sha256").update(options.visitorKey || "unknown").digest("hex").slice(0, 24);
  const rateKey = createHash("sha256").update(normalized).digest("hex").slice(0, 24);
  const visitorLimit = await consumeRateLimit(`page-view:visitor:${visitorKey}:minute`, { windowMs: 60_000, limit: 120 }, now);
  if (!visitorLimit.allowed) return false;
  const globalLimit = await consumeRateLimit("page-view:global:minute", { windowMs: 60_000, limit: 10_000 }, now);
  if (!globalLimit.allowed) return false;
  const limit = await consumeRateLimit(`page-view:${rateKey}:minute`, { windowMs: 60_000, limit: 1_000 }, now);
  if (!limit.allowed) return false;
  const retentionGate = await consumeRateLimit("page-view:retention:day", { windowMs: 24 * 60 * 60 * 1_000, limit: 1 }, now);
  if (retentionGate.allowed) {
    await database.execute({
      sql: "DELETE FROM page_view_daily WHERE updated_at<?",
      args: [now - 400 * 24 * 60 * 60 * 1_000],
    });
  }
  await database.execute({
    sql: `INSERT INTO page_view_daily(day,path,views,updated_at) VALUES (?,?,1,?)
      ON CONFLICT(day,path) DO UPDATE SET views=page_view_daily.views+1,updated_at=excluded.updated_at`,
    args: [moscowDayKey(now), normalized, now],
  });
  return true;
}
