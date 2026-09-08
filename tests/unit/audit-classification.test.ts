import { describe, expect, it } from "vitest";

import {
  classifyAuditObject,
  classifyAnalyzedPage,
} from "../../src/lib/audit/classification";
import { analyzePage } from "../../src/lib/audit/analyzer";

describe("audit object classification", () => {
  it.each([
    ["https://example.com/robots.txt", "text/plain", "robots"],
    ["https://example.com/sitemap.xml", "application/xml", "sitemap"],
    ["https://example.com/feed.xml", "application/rss+xml", "xml_feed"],
    ["https://example.com/catalog.pdf", "application/pdf", "document"],
    ["https://example.com/logo.webp", "image/webp", "image"],
    ["https://example.com/app.js", "text/javascript", "script"],
    ["https://example.com/app.css", "text/css", "stylesheet"],
    ["https://example.com/api/products", "application/json", "api"],
  ])("classifies %s as a technical resource", (url, contentType, resourceType) => {
    expect(classifyAuditObject({ url, contentType, statusCode: 200 })).toMatchObject({
      resourceType,
      pageType: null,
    });
  });

  it("does not classify an ordinary page as account from a URL fragment alone", () => {
    const result = classifyAuditObject({
      url: "https://example.com/accounting-services",
      contentType: "text/html; charset=utf-8",
      statusCode: 200,
      title: "Бухгалтерские услуги для бизнеса",
      h1: ["Бухгалтерское сопровождение"],
      schemaTypes: ["Service"],
      templateSignature: "service-detail",
    });

    expect(result).toMatchObject({ resourceType: "html", pageType: "service" });
    expect(result.authSignals).toEqual([]);
  });

  it("uses strong login signals instead of guessing from the route", () => {
    const page = analyzePage({
      url: "https://example.com/sign-in",
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      html: `<!doctype html><html lang="ru"><head><title>Вход в кабинет</title></head>
        <body><h1>Войти</h1><form action="/session"><input name="email">
        <input type="password" name="password"><button>Войти</button></form></body></html>`,
    });

    const result = classifyAnalyzedPage(page);

    expect(result).toMatchObject({ resourceType: "html", pageType: "auth" });
    expect(result.authSignals).toEqual(expect.arrayContaining(["password_input", "login_form"]));
    expect(result.classificationConfidence).toBeGreaterThanOrEqual(0.8);
  });

  it("does not treat every public page as auth when a shared header contains a login form", () => {
    const page = analyzePage({
      url: "https://example.com/blog/how-to-choose-bricks",
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      html: `<!doctype html><html lang="ru"><head><title>Как выбрать кирпич</title>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script>
        </head><body><header><form action="/login"><input name="email">
        <input type="password" name="password"><button>Войти</button></form></header>
        <main><article><h1>Как выбрать кирпич для дома</h1><p>Подробное руководство по выбору материала.</p></article></main>
        </body></html>`,
    });

    const result = classifyAnalyzedPage(page);

    expect(result).toMatchObject({ resourceType: "html", pageType: "article" });
    expect(result.authSignals).toEqual(expect.arrayContaining(["password_input", "login_form"]));
    expect(result.classificationReasons).not.toEqual(expect.arrayContaining(["auth:password_input", "auth:login_form"]));
  });

  it("keeps a low-confidence HTML page unknown instead of inventing a type", () => {
    const result = classifyAuditObject({
      url: "https://example.com/x-42",
      contentType: "text/html",
      statusCode: 200,
      title: "Страница",
      h1: ["Информация"],
    });

    expect(result).toMatchObject({ resourceType: "html", pageType: "unknown" });
    expect(result.classificationConfidence).toBeLessThan(0.6);
  });

  it.each([
    ["https://example.com/about", "О компании", "О компании", [], "about"],
    ["https://example.com/blog", "Блог", "Блог", [], "category"],
    ["https://example.com/blog/how-to-grow", "Как расти в поиске", "Как расти в поиске", ["Article"], "article"],
    ["https://example.com/services", "Услуги компании", "Услуги", ["Service"], "category"],
  ])("assigns a semantic page type to %s", (url, title, h1, schemaTypes, pageType) => {
    expect(classifyAuditObject({
      url,
      contentType: "text/html",
      statusCode: 200,
      title,
      h1: [h1],
      schemaTypes,
    })).toMatchObject({ pageType });
  });

  it.each([
    ["https://example.com/en/blog", "Insights", "Insights", "category"],
    ["https://example.com/en/glossary/canonical", "Canonical URL", "Canonical URL", "article"],
    ["https://example.com/en/marketplaces/ozon", "Ozon product cards", "Ozon", "service"],
  ])("classifies a localized public route without treating the locale as its section", (url, title, h1, pageType) => {
    expect(classifyAuditObject({
      url,
      contentType: "text/html",
      statusCode: 200,
      title,
      h1: [h1],
      language: "en",
    })).toMatchObject({ pageType, language: "en" });
  });

  it.each([
    ["https://example.com/glossary", "Словарь", "Термины простыми словами", "category"],
    ["https://example.com/checks/http-status", "Код ответа", "Код ответа страницы", "article"],
    ["https://example.com/free-audit", "Проверить сайт", "Бесплатная проверка сайта", "utility"],
    ["https://example.com/brief", "Бриф", "Расскажите о задаче", "utility"],
  ])("recognizes a common knowledge or conversion route %s", (url, title, h1, pageType) => {
    expect(classifyAuditObject({
      url,
      contentType: "text/html",
      statusCode: 200,
      title,
      h1: [h1],
    })).toMatchObject({ pageType });
  });

  it.each([
    ["https://example.com/en/privacy", "Data policy", "How we handle data", "legal"],
    ["https://example.com/en/seo-audit", "Site review", "Find what prevents growth", "service"],
    ["https://example.com/web-development", "Web projects", "Build a useful site", "service"],
  ])("uses an unambiguous localized route when headings use different wording", (url, title, h1, pageType) => {
    expect(classifyAuditObject({
      url,
      contentType: "text/html",
      statusCode: 200,
      title,
      h1: [h1],
    })).toMatchObject({ pageType });
  });

  it("records redirect, indexability and language observations with the classification", () => {
    const result = classifyAuditObject({
      url: "https://example.com/en/products/phone",
      finalUrl: "https://example.com/en/products/phone/",
      contentType: "text/html",
      statusCode: 200,
      title: "Phone",
      h1: ["Phone"],
      schemaTypes: ["Product"],
      language: "en",
      noindex: true,
      canonicalUrl: "https://example.com/en/products/phone/",
      redirects: ["https://example.com/en/products/phone/"],
      templateSignature: "product-detail",
      depth: 3,
    });

    expect(result).toMatchObject({
      finalUrl: "https://example.com/en/products/phone/",
      resourceType: "html",
      pageType: "product",
      language: "en",
      templateFamily: "product-detail",
      depth: 3,
      statusCode: 200,
    });
    expect(result.indexabilitySignals).toEqual(expect.arrayContaining(["meta_noindex", "canonical_present"]));
    expect(result.classificationReasons).toEqual(expect.arrayContaining(["schema:Product"]));
  });
});
