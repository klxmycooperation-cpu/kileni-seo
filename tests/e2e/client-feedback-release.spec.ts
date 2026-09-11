import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.localStorage.setItem("kileni:theme:v1", "dark");
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("keeps the complete mobile hero above the next section", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 912 });
  await page.goto("/");

  const hero = await page.locator(".signal-hero").boundingBox();
  const auditTool = await page.locator(".signal-hero .hero-tool").boundingBox();
  const nextSection = await page.locator(".home-mobile-section-nav").boundingBox();
  expect(hero).not.toBeNull();
  expect(auditTool).not.toBeNull();
  expect(nextSection).not.toBeNull();
  expect(hero!.y + hero!.height).toBeGreaterThanOrEqual(911);
  expect(auditTool!.y).toBeGreaterThanOrEqual(912);
  expect(nextSection!.y).toBeGreaterThanOrEqual(912);
  await expect(page.locator(".hero-title-lock")).toHaveText("Сайт есть.");
  await expectNoHorizontalOverflow(page);
});

test("uses a plain-language name for the third theme", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 912 });
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.getByRole("button", { name: "Включить контрастную тему" }).click();

  await expect(page.locator(".mobile-menu .theme-toggle__label")).toHaveText("Контрастная");
  await expect(page.locator(".mobile-menu")).not.toContainText("Сигнальная");
});

test("keeps the mobile hero stable on a short landscape viewport", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("presents the verified-fix story as a balanced visual board", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  const board = page.locator(".home-fix-board");
  await expect(board).toContainText("Индексация страницы");
  await expect(board).toContainText("Директива noindex удалена");
  await expect(board.locator(".home-fix-flow > li")).toHaveCount(4);
  await expect(board.locator(".home-fix-comparison")).toContainText("До исправления");
  await expect(board.locator(".home-fix-comparison")).toContainText("После согласования");
  await expect(board).toContainText("Пример исправления");

  const positions = await board.locator(".home-fix-flow > li").evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { left: Math.round(box.left), top: Math.round(box.top), fontSize: Number.parseFloat(getComputedStyle(element.querySelector("small")!).fontSize) };
    }),
  );
  expect(new Set(positions.map(({ left }) => left)).size).toBe(2);
  expect(new Set(positions.map(({ top }) => top)).size).toBe(2);
  expect(positions.every(({ fontSize }) => fontSize >= 14)).toBe(true);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  const boardWidth = await board.evaluate((element) => element.getBoundingClientRect().width);
  const cardWidths = await board.locator(".home-fix-flow > li").evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().width),
  );
  expect(cardWidths.every((width) => width <= boardWidth)).toBe(true);
  await expectNoHorizontalOverflow(page);
});

test("starts the hero on its own line and enlarges supporting text", async ({ page }) => {
  await page.setViewportSize({ width: 1787, height: 1320 });
  await page.goto("/");
  await expect(page.locator(".hero-title-lock")).toHaveCSS("display", "block");
  const sizes = await page.locator(".hero-copy .eyebrow, .hero-honesty, .hero-microcopy, .hero-free-audit-usage, .hero-check-link small").evaluateAll(elements => elements.map(e => parseFloat(getComputedStyle(e).fontSize)));
  expect(sizes.every(size => size >= 14)).toBe(true);
  await expectNoHorizontalOverflow(page);
});

test("keeps the final home CTA on one line on desktop without mobile overflow", async ({ page }) => {
  await page.goto("/");
  for (const width of [1787, 1440, 1200]) {
    await page.setViewportSize({ width, height: 1000 });
    const heading = page.locator(".warm-final-cta h2");
    const size = await heading.evaluate(e => ({ height: e.getBoundingClientRect().height, line: parseFloat(getComputedStyle(e).lineHeight), scroll: e.scrollWidth, width: e.clientWidth }));
    expect(size.height).toBeLessThanOrEqual(size.line + 1);
    expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
    await expectNoHorizontalOverflow(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
});

test("decorates the SEO hero without changing its copy", async ({ page }) => {
  for (const locale of ["ru", "en"]) {
    await page.goto(locale === "ru" ? "/seo" : "/en/seo");
    const hero = page.locator(".seo-hub__hero");
    await expect(hero.locator("h1")).toHaveText(locale === "ru" ? "SEO-аудит или продвижение — выберите нужный следующий шаг" : "SEO audit or ongoing growth — choose the right next step");
    await expect(hero.locator(".seo-hub__lead")).toHaveText(locale === "ru" ? "Аудит отвечает, что мешает сайту и что исправить. Продвижение — это регулярные исправления и новые страницы после проверки." : "An audit explains what blocks the website and what to fix. Ongoing growth covers regular fixes and new pages after the review.");
    await expect(hero.locator(".services-hub__eyebrow")).toHaveText(locale === "ru" ? "Два формата SEO" : "Two SEO formats");
    await expect(hero.locator(".seo-hub__visual")).toHaveAttribute("aria-hidden", "true");
    for (const width of [1787, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await expectNoHorizontalOverflow(page);
    }
  }
});

test("aligns marketplace offer titles, prices, facts and actions", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 1_000 });

  for (const platform of ["wildberries", "ozon"] as const) {
    await page.goto(`/marketplaces/${platform}#marketplace-offers`);
    await expect(page.locator("main")).not.toContainText(/это пример|не реальный результат|не вымышленный кейс/iu);
    for (const selector of [".marketplace-offer h3", ".marketplace-offer-price", ".marketplace-offer dl", ".marketplace-offer-actions"]) {
      const tops = await page.locator(selector).evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
      expect(new Set(tops).size, `${platform}: ${selector}`).toBe(1);
    }
    await expectNoHorizontalOverflow(page);
  }
});

test("uses readable, factual copy on the dark development page", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/web-development");

  await expect(page.getByRole("heading", { level: 1, name: "Разработаем сайт под задачу бизнеса" })).toBeVisible();
  await expect(page.getByText("Спроектируем и сделаем сайт, готовый к рекламе и поиску", { exact: true })).toHaveCount(0);
  await expect(page.getByText("При разработке заранее учитываем удобство на телефоне, формы, аналитику, базовую SEO-подготовку и дальнейшее обновление сайта.", { exact: true })).toBeVisible();
  for (const selector of [".svc-detail-copy > p", ".svc-visual-deliverables li", ".svc-visual-note"]) {
    const sizes = await page.locator(selector).evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
    expect(sizes.every((size) => size >= 14), selector).toBe(true);
  }
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("web-development-desktop.png"), animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/web-development");
  await expect(page.getByRole("heading", { level: 1, name: "Разработаем сайт под задачу бизнеса" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("web-development-mobile.png"), animations: "disabled" });
});

test("shows the custom 404 page with working recovery links", async ({ page }) => {
  const response = await page.goto("/qa-unknown-page-404");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(page.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Посмотреть услуги" })).toHaveAttribute("href", "/services");
  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
