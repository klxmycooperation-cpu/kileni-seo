import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuditLiveProgress } from "../../src/components/forms/AuditLiveProgress";

describe("audit live progress", () => {
  it("keeps the connection scene focused and does not reveal later-stage objects", () => {
    const html = renderToStaticMarkup(createElement(AuditLiveProgress, {
      locale: "ru",
      domain: "example.com",
      snapshot: { status: "connecting", pagesChecked: 0, pagesDiscovered: 0 },
    }));

    expect(html).toContain("Подключаемся к сайту");
    expect(html).toContain("audit-live__connection");
    expect(html).not.toContain("robots.txt");
    expect(html).not.toContain("sitemap.xml");
    expect(html).not.toContain("Последние события");
    expect(html).not.toContain("LIVE SEO AUDIT");
    expect(html).not.toContain("Здесь появятся");
  });

  it("shows technical files only on the real rules stage", () => {
    const html = renderToStaticMarkup(createElement(AuditLiveProgress, {
      locale: "ru",
      domain: "example.com",
      snapshot: {
        status: "checking_sitemaps",
        robotsStatus: "found",
        sitemapStatus: "missing",
        technicalFilesChecked: 2,
        recentEvents: [{ kind: "robots_checked" }, { kind: "sitemap_checked" }],
      },
    }));

    expect(html).toContain("Читаем правила сайта");
    expect(html).toContain("robots.txt");
    expect(html).toContain("sitemap.xml");
    expect(html).toContain("Прочитан");
    expect(html).toContain("Не найден");
  });

  it("uses at most three real metrics and no fake percentage before selection", () => {
    const html = renderToStaticMarkup(createElement(AuditLiveProgress, {
      locale: "ru",
      domain: "example.com",
      snapshot: {
        status: "crawling_pages",
        selectionComplete: false,
        pagesDiscovered: 69,
        pagesEligible: 59,
        pagesSelected: 0,
      },
    }));

    expect((html.match(/<dt>/gu) ?? [])).toHaveLength(3);
    expect(html).toContain("Ещё не выбраны");
    expect(html).not.toContain("aria-valuenow");
    expect(html).not.toMatch(/\d+%/u);
  });

  it("counts a failed page before announcing the next page position", () => {
    const html = renderToStaticMarkup(createElement(AuditLiveProgress, {
      locale: "ru",
      domain: "example.com",
      snapshot: {
        status: "crawling_pages",
        pagesChecked: 0,
        pagesDiscovered: 2,
        pagesEligible: 2,
        pagesSelected: 2,
        selectionComplete: true,
        selectedPages: [
          { url: "https://example.com/first", pageType: "service", selectionReason: "primary_commercial" },
          { url: "https://example.com/second", pageType: "pricing", selectionReason: "conversion_support" },
        ],
        checkedUrls: [],
        failedUrls: ["https://example.com/first"],
        currentUrl: "https://example.com/second",
        currentPageType: "pricing",
        eventKind: "page_started",
      },
    }));

    expect(html).toContain("Проверяем 2 из 2");
    expect(html).toContain("Страница с ценами · /second");
    expect(html).toContain("Не удалось проверить");
  });
});
