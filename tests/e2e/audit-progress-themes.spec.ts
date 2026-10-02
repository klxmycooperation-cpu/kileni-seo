import { expect, test, type Page } from "@playwright/test";
import { failAuditRecord } from "../../src/db/queries";
import { completeFixtureAudit, createQueuedFixtureAudit } from "./audit-fixture";

type Theme = "light" | "dark" | "signal";

const themes: ReadonlyArray<{
  name: Theme;
  label: string;
  shell: string;
  resultSurface: string;
}> = [
  { name: "light", label: "Светлая", shell: "rgb(247, 248, 251)", resultSurface: "rgb(255, 255, 255)" },
  { name: "dark", label: "Тёмная", shell: "rgb(7, 17, 31)", resultSurface: "rgb(11, 23, 39)" },
  { name: "signal", label: "Сигнальная", shell: "rgb(7, 11, 24)", resultSurface: "rgb(12, 20, 40)" },
] as const;

const auditViewports = [
  { width: 320, height: 720 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1_024 },
  { width: 1_024, height: 768 },
  { width: 1_280, height: 800 },
  { width: 1_440, height: 900 },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

for (const theme of themes) {
  test(`${theme.name}: loading, failed and completed audit states stay themed and mobile-safe`, async ({ page }) => {
    await page.addInitScript((persistedTheme: Theme) => {
      window.localStorage.setItem("kileni:theme:v1", persistedTheme);
    }, theme.name);
    await page.setViewportSize({ width: 390, height: 844 });

    const loading = await createQueuedFixtureAudit();
    const loadingToken = loading.publicToken;
    await page.route(new RegExp(`/api/audits/${loadingToken}/events(?:\\?.*)?$`), async (route) => {
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    });
    await page.route(new RegExp(`/api/audits/${loadingToken}(?:\\?.*)?$`), async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "queued",
          pagesChecked: 0,
          pagesDiscovered: 0,
          pageLimit: 10,
        }),
      });
    });

    await page.goto(`/audit/${loadingToken}`);
    await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme.name);
    await expect(page.locator(".audit-live-overlay")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Подключение" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Ход проверки сайта" })).not.toHaveAttribute("aria-valuenow");
    await expect(page.locator(".audit-live-overlay")).toHaveCSS("background-color", theme.shell);
    await expectNoHorizontalOverflow(page);

    const failed = await createQueuedFixtureAudit();
    await failAuditRecord(failed.id, "Fixture failure");
    await page.goto(`/audit/${failed.publicToken}`);
    await expect(page.getByRole("heading", { name: "Отчёт не удалось подготовить" })).toBeVisible();
    await expect(page.getByText("Это технический сбой и не означает, что с сайтом что-то не так.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Повторить проверку" })).toHaveAttribute("href", `/free-audit?fresh=1&url=${failed.normalizedDomain}`);
    await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme.name);
    await expect(page.locator(".theme-toggle")).toContainText(theme.label);
    await expect(page.locator(".audit-result-shell")).toHaveCSS("background-color", theme.shell);
    await expectNoHorizontalOverflow(page);

    const completed = await createQueuedFixtureAudit();
    await completeFixtureAudit(completed, 0);
    await page.goto(`/audit/${completed.publicToken}`);
    await expect(page.locator(".audit-complete")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme.name);
    await expect(page.locator(".theme-toggle")).toContainText(theme.label);
    await expect(page.locator(".audit-result-shell")).toHaveCSS("background-color", theme.shell);
    await expect(page.locator(".result-body")).toHaveCSS("background-color", theme.resultSurface);
    await expect(page.locator(".final-score")).toHaveCount(0);
    await expect(page.locator(".audit-client-stats").getByText("Подробно проверено страниц", { exact: true })).toBeVisible();
    await expect(page.getByText("/100", { exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 768, height: 1_024 });
    await expect(page.locator(".theme-toggle")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1_440, height: 900 });
    await expectNoHorizontalOverflow(page);
  });
}

test("keeps the audit theme control available on the narrowest supported viewport", async ({ page }) => {
  const completed = await createQueuedFixtureAudit();
  await completeFixtureAudit(completed, 0);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`/audit/${completed.publicToken}`);

  const toggle = page.locator(".audit-result-header .theme-toggle");
  await expect(toggle).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expectNoHorizontalOverflow(page);
});

test("keeps one completed audit readable at every approved size and theme", async ({ page }) => {
  test.setTimeout(90_000);
  const completed = await createQueuedFixtureAudit();
  await completeFixtureAudit(completed, 0);

  for (const theme of themes) {
    await page.goto("/free-audit");
    await page.evaluate((palette) => window.localStorage.setItem("kileni:theme:v1", palette), theme.name);
    for (const viewport of auditViewports) {
      await page.setViewportSize(viewport);
      await page.goto(`/audit/${completed.publicToken}`);
      await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme.name);
      await expect(page.locator(".audit-complete")).toBeVisible();
      await expect(page.locator(".audit-result-header .theme-toggle")).toBeVisible();
      await expect(page.getByRole("link", { name: "Скачать PDF" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  }
});

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}
