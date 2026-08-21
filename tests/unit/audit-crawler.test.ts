import { describe, expect, it } from "vitest";

import { crawlSite } from "../../src/lib/audit/crawler";
import { discoverSitemaps } from "../../src/lib/audit/discovery";
import type {
  AuditFetcher,
  SafeFetchResponse,
} from "../../src/lib/audit/fetch";
import type { RobotsInfo } from "../../src/lib/audit/types";

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
});

describe("synthetic same-domain crawler", () => {
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
