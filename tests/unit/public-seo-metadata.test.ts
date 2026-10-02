import type { Metadata } from "next";
import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "../../app/sitemap";
import { publicRoutes, localizedPath, type Locale } from "../../src/config/site";
import { articleSlugs, getArticle } from "../../src/content/articles";
import { auditCheckSlugs } from "../../src/content/audit-checks";
import { getGlossaryTerm, indexableGlossarySlugs } from "../../src/content/glossary";
import {
  buildArticleMetadata,
  buildPublicMetadata,
  publicRouteLastModified,
} from "../../src/config/seo-metadata";
import {
  auditCheckSitemapEntries,
  getAuditCheckMetadata,
} from "../../src/lib/seo/audit-check-metadata";
import {
  getGlossaryDetailMetadata,
  glossarySitemapPaths,
} from "../../src/lib/seo/glossary-metadata";

const locales: Locale[] = ["ru"];
const originalPrelaunchMode = process.env.PRELAUNCH_MODE;

function metadataTitle(metadata: Metadata): string {
  if (typeof metadata.title === "string") return metadata.title;
  if (metadata.title && typeof metadata.title === "object" && "absolute" in metadata.title) {
    return metadata.title.absolute;
  }
  return "";
}

function metadataDescription(metadata: Metadata): string {
  return metadata.description ?? "";
}

function renderedMetadataTitle(metadata: Metadata): string {
  if (typeof metadata.title === "string") return `${metadata.title} — KILENI`;
  return metadataTitle(metadata);
}

function metadataUrl(
  value: string | URL | { url: string | URL } | null | undefined,
): string {
  if (value && typeof value === "object" && !(value instanceof URL) && "url" in value) {
    return value.url.toString();
  }
  return value?.toString() ?? "";
}

afterEach(() => {
  if (originalPrelaunchMode === undefined) delete process.env.PRELAUNCH_MODE;
  else process.env.PRELAUNCH_MODE = originalPrelaunchMode;
  vi.resetModules();
});

describe("public SEO metadata", () => {
  it("provides unique complete metadata for every current Russian public route", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const locale of locales) {
      for (const path of publicRoutes) {
        const metadata = buildPublicMetadata(locale, path);
        const title = metadataTitle(metadata);
        const description = metadataDescription(metadata);
        const routePath = localizedPath(locale, path);
        const canonical = new URL(routePath, "https://kileni-seo.ru").toString();

        expect(title.length, `${locale}:${path || "home"} title length`).toBeGreaterThanOrEqual(30);
        expect(title.length, `${locale}:${path || "home"} title length`).toBeLessThanOrEqual(60);
        expect(description.length, `${locale}:${path || "home"} description length`).toBeGreaterThanOrEqual(70);
        expect(description.length, `${locale}:${path || "home"} description length`).toBeLessThanOrEqual(160);
        expect(metadataUrl(metadata.alternates?.canonical)).toBe(canonical);
        expect(metadata.alternates?.languages).toBeUndefined();
        expect(metadata.openGraph?.title).toBe(title);
        expect(metadata.openGraph?.description).toBe(description);
        expect(metadataUrl(metadata.openGraph?.url)).toBe(canonical);

        expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
        expect(descriptions.has(description), `duplicate description: ${description}`).toBe(false);
        titles.add(title);
        descriptions.add(description);
      }
    }
  });

  it("keeps public contact and free-audit metadata aligned with the approved product contract", () => {
    const metadata = [
      buildPublicMetadata("ru", "contacts"),
      buildPublicMetadata("ru", "free-audit"),
    ];
    const copy = metadata.map((item) => `${metadataTitle(item)} ${metadataDescription(item)}`).join(" ");

    expect(copy).toContain("телефон и MAX");
    expect(copy).toContain("конкретные замечания по URL");
    expect(copy).not.toMatch(/Telegram|e-mail|overall (SEO )?score|общ(ую|ая) оценк/iu);
  });

  it("provides complete article metadata without overlong search titles", () => {
    const titles = new Set<string>();

    for (const locale of locales) {
      for (const slug of articleSlugs) {
        const article = getArticle(locale, slug);
        expect(article).toBeDefined();

        const metadata = buildArticleMetadata(locale, article!);
        const title = metadataTitle(metadata);
        const routePath = localizedPath(locale, `blog/${slug}`);
        const canonical = new URL(routePath, "https://kileni-seo.ru").toString();

        expect(title.length, `${locale}:${slug} title length`).toBeGreaterThanOrEqual(30);
        expect(title.length, `${locale}:${slug} title length`).toBeLessThanOrEqual(60);
        expect(metadata.description).toBe(article!.description);
        expect(metadataUrl(metadata.alternates?.canonical)).toBe(canonical);
        expect(metadataUrl(metadata.openGraph?.url)).toBe(canonical);
        expect(metadata.openGraph && "type" in metadata.openGraph ? metadata.openGraph.type : undefined).toBe("article");
        expect(titles.has(title), `duplicate article title: ${title}`).toBe(false);
        titles.add(title);
      }
    }
  });

  it("keeps audit-check and indexable glossary titles and descriptions search-ready", () => {
    for (const locale of locales) {
      const dynamicMetadata = [
        getAuditCheckMetadata(locale),
        ...auditCheckSlugs.map((slug) => getAuditCheckMetadata(locale, slug)),
        ...indexableGlossarySlugs.map((slug) => getGlossaryDetailMetadata(locale, slug)),
      ];

      for (const metadata of dynamicMetadata) {
        expect(metadata).not.toBeNull();
        const title = renderedMetadataTitle(metadata!);
        const description = metadataDescription(metadata!);
        expect(title.length, title).toBeGreaterThanOrEqual(30);
        expect(title.length, title).toBeLessThanOrEqual(60);
        expect(description.length, title).toBeGreaterThanOrEqual(70);
        expect(description.length, title).toBeLessThanOrEqual(160);
        expect(metadataUrl(metadata!.openGraph?.url), title).not.toBe("");
      }
    }
  });
});

describe("public sitemap", () => {
  it("publishes the SEO hub as a canonical Russian route", () => {
    expect(publicRoutes).toContain("seo");
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://kileni-seo.ru/seo");
    expect(urls.every(url => !new URL(url).pathname.startsWith("/en"))).toBe(true);
  });

  it("does not publish the retired Megamarket route or language alternates", () => {
    expect(publicRoutes).not.toContain("marketplaces/megamarket");
    const serialized = JSON.stringify(sitemap());
    expect(serialized).not.toContain("marketplaces/megamarket");
    expect(serialized).not.toContain("Megamarket");
    expect(serialized).not.toContain("Мегамаркет");
  });

  it("does not rewrite editorial lastmod dates from the deployment clock", () => {
    const current = sitemap();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2040-01-01T00:00:00.000Z"));
      expect(sitemap()).toEqual(current);
    } finally {
      vi.useRealTimers();
    }
  });

  it("publishes Russian canonical URLs with truthful lastmod and no artificial ranking hints", () => {
    const entries = sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

    expect(byUrl.size).toBe(entries.length);
    expect(entries).toHaveLength(
      publicRoutes.length + articleSlugs.length + auditCheckSitemapEntries.length + glossarySitemapPaths.length,
    );
    for (const entry of entries) {
      expect(entry).not.toHaveProperty("priority");
      expect(entry).not.toHaveProperty("changeFrequency");
      expect(entry.lastModified).toBeDefined();
      expect(Number.isNaN(new Date(entry.lastModified!).valueOf())).toBe(false);
    }

    for (const path of publicRoutes) {
      const ru = new URL(localizedPath("ru", path), "https://kileni-seo.ru").toString();
      for (const url of [ru]) {
        const entry = byUrl.get(url);
        expect(entry, url).toBeDefined();
        expect(entry?.lastModified).toBe(publicRouteLastModified(path));
        expect(entry?.alternates?.languages).toBeUndefined();
      }
    }

    for (const slug of articleSlugs) {
      const article = getArticle("ru", slug)!;
      const ru = new URL(`/blog/${slug}`, "https://kileni-seo.ru").toString();
      for (const url of [ru]) {
        const entry = byUrl.get(url);
        expect(entry, url).toBeDefined();
        expect(entry?.lastModified).toBe(article.date);
        expect(entry?.alternates?.languages).toBeUndefined();
      }
    }

    for (const { path, updatedAt } of auditCheckSitemapEntries) {
      expectLocalizedSitemapPair(byUrl, path, updatedAt);
    }

    for (const path of glossarySitemapPaths) {
      const slug = path.slice("glossary/".length);
      expectLocalizedSitemapPair(byUrl, path, getGlossaryTerm(slug)!.updatedAt);
    }
  });
});

function expectLocalizedSitemapPair(
  byUrl: Map<string, ReturnType<typeof sitemap>[number]>,
  path: string,
  lastModified: string,
): void {
  const ru = new URL(localizedPath("ru", path), "https://kileni-seo.ru").toString();
  for (const url of [ru]) {
    const entry = byUrl.get(url);
    expect(entry, url).toBeDefined();
    expect(entry?.lastModified).toBe(lastModified);
    expect(entry?.alternates?.languages).toBeUndefined();
  }
}

describe("robots deployment modes", () => {
  it("blocks the entire site while prelaunch mode is enabled", async () => {
    process.env.PRELAUNCH_MODE = "true";
    vi.resetModules();

    const { default: robots } = await import("../../app/robots");

    expect(robots()).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });

  it("allows public pages and keeps admin and API closed in production mode", async () => {
    process.env.PRELAUNCH_MODE = "false";
    vi.resetModules();

    const { default: robots } = await import("../../app/robots");

    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
      sitemap: "https://kileni-seo.ru/sitemap.xml",
    });
  });
});
