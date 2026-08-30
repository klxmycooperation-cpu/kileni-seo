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

    const loadingToken = `loading-${theme.name}`;
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
    await expect(page.locator(".audit-loading")).toBeVisible();
    await expect(page.locator(".theme-toggle")).toContainText(theme.label);
    await expect(page.locator(".audit-result-shell")).toHaveCSS("background-color", theme.shell);
    await expectNoHorizontalOverflow(page);

    const failed = await createQueuedFixtureAudit();
    await failAuditRecord(failed.id, "Fixture failure");
    await page.goto(`/audit/${failed.publicToken}`);
    await expect(page.getByRole("heading", { name: "Проверку не удалось завершить" })).toBeVisible();
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
    await expect(page.locator(".final-score strong")).toHaveText("100");
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1_440, height: 900 });
    await expectNoHorizontalOverflow(page);
  });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}
