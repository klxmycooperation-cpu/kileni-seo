import { expect, test } from "@playwright/test";
import { createQueuedFixtureAudit } from "./audit-fixture";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
    version: "2026-08-23.2",
  })));
});

test("uses the dark hero and leads from the task to proof before prices", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);

  const bodyStyles = await page.locator("body").evaluate((element) => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, color: styles.color, font: styles.fontFamily };
  });
  expect(bodyStyles.background).toBe("rgb(7, 17, 31)");
  expect(bodyStyles.color).toBe("rgb(247, 248, 252)");
  expect(bodyStyles.font).toMatch(/Manrope|Inter/u);

  const hero = page.locator(".signal-hero");
  const heading = hero.getByRole("heading", { level: 1 });
  await expect(heading).toHaveCSS("font-family", /Manrope/u);
  const heroTypography = await heading.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: Number.parseInt(style.fontWeight, 10),
      lineHeight: Number.parseFloat(style.lineHeight),
      height: element.getBoundingClientRect().height,
    };
  });
  expect(heroTypography.fontSize).toBeLessThanOrEqual(88);
  expect(heroTypography.fontWeight).toBeLessThanOrEqual(600);
  expect(heroTypography.height / heroTypography.lineHeight).toBeLessThanOrEqual(3.05);

  const sectionOrder = await page.locator(".home-content > section").evaluateAll((sections) =>
    sections.map((section) => section.className),
  );
  const taskIndex = sectionOrder.findIndex((value) => value.includes("home-entry-route"));
  const processIndex = sectionOrder.findIndex((value) => value.includes("home-process-section"));
  const levelsIndex = sectionOrder.findIndex((value) => value.includes("home-decision"));
  const casesIndex = sectionOrder.findIndex((value) => value.includes("home-case-explorer"));
  const reportIndex = sectionOrder.findIndex((value) => value.includes("home-deliverables"));
  const directionsIndex = sectionOrder.findIndex((value) => value.includes("home-directions"));
  expect(taskIndex).toBeGreaterThanOrEqual(0);
  expect(processIndex).toBeGreaterThan(taskIndex);
  expect(levelsIndex).toBeGreaterThan(processIndex);
  expect(casesIndex).toBeGreaterThan(levelsIndex);
  expect(reportIndex).toBeGreaterThan(casesIndex);
  expect(directionsIndex).toBeGreaterThan(reportIndex);

  const caseExplorer = page.locator(".home-case-explorer");
  await caseExplorer.scrollIntoViewIfNeeded();
  await expect(caseExplorer.locator('[role="tab"]')).toHaveCount(2);
  await expect(caseExplorer.locator(".home-case-explorer__surface")).toContainText("Задача");
  await expect(caseExplorer.locator(".home-case-explorer__surface")).toContainText("509 / 509");
  await expect(caseExplorer.locator(".home-case-explorer__identity img")).toBeVisible();
  await expect(page.locator(".home-deliverables")).toContainText("Как замечание превращается в проверенное исправление");
  await expect(page.locator(".home-deliverables")).toContainText("Показываем директиву noindex и адрес страницы");
});

test("uses the site palette and the approved typographic first-visit brand reveal", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const intro = page.locator(".brand-intro");
  await expect(intro).toBeVisible();
  await expect.poll(async () => intro.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("rgb(247, 248, 250)");
  await expect(intro).toHaveCSS("color", "rgb(10, 16, 32)");
  await expect(intro.locator(".brand-intro-v9__kil")).toHaveText("KIL");
  await expect(intro.locator(".brand-intro-v9__ni")).toHaveText("NI");
  await expect(intro.locator(".brand-intro-v9__e")).toHaveText("E");
  await expect(intro.locator(".brand-intro-v9__s")).toHaveText("S");
  await expect(intro.locator(".brand-intro-v9__o")).toHaveText("O");
});

test("keeps the scope and request sections on the pricing page compact and readable", async ({ page }) => {
  await page.goto("/pricing");

  const exclusions = page.locator(".cp-extras-section");
  await expect(exclusions).toHaveCSS("background-color", "rgb(237, 241, 247)");
  await expect(exclusions.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(exclusions.locator("li")).toHaveCount(4);

  const request = page.locator(".cp-request-section");
  await expect(request).toHaveCSS("background-color", "rgb(237, 241, 247)");
});

test("shows a staged, accessible audit scan without changing the brand intro", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await page.route(`**/api/audits/${audit.publicToken}/events`, async (route) => {
    await route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
  });
  await page.route(`**/api/audits/${audit.publicToken}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "crawling_pages",
        pagesChecked: 4,
        pagesDiscovered: 10,
        pageLimit: 10,
        normalizedDomain: "example.ru",
      }),
    });
  });

  await page.goto(`/audit/${audit.publicToken}`);

  await expect(page.getByRole("progressbar", { name: "Ход проверки сайта" })).not.toHaveAttribute("aria-valuenow");
  await expect(page.getByText("Выбрано", { exact: true })).toBeVisible();
  await expect(page.getByText("Ещё не выбраны.")).toBeVisible();
  await expect(page.locator(".audit-live__activity")).toContainText("Берём разные типы страниц");
  await expect(page.locator(".audit-live__stages li")).toHaveCount(5);
  await expect(page.locator(".audit-live__stages li[aria-current='step']")).toContainText("Выбор страниц");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".audit-live__progress > span")).toHaveCSS("animation-name", "none");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
