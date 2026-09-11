import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { appendAuditEvent } from "../../src/db/queries";
import { createQueuedFixtureAudit } from "./audit-fixture";

for (const theme of ["dark", "signal", "light"]) {
  test(`${theme}: audit stages sit below the full-width animation`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.addInitScript(theme => {
      localStorage.setItem("kileni:theme:v1", theme);
      sessionStorage.setItem("kileni:intro:v9", "1");
    }, theme);
    const audit = await createQueuedFixtureAudit();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const evidence = "work/browser-qa/audit-stages-below";
    await mkdir(evidence, { recursive: true });
    const sample = {
      pagesDiscovered: 2, pagesSelected: 2, pagesChecked: 1,
      selectedPages: [
        { url: "https://correct.test/", pageType: "homepage", selectionReason: "homepage" },
        { url: "https://correct.test/services", pageType: "service", selectionReason: "primary_commercial" },
      ],
      currentUrl: "https://correct.test/services", currentPageType: "service",
    };
    const snapshots = [
      { status: "connecting", key: "connection", payload: {} },
      { status: "checking_robots", key: "rules", payload: { robotsStatus: "found" } },
      { status: "crawling_pages", key: "selection", payload: { ...sample, selectionComplete: false } },
      { status: "crawling_pages", key: "check", payload: { ...sample, selectionComplete: true, eventKind: "page_started" } },
      { status: "finalizing_report", key: "report", payload: { ...sample, selectionComplete: true } },
    ] as const;
    // Keep the page mounted: stages must update through the real progress stream.
    // Repeated navigation would cancel unrelated Next.js prefetch requests.
    await page.goto(`/audit/${audit.publicToken}`);
    for (const snapshot of snapshots) {
      await appendAuditEvent(audit.id, snapshot.status, snapshot.payload);
      for (const [width, height] of [[1787, 1318], [1440, 900], [390, 844], [320, 720]]) {
        await page.setViewportSize({ width, height });
        await expect(page.locator(".audit-live")).toHaveAttribute("data-stage", snapshot.key);
        const layout = await page.locator(".audit-live").evaluate(article => {
          const visual = article.querySelector(".audit-live__visual")!;
          const timeline = article.querySelector(".audit-live__timeline-wrap")!;
          const a = article.getBoundingClientRect(), v = visual.getBoundingClientRect(), t = timeline.getBoundingClientRect();
          return {
            left: v.left - a.left,
            width: v.width - a.width,
            visualBottom: v.bottom,
            stagesTop: t.top,
            stagesGap: t.top - v.bottom,
            visualOverflow: visual.scrollWidth - visual.clientWidth,
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        expect(layout.stagesTop).toBeGreaterThanOrEqual(layout.visualBottom);
        expect(layout.stagesGap).toBeLessThanOrEqual(32);
        expect(Math.abs(layout.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(layout.width)).toBeLessThanOrEqual(1);
        expect(layout.visualOverflow).toBeLessThanOrEqual(1);
        expect(layout.overflow).toBeLessThanOrEqual(1);
        await page.screenshot({ path: `${evidence}/${testInfo.project.name}-${theme}-${snapshot.key}-${width}.png`, animations: "disabled" });
      }
    }
    await page.getByRole("button", { name: "Свернуть" }).click();
    await expect(page.locator(".audit-live-overlay")).toHaveCount(0);
    await page.getByRole("button", { name: "Открыть ход проверки" }).click();
    await expect(page.locator(".audit-live__visual")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
