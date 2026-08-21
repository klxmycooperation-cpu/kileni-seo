import robotsParser from "robots-parser";

import type { AuditFetcher } from "./fetch";
import type { RobotsInfo, SitemapInfo } from "./types";
import { normalizeTargetUrl } from "./url";

const AUDIT_USER_AGENT = "ZingSEOAudit";
const MAX_SITEMAP_DEPTH = 3;
const MAX_SITEMAP_FILES = 20;
const MAX_SITEMAP_URLS = 5_000;

export async function discoverRobots(
  target: string | URL,
  fetcher: AuditFetcher,
  signal?: AbortSignal,
): Promise<RobotsInfo> {
  const siteUrl = normalizeTargetUrl(target);
  const robotsUrl = new URL("/robots.txt", siteUrl);
  try {
    const response = await fetcher(robotsUrl, {
      maxBodyBytes: 512 * 1024,
      headers: { accept: "text/plain,*/*;q=0.1" },
      signal,
    });
    if (response.status === 404 || response.status === 410) {
      return {
        url: robotsUrl.href,
        status: "missing",
        httpStatus: response.status,
        allowedRoot: true,
        sitemapUrls: [],
      };
    }
    if (!response.ok) {
      return {
        url: robotsUrl.href,
        status: "error",
        httpStatus: response.status,
        allowedRoot: null,
        sitemapUrls: [],
        error: `robots.txt вернул HTTP ${response.status}`,
      };
    }

    const parsed = robotsParser(robotsUrl.href, response.text);
    const sitemapUrls = parsed
      .getSitemaps()
      .map((value) => safeSameHostUrl(value, siteUrl))
      .filter((value): value is string => value !== null);
    return {
      url: robotsUrl.href,
      status: "found",
      httpStatus: response.status,
      allowedRoot:
        parsed.isAllowed(new URL("/", siteUrl).href, AUDIT_USER_AGENT) !== false,
      sitemapUrls: [...new Set(sitemapUrls)],
      body: response.text,
    };
  } catch (error) {
    return {
      url: robotsUrl.href,
      status: "error",
      httpStatus: null,
      allowedRoot: null,
      sitemapUrls: [],
      error: errorMessage(error),
    };
  }
}

export async function discoverSitemaps(
  target: string | URL,
  robots: RobotsInfo,
  fetcher: AuditFetcher,
  signal?: AbortSignal,
): Promise<SitemapInfo> {
  const siteUrl = normalizeTargetUrl(target);
  const seeds = robots.sitemapUrls.length > 0
    ? robots.sitemapUrls
    : [new URL("/sitemap.xml", siteUrl).href];
  const queue: Array<{ readonly url: string; readonly depth: number }> = seeds
    .map((url) => safeSameHostUrl(url, siteUrl))
    .filter((url): url is string => url !== null)
    .map((url) => ({ url, depth: 0 }));
  const queued = new Set(queue.map((item) => item.url));
  const visited = new Set<string>();
  const pageUrls = new Set<string>();
  const errors: string[] = [];
  let successfulFiles = 0;
  let missingFiles = 0;

  while (queue.length > 0 && visited.size < MAX_SITEMAP_FILES) {
    if (signal?.aborted) break;
    const item = queue.shift();
    if (!item || visited.has(item.url)) continue;
    visited.add(item.url);
    try {
      const response = await fetcher(item.url, {
        maxBodyBytes: 2 * 1024 * 1024,
        headers: { accept: "application/xml,text/xml,*/*;q=0.1" },
        signal,
      });
      if (response.status === 404 || response.status === 410) {
        missingFiles += 1;
        continue;
      }
      if (!response.ok) {
        errors.push(`${item.url}: HTTP ${response.status}`);
        continue;
      }
      successfulFiles += 1;
      const parsed = parseSitemap(response.text);
      if (parsed.kind === "index") {
        if (item.depth >= MAX_SITEMAP_DEPTH) continue;
        for (const rawUrl of parsed.urls) {
          const url = safeSameHostUrl(rawUrl, siteUrl);
          if (!url || queued.has(url)) continue;
          queued.add(url);
          queue.push({ url, depth: item.depth + 1 });
        }
      } else {
        for (const rawUrl of parsed.urls) {
          if (pageUrls.size >= MAX_SITEMAP_URLS) break;
          const url = safeSameHostUrl(rawUrl, siteUrl);
          if (url) pageUrls.add(url);
        }
      }
    } catch (error) {
      errors.push(`${item.url}: ${errorMessage(error)}`);
      if (signal?.aborted) break;
    }
  }

  return {
    status:
      successfulFiles > 0
        ? "found"
        : errors.length > 0
          ? "error"
          : missingFiles > 0
            ? "missing"
            : "error",
    filesVisited: visited.size,
    urls: [...pageUrls],
    errors,
  };
}

export function isAllowedByRobots(url: string | URL, robots: RobotsInfo): boolean {
  if (robots.status !== "found" || robots.body === undefined) return true;
  const parsed = robotsParser(robots.url, robots.body);
  return parsed.isAllowed(new URL(url).href, AUDIT_USER_AGENT) !== false;
}

function parseSitemap(xml: string): {
  readonly kind: "index" | "urlset";
  readonly urls: readonly string[];
} {
  const isIndex = /<(?:[\w.-]+:)?sitemapindex\b/i.test(xml);
  const urls: string[] = [];
  const locPattern = /<(?:[\w.-]+:)?loc\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?loc\s*>/gi;
  for (const match of xml.matchAll(locPattern)) {
    const rawValue = (match[1] ?? "").trim();
    const unwrapped = rawValue.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/)?.[1] ?? rawValue;
    const value = decodeXmlEntities(unwrapped).trim();
    if (value) urls.push(value);
  }
  return { kind: isIndex ? "index" : "urlset", urls };
}

function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      const lower = entity.toLowerCase();
      const named: Readonly<Record<string, string>> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
      };
      if (named[lower]) return named[lower];
      const hexadecimal = lower.startsWith("&#x");
      const digits = lower.slice(hexadecimal ? 3 : 2, -1);
      const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
      return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    },
  );
}

function safeSameHostUrl(rawUrl: string, siteUrl: URL): string | null {
  try {
    const url = normalizeTargetUrl(new URL(rawUrl.trim(), siteUrl));
    return url.hostname === siteUrl.hostname ? url.href : null;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
