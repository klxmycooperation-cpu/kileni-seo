import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import { classifyAnalyzedPage, classifyAuditObject } from "../../src/lib/audit/classification";
import {
  AUDIT_CHECK_REGISTRY_V3,
  evaluateAuditChecksV3,
} from "../../src/lib/audit/check-registry-v3";
import type { PageAnalysis, RobotsInfo, SitemapInfo } from "../../src/lib/audit/types";

function page(input: {
  url: string;
  title: string;
  h1: string;
  schema?: string;
  noindex?: boolean;
  body?: string;
  status?: number;
}): PageAnalysis {
  return analyzePage({
    url: input.url,
    status: input.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    html: `<!doctype html><html lang="ru"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width">
      <title>${input.title}</title>
      <meta name="description" content="Подробное описание страницы, которое точно объясняет её содержание посетителю сайта и поисковой системе.">
      <link rel="canonical" href="${input.url}">
      ${input.noindex ? '<meta name="robots" content="noindex,follow">' : ""}
      ${input.schema ? `<script type="application/ld+json">{"@type":"${input.schema}"}</script>` : ""}
      </head><body><h1>${input.h1}</h1>${input.body ?? ""}<a href="/">Главная</a></body></html>`,
  });
}

const robots: RobotsInfo = {
  url: "https://example.com/robots.txt",
  status: "found",
  httpStatus: 200,
  allowedRoot: true,
  sitemapUrls: ["https://example.com/sitemap.xml"],
  body: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
};

const sitemap: SitemapInfo = {
  status: "found",
  filesVisited: 1,
  urls: ["https://example.com/", "https://example.com/services/seo"],
  errors: [],
};

function evaluate(pages: readonly PageAnalysis[], overrides: {
  robots?: RobotsInfo | null;
  sitemap?: SitemapInfo | null;
} = {}) {
  const objects = [
    classifyAuditObject({ url: robots.url, contentType: "text/plain", statusCode: 200 }),
    classifyAuditObject({ url: "https://example.com/sitemap.xml", contentType: "application/xml", statusCode: 200 }),
    ...pages.map((page) => classifyAnalyzedPage(page)),
  ];
  return evaluateAuditChecksV3({
    targetUrl: "https://example.com/",
    objects,
    pages,
    robots: overrides.robots === undefined ? robots : overrides.robots,
    sitemap: overrides.sitemap === undefined ? sitemap : overrides.sitemap,
    performance: null,
  });
}

describe("Audit Check Registry v3 applicability", () => {
  it("declares scope, applicability, runner and public limits for every check", () => {
    expect(AUDIT_CHECK_REGISTRY_V3.length).toBeGreaterThan(20);
    expect(AUDIT_CHECK_REGISTRY_V3.every((check) =>
      check.checkId
      && check.version > 0
      && check.scope
      && typeof check.appliesTo === "function"
      && typeof check.run === "function"
      && check.publicExplanation
      && check.automationLimit
    )).toBe(true);
    expect(new Set(AUDIT_CHECK_REGISTRY_V3.map((check) => check.checkId)).size)
      .toBe(AUDIT_CHECK_REGISTRY_V3.length);
  });

  it("returns at least one explicit result for every current check", () => {
    const checks = evaluate([]);

    expect(new Set(checks.map((check) => check.checkId))).toEqual(
      new Set(AUDIT_CHECK_REGISTRY_V3.map((check) => check.checkId)),
    );
  });

  it("never runs HTML checks on robots or sitemap resources", () => {
    const checks = evaluate([]);
    const resourceUrls = new Set([robots.url, "https://example.com/sitemap.xml"]);
    const htmlCheckIds = new Set(["title", "description", "h1", "canonical", "viewport", "auth"]);

    expect(checks.filter((check) => resourceUrls.has(check.targetUrl ?? "") && htmlCheckIds.has(check.checkId)))
      .toEqual([]);
  });

  it("marks authorization not applicable on a normal service page", () => {
    const service = page({
      url: "https://example.com/services/seo",
      title: "SEO-продвижение сайта для бизнеса",
      h1: "SEO-продвижение сайта",
      schema: "Service",
    });
    const auth = evaluate([service]).find((check) => check.checkId === "auth");

    expect(auth).toMatchObject({
      status: "not_applicable",
      reason: "Признаки авторизации на странице не обнаружены",
      targetUrl: service.url,
    });
  });

  it("does not treat intentional noindex on a login page as an SEO failure", () => {
    const login = page({
      url: "https://example.com/login",
      title: "Вход в личный кабинет",
      h1: "Войти",
      noindex: true,
      body: '<form action="/session"><input name="email"><input type="password" name="password"><button>Войти</button></form>',
    });
    const checks = evaluate([login]).filter((check) => check.targetUrl === login.url);

    expect(checks.find((check) => check.checkId === "indexability")).toMatchObject({
      status: "not_applicable",
    });
    expect(checks.find((check) => check.checkId === "auth")).toMatchObject({ status: "pass" });
    expect(checks.filter((check) => ["title", "description", "commercial-structured-data"].includes(check.checkId)))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ checkId: "title", status: "not_applicable" }),
        expect.objectContaining({ checkId: "description", status: "not_applicable" }),
        expect.objectContaining({ checkId: "commercial-structured-data", status: "not_applicable" }),
      ]));
  });

  it("reports noindex as a failure on a service page", () => {
    const service = page({
      url: "https://example.com/services/seo",
      title: "SEO-продвижение сайта для бизнеса",
      h1: "SEO-продвижение сайта",
      schema: "Service",
      noindex: true,
    });

    expect(evaluate([service]).find((check) => check.checkId === "indexability"))
      .toMatchObject({ status: "fail", targetUrl: service.url });
  });

  it("runs form checks only when a form exists", () => {
    const service = page({
      url: "https://example.com/services/seo",
      title: "SEO-продвижение сайта для бизнеса",
      h1: "SEO-продвижение сайта",
      schema: "Service",
    });

    expect(evaluate([service]).find((check) => check.checkId === "forms"))
      .toMatchObject({ status: "not_applicable", reason: "На странице нет формы" });
  });

  it("runs hreflang when the HTML contains an alternate-language link", () => {
    const localized = analyzePage({
      url: "https://example.com/services/seo",
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      html: `<!doctype html><html lang="ru"><head>
        <title>SEO-продвижение сайта для бизнеса</title>
        <link rel="alternate" hreflang="en" href="/en/services/seo">
      </head><body><h1>SEO-продвижение</h1></body></html>`,
    });

    expect(evaluate([localized]).find((item) => item.checkId === "hreflang"))
      .toMatchObject({ status: "pass", reason: "Указано языковых связей: 1" });
  });

  it("keeps actual index, positions, impressions, CTR and traffic unconfirmed without external access", () => {
    const checks = evaluate([page({
      url: "https://example.com/services/seo",
      title: "SEO-продвижение сайта для бизнеса",
      h1: "SEO-продвижение сайта",
      schema: "Service",
    })]);

    expect(checks.filter((check) => ["actual-index", "search-positions", "impressions-ctr", "traffic"].includes(check.checkId)))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ checkId: "actual-index", status: "insufficient_data" }),
        expect.objectContaining({ checkId: "search-positions", status: "insufficient_data" }),
        expect.objectContaining({ checkId: "impressions-ctr", status: "insufficient_data" }),
        expect.objectContaining({ checkId: "traffic", status: "insufficient_data" }),
      ]));
  });

  it("does not turn a missing robots.txt into an automatic fail", () => {
    const missing: RobotsInfo = {
      url: robots.url,
      status: "missing",
      httpStatus: 404,
      allowedRoot: true,
      sitemapUrls: [],
    };
    const check = evaluate([], { robots: missing }).find((item) => item.checkId === "robots-file");

    expect(check?.status).toBe("warning");
  });

  it("reports sitemap duplicates, invalid addresses and foreign hosts as separate facts", () => {
    const checks = evaluate([], {
      sitemap: {
        ...sitemap,
        duplicateUrls: ["https://example.com/services/seo"],
        invalidUrls: ["not a url"],
        foreignUrls: ["https://outside.example/page"],
      },
    });

    expect(checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ checkId: "sitemap-duplicates", status: "warning" }),
      expect.objectContaining({ checkId: "sitemap-invalid-urls", status: "warning" }),
      expect.objectContaining({ checkId: "sitemap-hosts", status: "warning" }),
    ]));
  });
});
