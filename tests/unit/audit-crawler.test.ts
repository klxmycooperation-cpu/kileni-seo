import { describe, expect, it } from "vitest";

import { crawlSite } from "../../src/lib/audit/crawler";
import { discoverSitemaps } from "../../src/lib/audit/discovery";
import type {
  AuditFetcher,
  SafeFetchResponse,
} from "../../src/lib/audit/fetch";
import type { AuditEvent, RobotsInfo } from "../../src/lib/audit/types";

function response(
  url: string,
  text: string,
  status = 200,
  contentType = "text/html; charset=utf-8",
): SafeFetchResponse {
  const body = new TextEncoder().encode(text);
  return {
    requestedUrl: url,
    url,
    status,
    ok: status >= 200 && status < 300,
    headers: { "content-type": contentType },
    body,
    text,
    redirects: [],
  };
}

describe("sitemap discovery", () => {
  const robots: RobotsInfo = {
    url: "https://example.com/robots.txt",
    status: "found",
    httpStatus: 200,
    allowedRoot: true,
    sitemapUrls: ["https://example.com/sitemap-0.xml"],
  };

  it("does not descend beyond sitemap-index depth three", async () => {
    const fetched: string[] = [];
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      fetched.push(url);
      const level = Number(url.match(/sitemap-(\d+)\.xml/)?.[1] ?? 0);
      return response(
        url,
        `<sitemapindex><sitemap><loc>https://example.com/sitemap-${level + 1}.xml</loc></sitemap></sitemapindex>`,
        200,
        "application/xml",
      );
    };

    const result = await discoverSitemaps("https://example.com", robots, fetcher);

    expect(fetched).toEqual([
      "https://example.com/sitemap-0.xml",
      "https://example.com/sitemap-1.xml",
      "https://example.com/sitemap-2.xml",
      "https://example.com/sitemap-3.xml",
    ]);
    expect(result.filesVisited).toBe(4);
  });

  it("hard-caps sitemap files at twenty", async () => {
    const many = Array.from(
      { length: 25 },
      (_, index) => `<sitemap><loc>https://example.com/child-${index}.xml</loc></sitemap>`,
    ).join("");
    let calls = 0;
    const fetcher: AuditFetcher = async (input) => {
      calls += 1;
      const url = new URL(input).href;
      if (url.endsWith("sitemap-0.xml")) {
        return response(url, `<sitemapindex>${many}</sitemapindex>`, 200, "application/xml");
      }
      return response(url, "<urlset></urlset>", 200, "application/xml");
    };

    const result = await discoverSitemaps("https://example.com", robots, fetcher);

    expect(calls).toBe(20);
    expect(result.filesVisited).toBe(20);
  });

  it("keeps duplicate, invalid and foreign sitemap evidence instead of silently dropping it", async () => {
    const fetcher: AuditFetcher = async (input) => response(
      new URL(input).href,
      `<urlset>
        <url><loc>https://example.com/product/1</loc></url>
        <url><loc>https://example.com/product/1</loc></url>
        <url><loc>https://outside.example/product/2</loc></url>
        <url><loc>not a url</loc></url>
        <url><loc>https://example.com/catalog.pdf</loc></url>
      </urlset>`,
      200,
      "application/xml",
    );

    const result = await discoverSitemaps("https://example.com", robots, fetcher);

    expect(result.urls).toEqual([
      "https://example.com/product/1",
      "https://example.com/catalog.pdf",
    ]);
    expect(result.duplicateUrls).toEqual(["https://example.com/product/1"]);
    expect(result.foreignUrls).toEqual(["https://outside.example/product/2"]);
    expect(result.invalidUrls).toEqual(["not a url"]);
    expect(result.files).toEqual([
      expect.objectContaining({ url: "https://example.com/sitemap-0.xml", kind: "urlset", statusCode: 200 }),
    ]);
  });

  it("reports malformed XML instead of treating an empty response as a valid sitemap", async () => {
    const fetcher: AuditFetcher = async (input) => response(
      new URL(input).href,
      "<html>not a sitemap</html>",
      200,
      "text/html",
    );

    const result = await discoverSitemaps("https://example.com", robots, fetcher);

    expect(result.status).toBe("error");
    expect(result.errors[0]).toContain("не распознан как sitemap XML");
  });
});

describe("synthetic same-domain crawler", () => {
  it("emits only observed discovery, selection and checked-page progress", async () => {
    const events: AuditEvent[] = [];
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt")) {
        return response(url, "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", 200, "text/plain");
      }
      if (url.endsWith("/sitemap.xml")) {
        return response(url, "<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/pricing</loc></url><url><loc>https://example.com/login</loc></url></urlset>", 200, "application/xml");
      }
      if (url.endsWith("/pricing")) {
        return response(url, '<html lang="ru"><head><title>Цены и тарифы</title></head><body><h1>Цены</h1></body></html>');
      }
      if (url.endsWith("/login")) {
        return response(url, '<html lang="ru"><head><title>Вход</title></head><body><h1>Вход</h1><form><input type="password"></form></body></html>');
      }
      return response(url, '<html lang="ru"><head><title>Главная страница</title></head><body><h1>Главная</h1></body></html>');
    };

    await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
      onEvent: (event) => { events.push(event); },
    });

    expect(events).toContainEqual(expect.objectContaining({
      type: "selection:start",
      pagesDiscovered: 3,
      pagesEligible: 2,
      technicalFilesChecked: 2,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: "selection:complete",
      pagesDiscovered: 3,
      pagesEligible: 2,
      pagesSelected: 2,
      technicalFilesChecked: 2,
      selectedPages: expect.arrayContaining([
        expect.objectContaining({ url: "https://example.com/", pageType: "homepage" }),
        expect.objectContaining({ url: "https://example.com/pricing", pageType: "pricing" }),
      ]),
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: "crawl:page",
      currentUrl: "https://example.com/pricing",
      currentPageType: "pricing",
      pagesChecked: 2,
      pagesSelected: 2,
    }));
    expect(events.some((event) => event.type === "crawl:progress" && event.pagesChecked === 0)).toBe(false);
  });

  it("classifies the inventory before sampling and excludes an extensionless API response", async () => {
    const documents = new Map<string, SafeFetchResponse>([
      ["https://example.com/", response(
        "https://example.com/",
        '<html lang="ru"><head><title>Главная страница компании</title></head><body><h1>Компания</h1><a href="/services/seo">SEO</a><a href="/api/catalog">API</a></body></html>',
      )],
      ["https://example.com/services/seo", response(
        "https://example.com/services/seo",
        '<html lang="ru"><head><title>SEO-продвижение сайта</title><script type="application/ld+json">{"@type":"Service"}</script></head><body><h1>SEO-продвижение</h1></body></html>',
      )],
      ["https://example.com/api/catalog", response(
        "https://example.com/api/catalog",
        '{"items":[]}',
        200,
        "application/json",
      )],
    ]);
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt")) {
        return response(url, "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", 200, "text/plain");
      }
      if (url.endsWith("/sitemap.xml")) {
        return response(url, "<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/services/seo</loc></url><url><loc>https://example.com/api/catalog</loc></url></urlset>", 200, "application/xml");
      }
      return documents.get(url) ?? response(url, "not found", 404, "text/plain");
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    expect(result.selectedPages.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/services/seo",
    ]);
    expect(result.pages.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/services/seo",
    ]);
    expect(result.inventory.find((item) => item.finalUrl === "https://example.com/api/catalog"))
      .toMatchObject({ resourceType: "api", pageType: null });
    expect(result.inventory.find((item) => item.finalUrl === "https://example.com/robots.txt"))
      .toMatchObject({ resourceType: "robots", pageType: null });
    expect(result.inventory.find((item) => item.finalUrl === "https://example.com/sitemap.xml"))
      .toMatchObject({ resourceType: "sitemap", pageType: null });
  });

  it("reads canonical links during discovery and never selects the confirmed duplicate", async () => {
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt") || url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404, "text/plain");
      }
      if (url === "https://example.com/") {
        return response(url, '<html lang="ru"><head><title>Главная</title><link rel="canonical" href="https://example.com/"></head><body><h1>Главная</h1><a href="/services/a">A</a><a href="/services/b">B</a></body></html>');
      }
      const canonical = url.endsWith("/services/b") ? "/services/a" : "/services/a";
      return response(url, `<html lang="ru"><head><title>Услуга</title><link rel="canonical" href="${canonical}"><script type="application/ld+json">{"@type":"Service"}</script></head><body><h1>Услуга</h1></body></html>`);
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    expect(result.selectedPages.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/services/a",
    ]);
    expect(result.pages.map((item) => item.url)).not.toContain("https://example.com/services/b");
    expect(result.inventory.find((item) => item.finalUrl.endsWith("/services/b"))?.canonicalUrl)
      .toBe("https://example.com/services/a");
  });

  it("keeps a robots-blocked HTML address in inventory without spending a checked-page slot", async () => {
    const calls: string[] = [];
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      calls.push(url);
      if (url.endsWith("/robots.txt")) return response(url, "User-agent: *\nDisallow: /private\nSitemap: https://example.com/sitemap.xml", 200, "text/plain");
      if (url.endsWith("/sitemap.xml")) return response(url, "<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/private</loc></url></urlset>", 200, "application/xml");
      return response(url, "<html lang=\"ru\"><head><title>Главная страница</title></head><body><h1>Компания</h1></body></html>");
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    expect(result.inventory.find((item) => item.finalUrl === "https://example.com/private")?.indexabilitySignals)
      .toContain("robots_blocked");
    expect(result.selectedPages.map((item) => item.url)).not.toContain("https://example.com/private");
    expect(calls.filter((url) => url === "https://example.com/private")).toHaveLength(0);
  });

  it("finishes link discovery before choosing two pages and reaches a deep commercial page", async () => {
    const documents = new Map<string, SafeFetchResponse>([
      ["https://example.com/", response(
        "https://example.com/",
        '<html lang="ru"><head><title>Компания</title></head><body><h1>Компания</h1><a href="/about">О нас</a></body></html>',
      )],
      ["https://example.com/about", response(
        "https://example.com/about",
        '<html lang="ru"><head><title>О компании</title></head><body><h1>О компании</h1><a href="/services/enterprise-seo">SEO для бизнеса</a></body></html>',
      )],
      ["https://example.com/services/enterprise-seo", response(
        "https://example.com/services/enterprise-seo",
        '<html lang="ru"><head><title>SEO-продвижение для бизнеса</title><script type="application/ld+json">{"@type":"Service"}</script></head><body><h1>SEO-продвижение для бизнеса</h1></body></html>',
      )],
    ]);
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt") || url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404, "text/plain");
      }
      return documents.get(url) ?? response(url, "not found", 404, "text/plain");
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 2,
      sampleStrategy: "representative",
    });

    expect(result.inventory.map((item) => item.finalUrl)).toContain(
      "https://example.com/services/enterprise-seo",
    );
    expect(result.selectedPages.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/services/enterprise-seo",
    ]);
    expect(result.pages.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/services/enterprise-seo",
    ]);
  });

  it("keeps query and UTM variants in inventory without selecting them", async () => {
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt") || url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404, "text/plain");
      }
      if (url === "https://example.com/") {
        return response(url, `<html lang="ru"><head><title>Каталог</title></head><body><h1>Каталог</h1>
          <a href="/catalog">Каталог</a>
          <a href="/catalog?sort=price">Сортировка</a>
          <a href="/?utm_source=partner">Метка</a>
        </body></html>`);
      }
      return response(url, '<html lang="ru"><head><title>Каталог товаров</title></head><body><h1>Товары</h1></body></html>');
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    expect(result.inventory.map((item) => item.finalUrl)).toEqual(expect.arrayContaining([
      "https://example.com/?utm_source=partner",
      "https://example.com/catalog?sort=price",
    ]));
    expect(result.selectedPages.every((item) => !new URL(item.url).search)).toBe(true);
  });

  it("does not let arbitrary parameterized URLs exhaust discovery before a clean page", async () => {
    const calls: string[] = [];
    const parameterLinks = Array.from(
      { length: 110 },
      (_, index) => `<a href="/?offer=${String(index).padStart(3, "0")}">Offer</a>`,
    ).join("");
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      calls.push(url);
      if (url.endsWith("/robots.txt") || url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404, "text/plain");
      }
      if (url === "https://example.com/") {
        return response(url, `<html lang="ru"><head><title>Главная</title></head><body><h1>Главная</h1>${parameterLinks}<a href="/services/seo">SEO</a></body></html>`);
      }
      return response(url, '<html lang="ru"><head><title>SEO</title><script type="application/ld+json">{"@type":"Service"}</script></head><body><h1>SEO</h1></body></html>');
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    expect(result.selectedPages.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/services/seo",
    ]);
    expect(result.inventory.some((item) => item.finalUrl.includes("?offer="))).toBe(true);
    expect(calls.some((url) => url.includes("?offer="))).toBe(false);
  });

  it("discovers high-value commercial routes before the technical discovery limit is exhausted", async () => {
    const fetched = new Set<string>();
    const informational = Array.from({ length: 115 }, (_, index) => `https://example.com/help-${String(index).padStart(3, "0")}`);
    const priorityPaths = [
      "/services",
      "/seo",
      "/pricing",
      "/free-audit",
      "/brief",
      "/contacts",
      "/cases/result",
      "/blog/guide",
    ];
    const sitemapUrls = ["https://example.com/", ...informational, ...priorityPaths.map((path) => `https://example.com${path}`)];
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      fetched.add(url);
      if (url.endsWith("/robots.txt")) {
        return response(url, "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", 200, "text/plain");
      }
      if (url.endsWith("/sitemap.xml")) {
        return response(url, `<urlset>${sitemapUrls.map((item) => `<url><loc>${item}</loc></url>`).join("")}</urlset>`, 200, "application/xml");
      }
      const path = new URL(url).pathname;
      if (path === "/seo") return response(url, '<html lang="ru"><head><title>SEO-услуга</title><script type="application/ld+json">{"@type":"Service"}</script></head><body><h1>SEO-услуга</h1></body></html>');
      if (path === "/pricing") return response(url, '<html lang="ru"><head><title>Цены</title></head><body><h1>Цены</h1></body></html>');
      if (path === "/contacts") return response(url, '<html lang="ru"><head><title>Контакты</title></head><body><h1>Контакты</h1><form></form></body></html>');
      if (path === "/cases/result") return response(url, '<html lang="ru"><head><title>Кейс</title></head><body><h1>Кейс</h1></body></html>');
      if (path === "/blog/guide") return response(url, '<html lang="ru"><head><title>Статья</title><script type="application/ld+json">{"@type":"Article"}</script></head><body><h1>Статья</h1></body></html>');
      if (path === "/free-audit" || path === "/brief") return response(url, `<html lang="ru"><head><title>Форма заявки</title></head><body><h1>Форма заявки</h1><form></form></body></html>`);
      if (path === "/services") return response(url, '<html lang="ru"><head><title>Все услуги</title></head><body><h1>Все услуги</h1></body></html>');
      return response(url, '<html lang="ru"><head><title>Справочная страница</title></head><body><h1>Справка</h1></body></html>');
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    for (const path of priorityPaths) expect(fetched).toContain(`https://example.com${path}`);
    expect(result.selectedPages.map((page) => new URL(page.url).pathname)).toEqual(expect.arrayContaining(priorityPaths));
  });

  it("prefetches the same diverse and commercially important 100 URLs regardless of sitemap order", async () => {
    const importantPaths = [
      "/marketplaces",
      "/marketplaces/wildberries",
      "/marketplaces/ozon",
      "/marketplaces/yandex-market",
      "/web-development",
      "/yandex-ads",
      "/custom-task",
    ];
    const informationalPaths = [
      ...Array.from({ length: 70 }, (_, index) => `/checks/check-${String(index).padStart(3, "0")}`),
      ...Array.from({ length: 70 }, (_, index) => `/docs/note-${String(index).padStart(3, "0")}`),
      ...Array.from({ length: 66 }, (_, index) => `/glossary/term-${String(index).padStart(3, "0")}`),
    ];
    const legalPaths = ["/consent", "/privacy"];
    const canonicalOrder = ["/", ...informationalPaths, ...legalPaths, ...importantPaths];

    const run = async (orderedPaths: readonly string[]) => {
      const fetchedPages: string[] = [];
      const fetcher: AuditFetcher = async (input) => {
        const url = new URL(input).href;
        const path = new URL(url).pathname;
        if (path === "/robots.txt") {
          return response(url, "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", 200, "text/plain");
        }
        if (path === "/sitemap.xml") {
          return response(url, `<urlset>${orderedPaths.map((item) => `<url><loc>https://example.com${item}</loc></url>`).join("")}</urlset>`, 200, "application/xml");
        }
        fetchedPages.push(path);
        const isService = importantPaths.includes(path);
        return response(url, `<html lang="ru"><head><title>${isService ? "Услуга" : "Материал"}</title>${isService ? '<script type="application/ld+json">{"@type":"Service"}</script>' : ""}</head><body><h1>${isService ? "Услуга" : "Материал"}</h1></body></html>`);
      };

      await crawlSite("https://example.com/", {
        fetcher,
        maxPages: 10,
        sampleStrategy: "representative",
      });
      return fetchedPages.slice(0, 100);
    };

    const forward = await run(canonicalOrder);
    const reverse = await run([...canonicalOrder].reverse());
    const rotated = await run([...canonicalOrder.slice(97), ...canonicalOrder.slice(0, 97)]);

    expect(new Set(forward)).toEqual(new Set(reverse));
    expect(new Set(forward)).toEqual(new Set(rotated));
    expect(forward).toHaveLength(100);
    for (const path of importantPaths) expect(forward).toContain(path);
    expect(forward.filter((path) => legalPaths.includes(path))).toHaveLength(1);

    const firstKnowledgePaths = forward.filter((path) => /^(?:\/checks|\/docs|\/glossary)\//u.test(path)).slice(0, 3);
    expect(new Set(firstKnowledgePaths.map((path) => path.split("/")[1]))).toEqual(new Set(["checks", "docs", "glossary"]));
  });

  it("does not let a later link rediscovery overwrite an observed low-confidence HTML page", async () => {
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt")) {
        return response(url, "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", 200, "text/plain");
      }
      if (url.endsWith("/sitemap.xml")) {
        return response(url, "<urlset><url><loc>https://example.com/free-audit</loc></url><url><loc>https://example.com/help</loc></url></urlset>", 200, "application/xml");
      }
      if (url.endsWith("/help")) {
        return response(url, '<html lang="ru"><head><title>Справка</title></head><body><h1>Справка</h1><a href="/free-audit">Проверить</a></body></html>');
      }
      if (url.endsWith("/free-audit")) {
        return response(url, '<html lang="ru"><head><title>Бесплатная проверка</title></head><body><h1>Проверить сайт</h1><form></form></body></html>');
      }
      return response(url, '<html lang="ru"><head><title>Главная</title></head><body><h1>Главная</h1></body></html>');
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    expect(result.inventory.find((item) => item.finalUrl === "https://example.com/free-audit")).toMatchObject({
      resourceType: "html",
      statusCode: 200,
    });
    expect(result.selectedPages.map((page) => page.url)).toContain("https://example.com/free-audit");
  });

  it("keeps an extensionless response without HTML evidence out of the checked sample", async () => {
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt")) {
        return response(url, "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", 200, "text/plain");
      }
      if (url.endsWith("/sitemap.xml")) {
        return response(url, "<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/download</loc></url></urlset>", 200, "application/xml");
      }
      if (url.endsWith("/download")) return response(url, "binary payload", 200, "");
      return response(url, '<html lang="ru"><head><title>Главная</title></head><body><h1>Компания</h1></body></html>');
    };

    const result = await crawlSite("https://example.com/", {
      fetcher,
      maxPages: 10,
      sampleStrategy: "representative",
    });

    expect(result.inventory.find((item) => item.finalUrl === "https://example.com/download"))
      .toMatchObject({ resourceType: "unknown", pageType: null });
    expect(result.selectedPages.map((item) => item.url)).not.toContain("https://example.com/download");
    expect(result.pages.map((item) => item.url)).not.toContain("https://example.com/download");
  });

  it("crawls breadth-first, respects robots and never exceeds concurrency four", async () => {
    const calls: string[] = [];
    let active = 0;
    let maxActive = 0;
    const documents = new Map<string, string>([
      [
        "https://example.com/",
        `<html lang="en"><head><title>Home page with a sufficiently useful title</title></head><body>
          <h1>Home</h1>
          <a href="/a">A</a><a href="/b">B</a><a href="/c">C</a><a href="/d">D</a><a href="/e">E</a>
          <a href="/blocked">Blocked</a><a href="https://outside.example/x">Outside</a>
        </body></html>`,
      ],
      ["https://example.com/a", "<html><body><h1>A</h1><a href='/deep'>Deep</a></body></html>"],
      ["https://example.com/b", "<html><body><h1>B</h1></body></html>"],
      ["https://example.com/c", "<html><body><h1>C</h1></body></html>"],
      ["https://example.com/d", "<html><body><h1>D</h1></body></html>"],
      ["https://example.com/e", "<html><body><h1>E</h1></body></html>"],
      ["https://example.com/deep", "<html><body><h1>Deep</h1></body></html>"],
    ]);
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      calls.push(url);
      if (url.endsWith("/robots.txt")) {
        return response(
          url,
          "User-agent: *\nDisallow: /blocked",
          200,
          "text/plain",
        );
      }
      if (url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404, "text/plain");
      }
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 3));
      active -= 1;
      const html = documents.get(url);
      return html
        ? response(url, html)
        : response(url, "not found", 404, "text/plain");
    };

    const result = await crawlSite("example.com", {
      fetcher,
      concurrency: 4,
      maxPages: 100,
    });

    expect(result.pages.map((page) => page.url)).toEqual([
      "https://example.com/",
      "https://example.com/a",
      "https://example.com/b",
      "https://example.com/c",
      "https://example.com/d",
      "https://example.com/e",
      "https://example.com/deep",
    ]);
    expect(maxActive).toBe(4);
    expect(calls).not.toContain("https://example.com/blocked");
    expect(calls).not.toContain("https://outside.example/x");
    expect(result.pagesChecked).toBe(7);
    expect(result.pagesDiscovered).toBe(8);
  });

  it("never analyzes more than one hundred HTML pages and reports the larger discovered set", async () => {
    const links = Array.from({ length: 130 }, (_, index) => `<a href="/p${index}">P</a>`).join("");
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt") || url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404, "text/plain");
      }
      return response(url, `<html><head><title>Page title long enough for audit</title></head><body><h1>Page</h1>${url.endsWith("/") ? links : ""}</body></html>`);
    };

    const result = await crawlSite("https://example.com", { fetcher, maxPages: 100 });
    expect(result.pages).toHaveLength(100);
    expect(result.pagesChecked).toBe(100);
    expect(result.pagesDiscovered).toBe(131);
  });
});
