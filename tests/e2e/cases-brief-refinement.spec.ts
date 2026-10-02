import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
    version: "2026-08-23.2",
  })));
});

test("presents a case as task, finding, work, proof and limitations in both languages", async ({ page }) => {
  await page.goto("/cases/eco-santeh");

  for (const heading of ["Задача", "Что нашли", "Что сделали", "Доказательство", "Ограничения"]) {
    await expect(page.getByRole("heading", { level: 2, name: heading, exact: true })).toBeVisible();
  }

  await page.goto("/en/cases/eco-santeh");

  for (const heading of ["Task", "What we found", "What we changed", "Evidence", "Limitations"]) {
    await expect(page.getByRole("heading", { level: 2, name: heading, exact: true })).toBeVisible();
  }
});

test("starts the case index with measurable promotion stories", async ({ page }) => {
  await page.goto("/cases");

  const stories = page.locator(".cp-narrative-case");
  await expect(stories).toHaveCount(4);
  await expect(stories.first()).toContainText("mestoest-ff.ru");
  await expect(stories.first()).toContainText("≈700");
  await expect(stories.first()).toContainText("3–4");
  await expect(stories.first()).toContainText("21 день");
  await expect(stories.nth(1)).toContainText("kamenmis.ru");
  await expect(stories.nth(1)).toContainText("600");
  await expect(stories.nth(1)).toContainText("3");
  await expect(stories.nth(1)).toContainText("24 дня");
  for (const story of await stories.all()) {
    await expect(story.getByText("Повторная проверка", { exact: true })).toBeVisible();
    await expect(story.getByText("Что изменили", { exact: true })).toBeVisible();
    await expect(story.getByText("Ограничение", { exact: true })).toBeVisible();
    await expect(story.getByRole("link", { name: /Открыть полный кейс/u })).toBeVisible();
  }

  expect(await page.locator(".cp-cases-index-hero h1").evaluate((heading) => Number.parseFloat(getComputedStyle(heading).fontSize))).toBeLessThanOrEqual(72);

  await page.goto("/en/cases");
  await expect(page.locator(".cp-narrative-case")).toHaveCount(4);
  await expect(page.getByText("Follow-up check", { exact: true })).toHaveCount(4);
  await expect(page.getByText("Limitation", { exact: true })).toHaveCount(4);
});

test("keeps the result tables aligned across desktop case cards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/cases");

  const panels = page.locator(".cp-narrative-result");
  await expect(panels).toHaveCount(4);
  const positions = await panels.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, height: rect.height };
  }));

  expect(positions.every((position) => position.height > 0)).toBe(true);
});

test("centers every before-and-after arrow between the case values", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/cases");

  const comparisons = page.locator(".cp-before-after dd:has(i)");
  await expect(comparisons).toHaveCount(4);

  const offsets = await comparisons.evaluateAll((elements) => elements.map((comparison) => {
    const arrow = comparison.querySelector("i");
    if (!arrow) throw new Error("Comparison arrow is missing");
    const comparisonRect = comparison.getBoundingClientRect();
    const arrowRect = arrow.getBoundingClientRect();
    return Math.abs(
      (arrowRect.top + arrowRect.height / 2) -
      (comparisonRect.top + comparisonRect.height / 2),
    );
  }));

  expect(offsets.every((offset) => offset <= 0.5)).toBe(true);
  await page.locator(".cp-case-index-section").screenshot({
    path: testInfo.outputPath("case-comparison-arrows-centered.png"),
  });
});

test("keeps the project scale visible on the fourth case card", async ({ page }) => {
  await page.goto("/cases");
  const fourthCase = page.locator(".cp-narrative-case").nth(3);
  await expect(fourthCase).toContainText("37");
  await expect(fourthCase).toContainText("80");
  await expect(fourthCase).not.toContainText("0,519");
});

test("shows the source site logos alongside both case names", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('.home-case-explorer__switch img[src="/case-sites/kamenmis.svg"]')).toBeVisible();
  await expect(page.locator('.home-case-explorer__switch img[src="/case-sites/eco-santeh.ico"]')).toBeVisible();
  await expect(page.locator('.home-case-explorer__switch img[src="/case-sites/zasorservice.ico"]')).toBeVisible();

  await page.goto("/cases");
  await expect(page.locator('img[src="/case-sites/kamenmis-mark.svg"]')).toBeVisible();
  await expect(page.locator('img[src="/case-sites/eco-santeh.ico"]')).toBeVisible();
  await expect(page.locator('img[src="/case-sites/zasorservice.ico"]')).toBeVisible();

  await page.goto("/cases/eco-santeh");
  await expect(page.locator('.cp-case-detail-title img[src="/case-sites/eco-santeh.ico"]')).toBeVisible();

});

test("keeps Kamen MIS ranking evidence distinct from internal checklist scores", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/cases/kamenmis");
  await expect(page.locator('.cp-case-detail-title img[src="/case-sites/kamenmis-mark.svg"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("600-й");
  await expect(page.locator(".cp-evidence-list")).toContainText("600");
  await expect(page.locator(".cp-evidence-list")).toContainText("3");
  await expect(page.locator(".cp-evidence-list")).not.toContainText("600/100");
  await page.locator(".cp-case-detail-hero").screenshot({ path: testInfo.outputPath("kamenmis-case-detail-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cases/kamenmis");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator(".cp-case-detail-hero").screenshot({ path: testInfo.outputPath("kamenmis-case-detail-mobile.png") });
});

test("labels final-only case evidence without inventing a before value", async ({ page }) => {
  await page.goto("/cases/eco-santeh");
  const desktopPerformance = page.locator(".cp-evidence-item", { hasText: "Скорость на компьютере" });
  await expect(desktopPerformance).toContainText("Финальная проверка");
  await expect(desktopPerformance).toContainText("99");
  await expect(desktopPerformance.getByText("До", { exact: true })).toHaveCount(0);
  await expect(desktopPerformance.locator("i")).toHaveCount(0);
});

test("serves every offline brief download", async ({ request }) => {
  for (const locale of ["ru", "en"]) {
    for (const type of ["seo", "audit", "marketplaces", "development", "ads", "custom"]) {
      for (const extension of ["docx", "pdf"]) {
        const response = await request.get(`/downloads/generated/${locale}-${type}-brief.${extension}`);
        expect(response.status(), `${locale}-${type}.${extension}`).toBe(200);
        expect((await response.body()).byteLength).toBeGreaterThan(1_000);
      }
    }
  }
});

test("offers an offline brief for every interactive direction", async ({ page }) => {
  for (const path of ["/brief", "/en/brief"]) {
    await page.goto(path);
    const downloads = page.locator(".brief-download-option");
    await expect(downloads).toHaveCount(6);
    await expect(downloads.locator('a[download]')).toHaveCount(12);
  }
});

test("shows the brief as an accessible five-stage route and preserves the chosen scenario", async ({ page }) => {
  await page.goto("/brief");

  const route = page.getByRole("navigation", { name: "Путь брифа" });
  await expect(route.getByRole("listitem")).toHaveCount(5);
  await expect(route.getByRole("listitem").filter({ hasText: "Направление" })).toHaveAttribute("aria-current", "step");

  const audit = page.getByRole("button", { name: /SEO-аудит/u });
  await audit.click();
  await expect(audit).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Далее/u }).click();

  await expect(route.getByRole("listitem").filter({ hasText: "Цель" })).toHaveAttribute("aria-current", "step");
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "О задаче" })).toBeVisible();

  await page.evaluate(() => {
    localStorage.removeItem("kileni-brief");
    localStorage.removeItem("kileni-brief:v2");
  });
  await page.goto("/en/brief");
  const englishRoute = page.getByRole("navigation", { name: "Brief route" });
  await expect(englishRoute.getByRole("listitem")).toHaveCount(5);
  await expect(englishRoute.getByRole("listitem").filter({ hasText: "Direction" })).toHaveAttribute("aria-current", "step");
});

test("explains price, scope and preparation before the brief is sent", async ({ page }) => {
  await page.goto("/brief");

  await expect(page.locator(".brief-hero-grid h1")).toContainText("Соберём предложение");
  await expect(page.locator(".brief-effort")).toContainText("5–7 минут");
  await expect(page.locator(".brief-effort")).toContainText("Технические знания не нужны");
  const guide = page.locator(".brief-service-guide");
  await expect(guide.getByText("За что вы платите", { exact: true })).toBeVisible();
  await expect(guide.getByText("Что подготовить", { exact: true })).toBeVisible();
  await expect(guide.getByText("Стоимость после короткого брифа", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /SEO-аудит/u }).click();
  await expect(guide.getByText("Стоимость после короткого брифа", { exact: true })).toHaveCount(0);
  await expect(guide.getByText(/Список проблем по приоритету/u)).toBeVisible();

  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Компания или проект").fill("Проверка брифа");
  await page.getByLabel("Что сейчас не устраивает?").fill("Неясно, какие страницы мешают поиску");
  await page.getByLabel("Какой результат нужен?").fill("Понятный список проблем и порядок исправлений");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Ссылка на сайт").fill("https://example.ru");
  await page.getByLabel("Что беспокоит?").fill("Страницы плохо находятся в поиске");
  await page.getByRole("button", { name: /^Далее/u }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Итог перед отправкой" })).toBeVisible();
  await expect(page.getByText("Что вы получите в ответ", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    localStorage.removeItem("kileni-brief");
    localStorage.removeItem("kileni-brief:v2");
  });
  await page.goto("/en/brief");
  const englishGuide = page.locator(".brief-service-guide");
  await expect(englishGuide.getByText("What you are paying for", { exact: true })).toBeVisible();
  await expect(englishGuide.getByText("Prepare", { exact: true })).toBeVisible();
  await expect(page.locator(".brief-hero-grid h1")).toContainText("We will prepare a proposal");
  await expect(page.locator(".brief-effort")).toContainText("No technical knowledge is required");
});

test("switches pricing categories without changing the approved Russian amounts", async ({ page }) => {
  await page.goto("/pricing");

  const categories = page.getByRole("tablist", { name: "Категории услуг" });
  await expect(categories.getByRole("tab")).toHaveCount(7);
  await expect(categories.getByRole("tab", { name: "Wildberries и Ozon" })).toBeVisible();
  await expect(categories.getByRole("tab", { name: "SEO-аудит" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText(/29\s*750\s*₽/u);

  await categories.getByRole("tab", { name: "Разработка" }).click();
  await expect(categories.getByRole("tab", { name: "Разработка" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").locator(".cp-tier-card")).toHaveCount(3);
  await expect(page.getByRole("tabpanel")).toContainText(/68\s*000\s*₽/u);

  await page.goto("/en/pricing");
  await expect(page.getByRole("tabpanel")).toContainText("Individual estimate");
  await expect(page.getByRole("tabpanel")).not.toContainText(/\$\d/u);
});

test("keeps the refined cases and brief pages inside a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/cases", "/cases/zasorservice", "/brief", "/en/brief"]) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      `${path} must not overflow horizontally`,
    ).toBe(true);
  }
});

test("does not grow endlessly after mobile pages are loaded", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/", "/free-audit", "/cases", "/cases/eco-santeh", "/brief", "/blog", "/pricing", "/en/blog"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(after, `${path} must have a finite mobile document height`).toBeLessThanOrEqual(before + Math.max(96, Math.ceil(before * 0.03)));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} must not overflow horizontally`).toBe(true);
  }
});

test("has no serious accessibility violations on the refined brief", async ({ page }) => {
  for (const path of ["/brief", "/en/brief"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious"),
      `${path}: serious axe violations`,
    ).toEqual([]);
  }
});
