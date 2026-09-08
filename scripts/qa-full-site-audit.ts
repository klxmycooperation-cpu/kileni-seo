import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { load } from "cheerio";
import pLimit from "p-limit";

import { analyzePage } from "../src/lib/audit/analyzer";
import { classifyAnalyzedPage, classifyAuditObject } from "../src/lib/audit/classification";

const ORIGIN = new URL(process.env.QA_ORIGIN ?? "https://kileni-seo.ru");
const FETCH_ORIGIN = new URL(process.env.QA_FETCH_ORIGIN ?? ORIGIN.href);
const OUTPUT_DIR = resolve(
  process.cwd(),
  process.env.QA_OUTPUT_DIR
    ?? "docs/user-audit-evidence/kileni-full-audit-2026-09-04/inventory",
);
const USER_AGENT = "KILENI-Internal-QA/2026-09-04 (+read-only full public inventory)";
const HTML_LIMIT = 500;
const BODY_LIMIT_BYTES = 4 * 1024 * 1024;
const FETCH_CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 25_000;

type FetchObservation = {
  requestedUrl: string;
  finalUrl: string;
  status: number | null;
  contentType: string | null;
  headers: Record<string, string>;
  redirects: Array<{ from: string; status: number; to: string }>;
  elapsedMs: number | null;
  body: string;
  error: string | null;
};

type PageRecord = {
  requestedUrl: string;
  finalUrl: string;
  status: number | null;
  classification: "HTML" | "redirect" | "document" | "technical resource" | "error" | "excluded/private";
  contentType: string | null;
  redirects: FetchObservation["redirects"];
  elapsedMs: number | null;
  error: string | null;
  fromSitemap: boolean;
  discoveredFrom: string[];
  pageType: string | null;
  locale: string | null;
  templateFamily: string | null;
  canonical: { url: string | null; valid: boolean; selfReferential: boolean | null } | null;
  indexability: { noindex: boolean; nofollow: boolean; robotsAllowed: boolean | null } | null;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1: string[];
  headings: { h2: number; h3: number; hierarchyValid: boolean } | null;
  hreflang: Array<{ language: string; url: string }>;
  structuredData: { total: number; valid: number; invalid: number; types: string[] } | null;
  openGraph: { title: string | null; description: string | null; image: string | null; url: string | null; coverage: number } | null;
  internalLinks: string[];
  externalLinkCount: number;
  parameterizedLinkCount: number;
  forms: unknown;
  wordCount: number | null;
  contentHash: string | null;
  soft404: boolean;
  anchors: string[];
  fragmentLinks: Array<{ href: string; text: string }>;
};

const sitemapUrls = new Set<string>();
const sitemapFiles = new Set<string>();
const discovered = new Map<string, Set<string>>();
const observations = new Map<string, FetchObservation>();
const records = new Map<string, PageRecord>();
const limit = pLimit(FETCH_CONCURRENCY);

await mkdir(OUTPUT_DIR, { recursive: true });

const robotsUrl = new URL("/robots.txt", ORIGIN).href;
const robots = await fetchFollowing(robotsUrl);
const robotsSitemaps = [...robots.body.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gimu)].map((match) => match[1]!).filter(Boolean);
const rootSitemap = robotsSitemaps[0] ?? new URL("/sitemap.xml", ORIGIN).href;
await collectSitemap(rootSitemap, 0);

remember(ORIGIN.href, "entrypoint");
for (const url of sitemapUrls) remember(url, "sitemap");

let cursor = 0;
const queue = [...discovered.keys()];
while (cursor < queue.length && records.size < HTML_LIMIT) {
  const batch = queue.slice(cursor, cursor + FETCH_CONCURRENCY);
  cursor += batch.length;
  const batchRecords = await Promise.all(batch.map((url) => limit(() => inspectUrl(url))));
  for (const record of batchRecords) {
    records.set(record.requestedUrl, record);
    if (record.classification !== "HTML") continue;
    for (const link of record.internalLinks) {
      const normalized = stripHash(link);
      if (!isSameSite(normalized)) continue;
      remember(normalized, record.finalUrl);
      if (!queue.includes(normalized) && queue.length < HTML_LIMIT) queue.push(normalized);
    }
  }
}

for (const [url, sources] of discovered) {
  if (records.has(url)) continue;
  const parsed = new URL(url);
  const excluded = isPrivateOrTechnicalPath(parsed.pathname);
  records.set(url, {
    requestedUrl: url,
    finalUrl: url,
    status: null,
    classification: excluded ? "excluded/private" : "error",
    contentType: null,
    redirects: [],
    elapsedMs: null,
    error: excluded ? "Excluded from active loading by the public QA boundary" : "Discovery limit reached before loading",
    fromSitemap: sitemapUrls.has(url),
    discoveredFrom: [...sources],
    pageType: null,
    locale: null,
    templateFamily: null,
    canonical: null,
    indexability: null,
    title: null,
    titleLength: 0,
    description: null,
    descriptionLength: 0,
    h1: [],
    headings: null,
    hreflang: [],
    structuredData: null,
    openGraph: null,
    internalLinks: [],
    externalLinkCount: 0,
    parameterizedLinkCount: 0,
    forms: null,
    wordCount: null,
    contentHash: null,
    soft404: false,
    anchors: [],
    fragmentLinks: [],
  });
}

const rows = [...records.values()].sort((left, right) => left.requestedUrl.localeCompare(right.requestedUrl, "en"));
const htmlRows = rows.filter((row) => row.classification === "HTML");
const canonicalHtmlRows = htmlRows.filter((row) => !new URL(row.requestedUrl).search);
const parameterizedHtmlRows = htmlRows.filter((row) => new URL(row.requestedUrl).search);
const inbound = new Map<string, Set<string>>();
for (const page of htmlRows) {
  for (const target of page.internalLinks.map(stripHash)) {
    const key = canonicalComparable(target);
    const sources = inbound.get(key) ?? new Set<string>();
    sources.add(page.finalUrl);
    inbound.set(key, sources);
  }
}

const internalBroken = rows.filter((row) =>
  row.classification === "error" || (row.status !== null && row.status >= 400)
).map((row) => ({ url: row.requestedUrl, status: row.status, error: row.error, discoveredFrom: row.discoveredFrom }));

const brokenAnchors: Array<{ source: string; target: string; text: string }> = [];
const htmlByComparable = new Map(htmlRows.map((row) => [canonicalComparable(row.finalUrl), row]));
for (const page of htmlRows) {
  for (const link of page.fragmentLinks) {
    const targetUrl = new URL(link.href, page.finalUrl);
    if (!targetUrl.hash || !isSameSite(targetUrl.href)) continue;
    const targetPage = htmlByComparable.get(canonicalComparable(stripHash(targetUrl.href)));
    const id = decodeURIComponent(targetUrl.hash.slice(1));
    if (targetPage && !targetPage.anchors.includes(id)) brokenAnchors.push({ source: page.finalUrl, target: targetUrl.href, text: link.text });
  }
}

const duplicates = duplicateGroups(canonicalHtmlRows);
const hreflangProblems = auditHreflang(canonicalHtmlRows);
const canonicalProblems = canonicalHtmlRows.filter((row) =>
  !row.canonical?.valid || !row.canonical.url || !row.canonical.selfReferential
).map((row) => ({ url: row.finalUrl, canonical: row.canonical }));
const noindexPages = htmlRows.filter((row) => row.indexability?.noindex).map((row) => row.finalUrl);
const orphans = htmlRows.filter((row) => row.fromSitemap && new URL(row.finalUrl).pathname !== "/" && !(inbound.get(canonicalComparable(row.finalUrl))?.size));

const summary = {
  generatedAt: new Date().toISOString(),
  origin: ORIGIN.href,
  fetchOrigin: FETCH_ORIGIN.href,
  robots: {
    url: robots.requestedUrl,
    status: robots.status,
    contentType: robots.contentType,
    sitemapDirectives: robotsSitemaps,
    body: robots.body,
  },
  sitemap: {
    files: [...sitemapFiles],
    urlCount: sitemapUrls.size,
  },
  inventory: {
    total: rows.length,
    byClassification: countBy(rows, (row) => row.classification),
    html: htmlRows.length,
    sitemapUrlsLoaded: [...sitemapUrls].filter((url) => observations.has(url)).length,
    sitemapUrlsNotLoaded: [...sitemapUrls].filter((url) => !observations.has(url)).length,
    parameterized: rows.filter((row) => new URL(row.requestedUrl).search).length,
    locales: countBy(htmlRows, (row) => row.locale ?? "unknown"),
    pageTypes: countBy(htmlRows, (row) => row.pageType ?? "unknown"),
  },
  technical: {
    redirects: rows.filter((row) => row.redirects.length > 0).map((row) => ({ url: row.requestedUrl, chain: row.redirects, finalUrl: row.finalUrl, status: row.status })),
    errors: internalBroken,
    soft404: htmlRows.filter((row) => row.soft404).map((row) => row.finalUrl),
    noindex: noindexPages,
    canonicalProblems,
    hreflangProblems,
    orphanPages: orphans.map((row) => row.finalUrl),
    brokenAnchors,
    invalidStructuredData: htmlRows.filter((row) => (row.structuredData?.invalid ?? 0) > 0).map((row) => ({ url: row.finalUrl, invalid: row.structuredData?.invalid })),
    sitemapCanonicalMismatch: htmlRows.filter((row) => row.fromSitemap && row.canonical?.url && canonicalComparable(row.canonical.url) !== canonicalComparable(row.finalUrl)).map((row) => ({ url: row.finalUrl, canonical: row.canonical?.url })),
    parameterizedHtmlStates: parameterizedHtmlRows.map((row) => {
      const cleanUrl = new URL(row.finalUrl);
      cleanUrl.search = "";
      return {
        url: row.finalUrl,
        status: row.status,
        canonical: row.canonical?.url ?? null,
        canonicalMatchesCleanUrl: row.canonical?.url
          ? canonicalComparable(row.canonical.url) === canonicalComparable(cleanUrl.href)
          : false,
      };
    }),
  },
  onPage: {
    missingTitle: htmlRows.filter((row) => !row.title).map((row) => row.finalUrl),
    missingDescription: htmlRows.filter((row) => !row.description).map((row) => row.finalUrl),
    missingH1: htmlRows.filter((row) => row.h1.length === 0).map((row) => row.finalUrl),
    multipleH1: htmlRows.filter((row) => row.h1.length > 1).map((row) => ({ url: row.finalUrl, h1: row.h1 })),
    headingHierarchy: htmlRows.filter((row) => row.headings && !row.headings.hierarchyValid).map((row) => row.finalUrl),
    shortDescriptions: htmlRows.filter((row) => row.description && row.descriptionLength < 70).map((row) => ({ url: row.finalUrl, length: row.descriptionLength })),
    longDescriptions: htmlRows.filter((row) => row.descriptionLength > 160).map((row) => ({ url: row.finalUrl, length: row.descriptionLength })),
    thinContent: htmlRows.filter((row) => (row.wordCount ?? Number.POSITIVE_INFINITY) < 100).map((row) => ({ url: row.finalUrl, words: row.wordCount })),
    duplicates,
  },
};

await writeJson("inventory.json", rows);
await writeJson("summary.json", summary);
await writeJson("internal-link-checks.json", { internalBroken, brokenAnchors, orphans: orphans.map((row) => row.finalUrl) });
await writeJson("metadata-duplicates.json", duplicates);
await writeFile(resolve(OUTPUT_DIR, "robots.txt"), robots.body, "utf8");
await writeFile(resolve(OUTPUT_DIR, "sitemap-urls.txt"), `${[...sitemapUrls].join("\n")}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));

async function inspectUrl(url: string): Promise<PageRecord> {
  const sources = [...(discovered.get(url) ?? [])];
  const parsed = new URL(url);
  if (isPrivateOrTechnicalPath(parsed.pathname)) return emptyRecord(url, sources, "excluded/private", "Excluded from active loading by the public QA boundary");
  const observation = await fetchFollowing(url);
  observations.set(url, observation);
  const contentType = observation.contentType?.toLowerCase() ?? null;
  const redirected = observation.redirects.length > 0;
  if (observation.error || observation.status === null || observation.status >= 400) {
    return emptyRecord(url, sources, "error", observation.error ?? `HTTP ${observation.status}`, observation);
  }
  if (!contentType?.includes("text/html") && !contentType?.includes("application/xhtml+xml")) {
    const resource = classifyAuditObject({
      url,
      finalUrl: observation.finalUrl,
      contentType,
      statusCode: observation.status,
    });
    const classification = redirected
      ? "redirect"
      : resource.resourceType === "document"
        ? "document"
        : "technical resource";
    return emptyRecord(url, sources, classification, null, observation);
  }

  const analysis = analyzePage({
    url: observation.finalUrl,
    status: observation.status,
    html: observation.body,
    headers: observation.headers,
    requestedUrl: observation.requestedUrl,
    redirects: observation.redirects.map((item) => item.to),
    responseTimeMs: observation.elapsedMs ?? undefined,
    depth: pathDepth(observation.finalUrl),
  });
  const classified = classifyAnalyzedPage(analysis, { fromSitemap: sitemapUrls.has(url) });
  const $ = load(observation.body);
  const anchors = $("[id], a[name]").toArray().flatMap((element) => [$(element).attr("id"), $(element).attr("name")]).filter((value): value is string => Boolean(value));
  const fragmentLinks = $("a[href*='#']").toArray().flatMap((element) => {
    const href = $(element).attr("href");
    if (!href) return [];
    try {
      return [{ href: new URL(href, observation.finalUrl).href, text: normalizeText($(element).text()) }];
    } catch {
      return [];
    }
  });
  const bodyText = normalizeText($("body").clone().find("script,style,noscript,svg,template").remove().end().text());
  const primaryLabel = normalizeText(`${analysis.title.value ?? ""} ${analysis.h1.values.join(" ")}`);
  const soft404 = observation.status === 200
    && /^(?:404\s*[-—:]?\s*)?(?:not found|page not found|страниц[ауы]? не найдена)(?:\s|$)/iu.test(primaryLabel);
  return {
    requestedUrl: url,
    finalUrl: observation.finalUrl,
    status: observation.status,
    classification: redirected ? "redirect" : "HTML",
    contentType: observation.contentType,
    redirects: observation.redirects,
    elapsedMs: observation.elapsedMs,
    error: null,
    fromSitemap: sitemapUrls.has(url),
    discoveredFrom: sources,
    pageType: classified.pageType,
    locale: classified.language,
    templateFamily: classified.templateFamily,
    canonical: analysis.canonical,
    indexability: { ...analysis.indexing, robotsAllowed: robotsAllows(observation.finalUrl, robots.body) },
    title: analysis.title.value,
    titleLength: analysis.title.length,
    description: analysis.description.value,
    descriptionLength: analysis.description.length,
    h1: [...analysis.h1.values],
    headings: analysis.headingStructure ? { h2: analysis.headingStructure.h2Count, h3: analysis.headingStructure.h3Count, hierarchyValid: analysis.headingStructure.hierarchyValid } : null,
    hreflang: [...(analysis.hreflang ?? [])],
    structuredData: { ...analysis.structuredData, types: [...analysis.structuredData.types] },
    openGraph: analysis.openGraph,
    internalLinks: [...analysis.links.internalUrls],
    externalLinkCount: analysis.links.externalCount,
    parameterizedLinkCount: analysis.links.parameterizedCount ?? 0,
    forms: analysis.forms ?? null,
    wordCount: analysis.content?.wordCount ?? null,
    contentHash: createHash("sha256").update(bodyText).digest("hex"),
    soft404,
    anchors,
    fragmentLinks,
  };
}

async function collectSitemap(url: string, depth: number): Promise<void> {
  if (depth > 4 || sitemapFiles.has(url)) return;
  sitemapFiles.add(url);
  const response = await fetchFollowing(url);
  observations.set(url, response);
  if (response.status === null || response.status >= 400 || response.error) return;
  const locs = [...response.body.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/giu)]
    .map((match) => decodeXml(match[1] ?? "").trim())
    .filter(Boolean);
  const isIndex = /<sitemapindex(?:\s|>)/iu.test(response.body);
  for (const loc of locs) {
    let normalized: string;
    try { normalized = new URL(loc, ORIGIN).href; } catch { continue; }
    if (!isSameSite(normalized)) continue;
    if (isIndex || /sitemap[^/]*\.xml(?:$|\?)/iu.test(new URL(normalized).pathname)) await collectSitemap(normalized, depth + 1);
    else sitemapUrls.add(stripHash(normalized));
  }
}

async function fetchFollowing(input: string): Promise<FetchObservation> {
  const started = Date.now();
  const redirects: FetchObservation["redirects"] = [];
  let current = input;
  try {
    for (let step = 0; step < 8; step += 1) {
      const transportUrl = toFetchUrl(current);
      const response = await fetch(transportUrl, {
        redirect: "manual",
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.2" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const headers = Object.fromEntries(response.headers.entries());
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        const next = fromFetchUrl(new URL(response.headers.get("location")!, transportUrl).href);
        redirects.push({ from: current, status: response.status, to: next });
        current = next;
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const body = buffer.byteLength > BODY_LIMIT_BYTES ? buffer.subarray(0, BODY_LIMIT_BYTES).toString("utf8") : buffer.toString("utf8");
      return { requestedUrl: input, finalUrl: current, status: response.status, contentType: response.headers.get("content-type"), headers, redirects, elapsedMs: Date.now() - started, body, error: null };
    }
    return { requestedUrl: input, finalUrl: current, status: null, contentType: null, headers: {}, redirects, elapsedMs: Date.now() - started, body: "", error: "Redirect chain exceeded 8 hops" };
  } catch (error) {
    return { requestedUrl: input, finalUrl: current, status: null, contentType: null, headers: {}, redirects, elapsedMs: Date.now() - started, body: "", error: error instanceof Error ? error.message : String(error) };
  }
}

function toFetchUrl(input: string): string {
  const logical = new URL(input, ORIGIN);
  if (!isSameSite(logical.href) || FETCH_ORIGIN.origin === ORIGIN.origin) return logical.href;
  const transport = new URL(FETCH_ORIGIN.href);
  transport.pathname = logical.pathname;
  transport.search = logical.search;
  transport.hash = "";
  return transport.href;
}

function fromFetchUrl(input: string): string {
  const transport = new URL(input, FETCH_ORIGIN);
  if (transport.origin !== FETCH_ORIGIN.origin || FETCH_ORIGIN.origin === ORIGIN.origin) return transport.href;
  const logical = new URL(ORIGIN.href);
  logical.pathname = transport.pathname;
  logical.search = transport.search;
  logical.hash = "";
  return logical.href;
}

function emptyRecord(url: string, sources: string[], classification: PageRecord["classification"], error: string | null, observation?: FetchObservation): PageRecord {
  return {
    requestedUrl: url,
    finalUrl: observation?.finalUrl ?? url,
    status: observation?.status ?? null,
    classification,
    contentType: observation?.contentType ?? null,
    redirects: observation?.redirects ?? [],
    elapsedMs: observation?.elapsedMs ?? null,
    error: observation?.error ?? error,
    fromSitemap: sitemapUrls.has(url),
    discoveredFrom: sources,
    pageType: null,
    locale: null,
    templateFamily: null,
    canonical: null,
    indexability: null,
    title: null,
    titleLength: 0,
    description: null,
    descriptionLength: 0,
    h1: [],
    headings: null,
    hreflang: [],
    structuredData: null,
    openGraph: null,
    internalLinks: [],
    externalLinkCount: 0,
    parameterizedLinkCount: 0,
    forms: null,
    wordCount: null,
    contentHash: null,
    soft404: false,
    anchors: [],
    fragmentLinks: [],
  };
}

function remember(input: string, source: string): void {
  let url: URL;
  try { url = new URL(input, ORIGIN); } catch { return; }
  if (!isSameSite(url.href) || !/^https?:$/u.test(url.protocol)) return;
  url.hash = "";
  const normalized = url.href;
  const sources = discovered.get(normalized) ?? new Set<string>();
  sources.add(source);
  discovered.set(normalized, sources);
}

function isSameSite(input: string): boolean {
  try {
    const url = new URL(input, ORIGIN);
    return url.hostname.replace(/^www\./u, "") === ORIGIN.hostname.replace(/^www\./u, "");
  } catch { return false; }
}

function isPrivateOrTechnicalPath(pathname: string): boolean {
  return /^\/(?:admin|api)(?:\/|$)/u.test(pathname);
}

function robotsAllows(input: string, body: string): boolean | null {
  if (!body) return null;
  const path = new URL(input).pathname;
  const disallows = [...body.matchAll(/^\s*Disallow:\s*(\S*)\s*$/gimu)].map((match) => match[1] ?? "").filter(Boolean);
  return !disallows.some((rule) => rule === "/" || path.startsWith(rule));
}

function pathDepth(input: string): number {
  return new URL(input).pathname.split("/").filter(Boolean).length;
}

function stripHash(input: string): string {
  const url = new URL(input, ORIGIN);
  url.hash = "";
  return url.href;
}

function canonicalComparable(input: string): string {
  const url = new URL(input, ORIGIN);
  url.hash = "";
  url.hostname = url.hostname.replace(/^www\./u, "");
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return url.href;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function decodeXml(value: string): string {
  return value.replace(/&amp;/gu, "&").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, '"').replace(/&#39;/gu, "'");
}

function countBy<T>(items: readonly T[], read: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) result[read(item)] = (result[read(item)] ?? 0) + 1;
  return result;
}

function duplicateGroups(pages: PageRecord[]) {
  const group = (read: (page: PageRecord) => string | null) => {
    const values = new Map<string, string[]>();
    for (const page of pages) {
      const value = read(page)?.trim();
      if (!value) continue;
      const urls = values.get(value) ?? [];
      urls.push(page.finalUrl);
      values.set(value, urls);
    }
    return [...values.entries()].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, urls }));
  };
  return {
    titles: group((page) => page.title),
    descriptions: group((page) => page.description),
    h1: group((page) => page.h1.length === 1 ? page.h1[0]! : null),
    exactContent: group((page) => page.contentHash),
  };
}

function auditHreflang(pages: PageRecord[]) {
  const byUrl = new Map(pages.map((page) => [canonicalComparable(page.finalUrl), page]));
  const problems: Array<{ url: string; language: string; alternate: string; problem: string }> = [];
  for (const page of pages) {
    for (const alternate of page.hreflang) {
      const target = byUrl.get(canonicalComparable(alternate.url));
      if (!target) {
        problems.push({ url: page.finalUrl, language: alternate.language, alternate: alternate.url, problem: "alternate target not found in public HTML inventory" });
        continue;
      }
      const reciprocal = target.hreflang.some((item) => canonicalComparable(item.url) === canonicalComparable(page.finalUrl));
      if (!reciprocal) problems.push({ url: page.finalUrl, language: alternate.language, alternate: alternate.url, problem: "alternate target does not reference this page" });
    }
  }
  return problems;
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await writeFile(resolve(OUTPUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
