import { expect, test, type Page } from "@playwright/test";

import {
  completeAuditRecord,
  createAuditRecord,
  type AuditRow,
} from "../../src/db/queries";
import {
  finalizeAuditResultV4,
  runPublicAudit,
} from "../../src/lib/audit";
import {
  completePerformance,
  createFixtureFetcher,
  type AuditSiteFixture,
} from "../fixtures/audit-sites";

const boundaryPaths = [
  "/",
  "/seo-audit",
  "/web-development",
  "/pricing",
  "/services",
  "/marketplaces/ozon",
  "/cases/example",
  "/blog/example",
  "/calculator",
  "/en",
  "/glossary",
  "/contacts",
  "/about",
  "/custom-task",
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

for (const pagesDiscovered of [1, 4, 10, 14] as const) {
  test(`renders exact public coverage for a fixture with ${pagesDiscovered} discovered URL${pagesDiscovered === 1 ? "" : "s"}`, async ({ page }) => {
    const scenario = await createBoundaryAudit(pagesDiscovered, `boundary-${pagesDiscovered}`);
    await completeBoundaryAudit(scenario.audit, scenario.fixture);

    await page.goto(`/audit/${scenario.audit.publicToken}`);

    const pagesSelected = Math.min(pagesDiscovered, 10);
    await expect(page.locator(".audit-complete")).toBeVisible();
    await expect(page.locator(".final-score")).toHaveCount(0);
    await expect(page.getByText("/100", { exact: true })).toHaveCount(0);
    await expectCoverageMetric(page, "Найдено HTML-страниц", pagesDiscovered);
    await expectCoverageMetric(page, "Подходят для выборки", pagesDiscovered);
    await expectCoverageMetric(page, "Подробно проверено страниц", pagesSelected);
    await expectCoverageMetric(page, "Не вошло в выборку", Math.max(0, pagesDiscovered - 10));
    await expectCoverageMetric(page, "Исключено до выборки", 0);
    await expect(page.locator(".partial-badge")).toHaveCount(0);
    await expect(page.getByRole("heading", {
      level: 1,
      name: `Краткий итог для ${scenario.audit.normalizedDomain}`,
    })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: `${Math.max(0, pagesDiscovered - 10)} страниц не вошли в бесплатную выборку`,
    })).toBeVisible();
  });
}

test("resumes a live audit after reload and completes through the polling fallback when SSE disconnects", async ({ page }) => {
  const scenario = await createBoundaryAudit(4, "resume-4");
  let eventAttempts = 0;
  await page.route(new RegExp(`/api/audits/${scenario.audit.publicToken}/events(?:\\?.*)?$`), async (route) => {
    eventAttempts += 1;
    await route.abort("connectionfailed");
  });

  await page.goto(`/audit/${scenario.audit.publicToken}`);
  await expect(page.getByRole("heading", { name: "Подключение" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Подключение" })).toBeVisible();
  await expect.poll(() => eventAttempts).toBeGreaterThanOrEqual(2);

  await completeBoundaryAudit(scenario.audit, scenario.fixture);

  await expect(page.locator(".audit-complete")).toBeVisible({ timeout: 12_000 });
  await expectCoverageMetric(page, "Найдено HTML-страниц", 4);
  await expectCoverageMetric(page, "Подходят для выборки", 4);
  await expectCoverageMetric(page, "Подробно проверено страниц", 4);
  await expect(page.locator(".partial-badge")).toHaveCount(0);
});

test("returns home after viewing a completed audit without reopening the report", async ({ page }) => {
  const scenario = await createBoundaryAudit(1, "return-home");
  await completeBoundaryAudit(scenario.audit, scenario.fixture);
  await page.addInitScript(({ token, domain }) => {
    sessionStorage.setItem("kileni:intro:welcome:v1", "1");
    if (location.pathname === `/audit/${token}`) {
      sessionStorage.setItem("kileni:active-audit:v1", JSON.stringify({ token, domain, locale: "ru", status: "queued" }));
    }
  }, { token: scenario.audit.publicToken, domain: scenario.audit.normalizedDomain });
  await page.goto(`/audit/${scenario.audit.publicToken}`);
  await expect(page.locator(".audit-complete")).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("kileni:active-audit:v1"))).toBeNull();
  await page.getByRole("link", { name: "KILENI seo — главная", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.locator(".hero h1")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("home-after-audit.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".hero h1")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("home-after-audit-mobile.png") });
});

async function createBoundaryAudit(pageCount: number, fixtureId: string): Promise<{
  audit: AuditRow;
  fixture: AuditSiteFixture;
}> {
  const host = `${fixtureId}.test`;
  const audit = await createAuditRecord({
    originalUrl: `https://${host}/`,
    normalizedDomain: host,
    locale: "ru",
    name: "QA fixture",
    contact: "",
    contactType: "none",
    ipHash: `playwright-${fixtureId}-ip`,
    userAgentHash: `playwright-${fixtureId}-ua`,
    source: "playwright",
    pageLimit: 10,
    consentVersion: "2026-08-30",
    qaLabel: `Playwright · ${pageCount} URL`,
  });
  return { audit, fixture: boundaryFixture(host, pageCount) };
}

async function completeBoundaryAudit(audit: AuditRow, fixture: AuditSiteFixture): Promise<void> {
  const result = await runPublicAudit(fixture.target, {
    fetcher: createFixtureFetcher(fixture),
    performance: completePerformance,
  });
  const finalized = finalizeAuditResultV4({
    auditId: audit.publicToken,
    createdAt: new Date(audit.createdAt).toISOString(),
    result,
    performance: completePerformance,
  });

  await completeAuditRecord(audit.id, {
    publicResult: finalized.publicResult as unknown as Record<string, unknown>,
    fullResult: finalized.fullResult as unknown as Record<string, unknown>,
    score: null,
    grade: null,
    partial: finalized.partial,
    pagesDiscovered: finalized.publicResult.pagesDiscovered,
    pagesChecked: finalized.publicResult.pagesChecked,
  });
}

function boundaryFixture(host: string, pageCount: number): AuditSiteFixture {
  const paths = boundaryPaths.slice(0, pageCount);
  const documents: Record<string, { text: string; contentType?: string }> = {
    [`https://${host}/robots.txt`]: {
      text: `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml`,
      contentType: "text/plain; charset=utf-8",
    },
    [`https://${host}/sitemap.xml`]: {
      text: `<urlset>${paths.map((path) => `<url><loc>https://${host}${path}</loc></url>`).join("")}</urlset>`,
      contentType: "application/xml",
    },
  };
  for (const path of paths) {
    const url = `https://${host}${path}`;
    documents[url] = { text: fixtureHtml(url, path, paths) };
  }
  return { target: `https://${host}/`, documents };
}

function fixtureHtml(url: string, path: string, paths: readonly string[]): string {
  const language = path === "/en" ? "en" : "ru";
  const title = path === "/" ? "Главная страница проверяемого сайта" : `Проверяемая страница ${path}`;
  const links = path === "/"
    ? paths.slice(1).map((href) => `<a href="${href}">Открыть раздел</a>`).join("")
    : '<a href="/">На главную</a>';
  return `<!doctype html><html lang="${language}"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="Подробное описание страницы для воспроизводимой браузерной проверки границ бесплатного SEO-аудита.">
    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${title}"><meta property="og:description" content="Описание страницы">
    <meta property="og:image" content="https://${new URL(url).hostname}/og.jpg"><meta property="og:url" content="${url}">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
    </head><body><h1>${title}</h1><h2>Содержание</h2>
    <p>${"Проверяемая страница содержит полезное описание услуги, результата, этапов, ограничений и следующего шага для посетителя. ".repeat(15)}</p>
    ${links}<img src="/image.jpg" alt="Иллюстрация страницы" width="640" height="360"></body></html>`;
}

async function expectCoverageMetric(page: Page, label: string, value: number): Promise<void> {
  const metric = page.locator(".audit-client-stats > div").filter({ hasText: label });
  await expect(metric.locator("dd"), `${label} must equal ${value}`).toHaveText(String(value));
}
