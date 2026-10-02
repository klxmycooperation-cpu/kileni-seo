import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const evidenceDir = "test-results/detail-visual-identity";

test.describe("detail visual identity", () => {
  test("keeps the website production board balanced on desktop and mobile", async ({ page }) => {
    await mkdir(evidenceDir, { recursive: true });
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/web-development");
      await expect(page.locator(".svc-build-process__preview")).toBeVisible();
      await expect(page.locator(".svc-build-process__steps")).toBeVisible();
      for (const selector of [".svc-build-process__preview", ".svc-build-process__steps"]) {
        const box = await page.locator(selector).boundingBox();
        expect(box, selector).not.toBeNull();
        expect(box!.x, `${selector} left edge`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${selector} right edge`).toBeLessThanOrEqual(viewport.width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: `${evidenceDir}/web-${viewport.name}.png`, animations: "disabled" });
    }
  });

  test("keeps the custom task decision map distinct and accessible", async ({ page }) => {
    await mkdir(evidenceDir, { recursive: true });
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/custom-task");
      await expect(page.locator(".svc-scope-definition__decision-map")).toBeVisible();
      await expect(page.locator(".svc-scope-definition__list")).toBeVisible();
      await expect(page.getByText(viewport.width === 390 ? "Сейчас" : "Сейчас", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: `${evidenceDir}/custom-${viewport.name}.png`, animations: "disabled" });
    }
  });
});
