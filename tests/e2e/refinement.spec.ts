import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
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
  await expect(caseExplorer.locator('[role="tab"]')).toHaveCount(2);
  await expect(caseExplorer.locator(".home-case-explorer__surface")).toContainText("Задача");
  await expect(caseExplorer.locator(".home-case-explorer__surface")).toContainText("509 / 509");
  await expect(caseExplorer.locator(".home-case-explorer__identity img")).toBeVisible();
  await expect(page.locator(".home-deliverables")).toContainText("Причина, приоритет, действие");
});

test("uses the site palette and the approved typographic first-visit brand reveal", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v3"));
  await page.reload({ waitUntil: "domcontentloaded" });

  const intro = page.locator(".brand-intro");
  await expect(intro).toBeVisible();
  await expect(intro).toHaveCSS("background-color", "rgb(247, 248, 251)");
  await expect(intro).toHaveCSS("color", "rgb(11, 19, 43)");
  await expect(intro.locator(".brand-intro__split")).toContainText("KILENI");
  await expect(intro.locator(".brand-intro__seo")).toHaveText("SEO");

  const animationEnd = await page.evaluate(() => {
    const elements = [
      document.querySelector(".brand-intro"),
      document.querySelector(".site-header--home"),
      document.querySelector(".signal-hero .hero-grid"),
    ].filter((element): element is Element => element instanceof Element);
    return Math.max(...elements.flatMap((element) => element.getAnimations({ subtree: true })
      .map((animation) => Number(animation.effect?.getComputedTiming().endTime ?? 0))
      .filter(Number.isFinite)));
  });
  expect(animationEnd).toBe(4_400);
});

test("shows a staged, accessible audit scan without changing the brand intro", async ({ page }) => {
  await page.route("**/api/audits/demo/events", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
  });
  await page.route("**/api/audits/demo", async (route) => {
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

  await page.goto("/audit/demo");

  await expect(page.getByRole("progressbar", { name: "Ход проверки сайта" })).toHaveAttribute("aria-valuenow", "43");
  await expect(page.getByText("Проверено страниц")).toBeVisible();
  await expect(page.getByText("4 / 10")).toBeVisible();
  await expect(page.locator(".audit-live__activity")).toContainText("Проверяем найденные страницы");
  await expect(page.locator(".audit-live__stage")).toHaveCount(7);
  await expect(page.locator(".audit-live__stage[aria-current='step']")).toContainText("Проверка страниц");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".audit-live__activity span")).toHaveCSS("animation-name", "none");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
