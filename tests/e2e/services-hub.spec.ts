import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("uses a click-controlled four-direction explorer with approved copy", async ({ page }) => {
  await page.goto("/services");

  await expect(page.getByRole("heading", { level: 1, name: "От проблемы — к понятному результату" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Выбрать направление" })).toHaveAttribute("href", "#services-directions");
  await expect(page.getByRole("link", { name: "Проверить сайт бесплатно" })).toHaveAttribute("href", "/free-audit");

  const tabs = page.getByRole("tablist", { name: "Направления услуг" });
  await expect(tabs.getByRole("tab")).toHaveCount(4);
  const seoTab = tabs.getByRole("tab", { name: "SEO", exact: true });
  const developmentTab = tabs.getByRole("tab", { name: "Разработка сайтов", exact: true });
  await expect(seoTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Найти, что мешает сайту, исправить и развивать");
  await expect(page.getByRole("tabpanel")).toContainText("8 500 ₽");

  await developmentTab.hover();
  await expect(seoTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Найти, что мешает сайту, исправить и развивать");

  await developmentTab.click();
  await expect(developmentTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/services\?direction=development$/u);
  await expect(page.getByRole("tabpanel")).toContainText("Собрать сайт под задачу бизнеса, а не просто набор страниц");
  await expect(page.getByRole("tabpanel").getByRole("link", { name: "Выбрать формат сайта" })).toHaveAttribute("href", "/web-development");
  await expect(page.locator(".services-explorer__visual")).toHaveAttribute("data-direction", "development");
});

test("keeps the SEO hero focused on the copy without a decorative dashboard", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/seo");

    const lead = page.locator(".seo-hub__hero-side > .seo-hub__lead");
    await expect(lead).toBeVisible();
    await expect(page.getByLabel("Карта проверки и выбора формата SEO")).toHaveCount(0);
    if (viewport.width > 760) {
      const headingBox = await page.locator(".seo-hub__hero h1").boundingBox();
      const side = page.locator(".seo-hub__hero-side");
      const sideBox = await side.boundingBox();
      const rule = side.locator(".seo-hub__hero-rule");
      const ruleBox = await rule.boundingBox();
      const leadBox = await lead.boundingBox();
      expect(headingBox).not.toBeNull();
      expect(sideBox).not.toBeNull();
      expect(ruleBox).not.toBeNull();
      expect(leadBox).not.toBeNull();
      expect(Math.abs(ruleBox!.y - headingBox!.y)).toBeLessThanOrEqual(6);
      expect(Math.abs((ruleBox!.y + ruleBox!.height) - (headingBox!.y + headingBox!.height))).toBeLessThanOrEqual(6);
      expect(leadBox!.y).toBeGreaterThan(headingBox!.y + 60);
      expect(leadBox!.y).toBeLessThan(headingBox!.y + headingBox!.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("places SEO breadcrumbs at the shared public-page position", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/marketplaces");
  const marketplaceBreadcrumbs = await page.getByRole("navigation", { name: "Хлебные крошки" }).locator("ol").boundingBox();

  await page.goto("/seo");
  const seoBreadcrumbs = await page.getByRole("navigation", { name: "Хлебные крошки" }).locator("ol").boundingBox();

  expect(marketplaceBreadcrumbs).not.toBeNull();
  expect(seoBreadcrumbs).not.toBeNull();
  expect(Math.abs(seoBreadcrumbs!.y - marketplaceBreadcrumbs!.y)).toBeLessThanOrEqual(2);
});

test("restores the selected direction from the URL and supports tab keyboard navigation", async ({ page }) => {
  await page.goto("/services?direction=marketplaces");

  const tabs = page.getByRole("tablist", { name: "Направления услуг" });
  const marketplaceTab = tabs.getByRole("tab", { name: "Маркетплейсы", exact: true });
  await expect(marketplaceTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Подготовить карточки под правила конкретной площадки");
  await expect(page.getByRole("tabpanel")).toContainText("2 550 ₽ за артикул");

  await marketplaceTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Нестандартная задача" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Стоимость после короткого брифа");
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { name: "SEO", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "Нестандартная задача" })).toHaveAttribute("aria-selected", "true");
});

test("keeps the active panel concise and exposes the full scope on demand", async ({ page }) => {
  await page.goto("/services?direction=seo");

  const panel = page.getByRole("tabpanel");
  await expect(panel.getByRole("heading", { level: 3, name: "Что делаем" })).toBeVisible();
  await expect(panel.getByRole("heading", { level: 3, name: "Что останется у вас" })).toBeVisible();
  await expect(panel.getByRole("list", { name: "Что делаем" }).getByRole("listitem")).toHaveCount(4);
  await expect(panel.getByRole("list", { name: "Что останется у вас" }).getByRole("listitem")).toHaveCount(4);

  const scope = panel.locator("details").filter({ hasText: "Что входит" });
  await scope.locator("summary").click();
  await expect(panel.locator("details[open] li")).toHaveCount(4);
  await expect(panel.getByRole("link", { name: "Бесплатно проверить до 10 страниц" })).toHaveAttribute("href", "/free-audit");
});

test("fits the complete services hub at every approved mobile width", async ({ page }) => {
  for (const [width, height] of [[320, 720], [360, 800], [390, 844], [430, 932]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/services?direction=marketplaces");

    await expect(page.getByRole("heading", { level: 1, name: "От проблемы — к понятному результату" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Направления услуг" })).toBeVisible();
    await expect(page.getByRole("tabpanel").getByRole("link", { name: "Выбрать площадку" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width}px`).toBe(true);
  }
});

test("shows a static final visual when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services?direction=custom");

  await expect(page.locator(".services-hero__journey")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".services-explorer__visual-variant[data-active='true']")).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".services-explorer__visual-result")).toContainText("Задачу можно оценить и принять");
});

test("shows every SEO visual stage in its final state when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services?direction=seo");

  const stages = page.locator(".services-explorer__visual-variant--seo[data-active='true'] .services-seo__stage");
  await expect(stages).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(stages.nth(index)).toHaveCSS("opacity", "1");
    await expect(stages.nth(index)).toHaveCSS("animation-name", "none");
  }
  await expect(page.locator(".services-explorer__visual-result")).toContainText("Страницы готовы к повторной проверке");
});

test("animates the SEO trajectory as a finite, meaningful process", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/services?direction=seo");

  const trajectory = page.locator(".services-hub__trajectory");
  await expect(trajectory).toHaveAttribute("data-journey-step", "4", { timeout: 5_000 });
  await expect(trajectory).toHaveAttribute("data-journey-state", "verified");
  await expect(trajectory.locator(".services-hero__node[data-stage='Проблема']")).toHaveAttribute("data-node-state", "complete");
  await expect(trajectory.locator(".services-hero__node[data-stage='Проверяемый результат']")).toHaveAttribute("data-node-state", "active");

  await expect.poll(async () => Number.parseFloat(await trajectory.locator(".services-hero__line").evaluate((line) => getComputedStyle(line).strokeDashoffset))).toBeLessThan(0.01);
  await page.screenshot({ path: "test-results/services-semantic-motion/services-desktop-final.png" });
});

test("replays the SEO visual process when returning to the SEO direction", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/services?direction=seo");
  const visual = page.locator(".services-explorer__visual");
  await expect(visual).toHaveAttribute("data-visual-step", "4", { timeout: 5_000 });

  await page.getByRole("tab", { name: "Разработка сайтов", exact: true }).click();
  await expect(visual).toHaveAttribute("data-direction", "development");
  await page.getByRole("tab", { name: "SEO", exact: true }).click();
  await expect(visual).toHaveAttribute("data-visual-step", "4", { timeout: 5_000 });
  await expect(visual).toHaveAttribute("data-visual-state", "verified");
  await expect(visual.locator(".services-seo__stage[data-stage='Проверка страницы']")).toHaveAttribute("data-stage-state", "complete");
  await expect(visual.locator(".services-seo__stage[data-stage='Повторная проверка']")).toHaveAttribute("data-stage-state", "complete");
});

test("shows the complete readable process without motion on a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/services?direction=seo");

  await expect(page.locator(".services-hub__trajectory")).toHaveAttribute("data-journey-step", "4");
  await expect(page.locator(".services-explorer__visual")).toHaveAttribute("data-visual-step", "4");
  await expect(page.locator(".services-explorer__visual-variant--seo[data-active='true'] .services-seo__stage")).toHaveCount(4);
  await expect(page.locator(".services-explorer__visual-variant--seo[data-active='true'] .services-seo__stage").first()).toHaveCSS("animation-name", "none");
  await page.screenshot({ path: "test-results/services-semantic-motion/services-mobile-final.png" });
});

test("explains both service journeys in the final markup", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services?direction=seo");

  await expect(page.locator(".services-hero__journey [data-stage]")).toHaveCount(4);
  await expect(page.locator(".services-hero__journey [data-stage]").allTextContents()).resolves.toEqual([
    "Проблема",
    "Разбор",
    "Решение",
    "Проверяемый результат",
  ]);
  await expect(page.locator(".services-explorer__visual-variant--seo [data-stage]")).toHaveCount(3);
  await expect(page.locator(".services-explorer__visual-variant--seo [data-stage]").allTextContents()).resolves.toEqual([
    "Проверка страницы",
    "Внесённые правки",
    "Повторная проверка",
  ]);
});

test("keeps the first service H1 phrase intact in both locales without overflow", async ({ page }) => {
  for (const path of ["/services", "/en/services"]) {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1_440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(path);

      const groups = await page.locator(".services-hub__hero h1 > .canvas-text > span").evaluateAll((spans) => spans.map((span) => {
        const range = document.createRange();
        range.selectNodeContents(span);
        return { lineWidths: [...range.getClientRects()].map((rect) => rect.width) };
      }));
      const h1Width = await page.locator(".services-hub__hero h1").evaluate((heading) => heading.getBoundingClientRect().width);

      expect(groups).toHaveLength(2);
      expect(groups[0].lineWidths, `${path} ${viewport.width}px first phrase lines`).toHaveLength(1);
      expect(groups.every((group) => group.lineWidths.every((width) => width <= h1Width + 1)), `${path} ${viewport.width}px phrase width`).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} ${viewport.width}px`).toBe(true);
    }
  }
});

test("keeps the direction selector at the beginning of the second viewport", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/services");

    const selectorBox = await page.getByRole("tablist", { name: "Направления услуг" }).boundingBox();
    expect(selectorBox, `${viewport.width}px selector box`).not.toBeNull();
    expect(selectorBox!.y, `${viewport.width}px selector position`).toBeLessThanOrEqual(viewport.height * 1.35);

    const h1Metrics = await page.getByRole("heading", { level: 1 }).evaluate((heading) => {
      const style = getComputedStyle(heading);
      return {
        height: heading.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(style.lineHeight),
      };
    });
    expect(Math.round(h1Metrics.height / h1Metrics.lineHeight), `${viewport.width}px H1 lines`).toBeLessThanOrEqual(5);
  }
});

test("keeps the approved structure and interaction in English", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/en/services");

  await expect(page.getByText("KILENI services", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "From a problem to a clear result" })).toBeVisible();
  await expect(page.getByText("Choose the task. See what we will do, how long it takes, what it costs and what you keep after the work is done.", { exact: true })).toBeVisible();

  const tabs = page.getByRole("tablist", { name: "Service directions" });
  await expect(tabs.getByRole("tab")).toHaveCount(4);
  await expect(tabs.getByRole("tab", { name: "SEO", exact: true })).toHaveAttribute("aria-selected", "true");

  await tabs.getByRole("tab", { name: "Non-standard task" }).click();
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("Define a task that does not fit a ready-made package");
  await expect(panel).toContainText("Price after a short brief");
  await expect(panel.locator("summary")).toHaveText(/What is included/u);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
