import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { appendAuditEvent } from "../../src/db/queries";
import { auditClientReportSnapshot } from "../unit/fixtures/audit-client-report-snapshot";
import {
  completeClientReportFixtureAudit,
  completeFixtureAudit,
  createQueuedFixtureAudit,
} from "./audit-fixture";

const evidenceRoot = resolve(
  process.cwd(),
  process.env.QA_EVIDENCE_ROOT ? `${process.env.QA_EVIDENCE_ROOT}/visual-acceptance` : "docs/user-audit-evidence/kileni-full-audit-2026-09-04/visual-acceptance",
);

const viewports = [
  { name: "mobile-320x720", width: 320, height: 720 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-768x1024", width: 768, height: 1_024 },
  { name: "desktop-1440x900", width: 1_440, height: 900 },
] as const;

const themes = ["dark", "light"] as const;

test.use({ video: "on" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test.describe("recorded audit journey", () => {
  test("records the observed five-stage journey and the completed report", async ({ page }) => {
    test.setTimeout(90_000);
    const processDirectory = resolve(evidenceRoot, "process");
    await mkdir(processDirectory, { recursive: true });
    await page.setViewportSize({ width: 1_440, height: 900 });
    await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));

    const audit = await createQueuedFixtureAudit();
    await page.goto(`/audit/${audit.publicToken}`);
    await expect(page.getByRole("heading", { name: "Подключение" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Ход проверки сайта" })).not.toHaveAttribute("aria-valuenow");
    await screenshot(page, resolve(processDirectory, "01-connection-dark-1440x900.png"));

    await page.getByRole("button", { name: "Свернуть" }).click();
    await expect(page.getByRole("button", { name: "Открыть ход проверки" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Проверка продолжается" })).toBeVisible();
    await expect(page.getByText("Откройте ход проверки в правом нижнем углу.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshot(page, resolve(processDirectory, "02-minimized-dark-1440x900.png"));
    await page.getByRole("button", { name: "Открыть ход проверки" }).click();

    const completion = completeFixtureAudit(audit, 900, 850);

    await expect(page.getByRole("heading", { name: "Читаем правила сайта" })).toBeVisible({ timeout: 12_000 });
    await screenshot(page, resolve(processDirectory, "03-rules-map-dark-1440x900.png"));

    await expect(page.getByRole("heading", { name: "Выбираем страницы" })).toBeVisible({ timeout: 12_000 });
    await expect(page.getByText("Берём разные типы страниц", { exact: false })).toBeVisible();
    await screenshot(page, resolve(processDirectory, "04-selection-dark-1440x900.png"));

    await expect(page.getByRole("heading", { name: /Проверяем \d+ из \d+/u })).toBeVisible({ timeout: 12_000 });
    await expect(page.locator(".audit-live__tree-pages li.is-current")).toBeVisible({ timeout: 12_000 });
    await screenshot(page, resolve(processDirectory, "05-checking-dark-1440x900.png"));

    await expect(page.getByRole("heading", { name: "Собираем результат" })).toBeVisible({ timeout: 18_000 });
    await screenshot(page, resolve(processDirectory, "06-report-building-dark-1440x900.png"));

    await completion;
    await expect(page.locator(".audit-live-overlay.is-completing")).toBeVisible({ timeout: 12_000 });
    await screenshot(page, resolve(processDirectory, "07-completion-transition-dark-1440x900.png"));

    await expect(page.locator(".audit-complete--client")).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("heading", { name: /Краткий итог для correct\.test/u })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshot(page, resolve(processDirectory, "08-result-dark-1440x900.png"));

    const pageCards = page.locator(".audit-page-card");
    await expect(pageCards).toHaveCount(2);
    for (let index = 0; index < await pageCards.count(); index += 1) {
      const card = pageCards.nth(index);
      await card.locator("summary").click();
      await expect(card).toHaveAttribute("open", "");
      await expect(card.locator(".audit-page-card__content")).toBeVisible();
      await card.locator("summary").click();
    }

    const copyButton = page.getByRole("button", { name: "Скопировать ссылку" }).first();
    await copyButton.click();
    await expect(page.getByRole("button", { name: "Ссылка скопирована" }).first()).toBeVisible();

    const mainCta = page.getByRole("link", { name: "Заказать технический SEO-аудит" }).first();
    await mainCta.hover();
    await mainCta.focus();
    await expect(mainCta).toBeFocused();
    await screenshot(page, resolve(processDirectory, "09-result-cta-focus-dark-1440x900.png"));

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Скачать PDF" }).first().click();
    const download = await downloadPromise;
    await download.saveAs(resolve(evidenceRoot, "pdf", "browser-downloaded-client-report.pdf"));

    const recordedVideo = page.video();
    await page.close();
    if (recordedVideo) {
      await mkdir(resolve(evidenceRoot, "video"), { recursive: true });
      await recordedVideo.saveAs(resolve(evidenceRoot, "video", "audit-process-full.webm"));
    }
  });
});

test.describe("visual matrices", () => {
  test("captures the report in every approved theme and viewport", async ({ page }) => {
    test.setTimeout(180_000);
    const directory = resolve(evidenceRoot, "report-matrix");
    await mkdir(directory, { recursive: true });
    const audit = await createQueuedFixtureAudit();
    await completeClientReportFixtureAudit(audit);

    for (const theme of themes) {
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/free-audit");
        await page.evaluate((nextTheme) => window.localStorage.setItem("kileni:theme:v1", nextTheme), theme);
        await page.goto(`/audit/${audit.publicToken}`);
        await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme);
        await expect(page.locator(".audit-complete--client")).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await screenshot(page, resolve(directory, `${theme}-${viewport.name}.png`));
      }
    }

    const reportDownloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Скачать PDF" }).first().click();
    const reportDownload = await reportDownloadPromise;
    await reportDownload.saveAs(resolve(evidenceRoot, "pdf", "client-report.pdf"));

    const adminDirectory = resolve(evidenceRoot, "admin");
    await mkdir(adminDirectory, { recursive: true });
    await page.setViewportSize({ width: 1_440, height: 900 });
    await page.goto("/admin/login");
    await page.getByLabel("Логин").fill("e2e-admin");
    await page.getByLabel("Пароль").fill("Kileni-e2e-password");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/admin$/u);
    await page.goto("/admin/audits");
    const exactAuditLink = page.locator(`a[href="/admin/audits/${audit.id}"]`).first();
    await expect(exactAuditLink).toBeVisible();
    await exactAuditLink.click();
    await expect(page).toHaveURL(new RegExp(`/admin/audits/${audit.id}$`, "u"));
    const clientSummary = page.locator('section[aria-labelledby="audit-client-summary-heading"]');
    await expect(clientSummary).toContainText("Предварительно просмотрено адресов100");
    await expect(clientSummary).toContainText("Стоит проверить1");
    await expect(clientSummary).toContainText("Необязательных улучшений0");
    await clientSummary.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -96));
    await screenshot(page, resolve(adminDirectory, "client-summary-1440x900.png"));
  });

  test("captures the fullscreen check in every approved theme and viewport", async ({ page }) => {
    test.setTimeout(120_000);
    const directory = resolve(evidenceRoot, "process-matrix");
    await mkdir(directory, { recursive: true });
    const audit = await createQueuedFixtureAudit();
    const client = auditClientReportSnapshot();
    const selectedPages = client.selectedPages.map(({ url, pageType, selectionReason }) => ({
      url: new URL(new URL(url).pathname, audit.originalUrl).href,
      pageType,
      selectionReason,
    }));
    const checkedUrls = selectedPages.slice(0, 4).map((item) => item.url);
    await appendAuditEvent(audit.id, "crawling_pages", {
      eventKind: "page_started",
      pagesDiscovered: client.inventorySummary.htmlFound,
      pagesEligible: client.inventorySummary.eligibleHtml,
      pagesSelected: selectedPages.length,
      pagesChecked: checkedUrls.length,
      selectedPages,
      checkedUrls,
      failedUrls: [],
      selectionComplete: true,
      currentUrl: selectedPages[4]?.url,
      currentPageType: selectedPages[4]?.pageType,
      technicalFilesChecked: 2,
      robotsStatus: "found",
      sitemapStatus: "found",
    });

    for (const theme of themes) {
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/free-audit");
        await page.evaluate((nextTheme) => window.localStorage.setItem("kileni:theme:v1", nextTheme), theme);
        await page.goto(`/audit/${audit.publicToken}`);
        await expect(page.getByRole("heading", { name: "Проверяем 5 из 10" })).toBeVisible();
        await expect(page.locator(".audit-live-overlay__status > strong")).toHaveText(audit.normalizedDomain);
        await expect(page.locator(".audit-live__tree-root strong")).toHaveText(audit.normalizedDomain);
        await expect(page.getByText("4 из 10", { exact: true })).toBeVisible();
        await expect(page.locator(".audit-live__tree-pages li.is-current")).toHaveCount(1);
        await expect(page.locator(".audit-live__tree-pages li.is-completed")).toHaveCount(4);
        await expectNoHorizontalOverflow(page);
        await expectNoMapElementCollisions(page);
        await screenshot(page, resolve(directory, `${theme}-${viewport.name}.png`));
      }
    }
  });
});

async function screenshot(page: Page, path: string): Promise<void> {
  await page.screenshot({ path, animations: "disabled" });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

async function expectNoMapElementCollisions(page: Page): Promise<void> {
  const collisions = await page.locator(".audit-live__visual").evaluate((canvas) => {
    const elements = [...canvas.querySelectorAll<HTMLElement>(
      ".audit-live__tree-pages li, .audit-live__tree-root",
    )].filter((element) => element.getClientRects().length > 0);
    const overlaps: string[] = [];
    for (let leftIndex = 0; leftIndex < elements.length; leftIndex += 1) {
      const left = elements[leftIndex].getBoundingClientRect();
      for (let rightIndex = leftIndex + 1; rightIndex < elements.length; rightIndex += 1) {
        const right = elements[rightIndex].getBoundingClientRect();
        if (left.left < right.right - 2 && left.right > right.left + 2 &&
            left.top < right.bottom - 2 && left.bottom > right.top + 2) {
          overlaps.push(`${elements[leftIndex].className} <> ${elements[rightIndex].className}`);
        }
      }
    }
    return overlaps;
  });
  expect(collisions).toEqual([]);
}
