import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
    version: "2026-08-23.2",
  })));
});

test("presents the approved home-page story in a deliberate order", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
  await expect(page.locator(".signal-hero .hero-copy")).toBeVisible();
  await expect(page.locator(".signal-hero .hero-grid")).not.toHaveClass(/hero-grid--tool-only/);
  await expect(page.locator(".signal-hero .hero-copy > .eyebrow")).toHaveCount(0);
  await expect(page.locator(".signal-hero .hero-lead")).toHaveText("Проверим сайт и простыми словами покажем, что мешает ему появляться в поиске и что исправить в первую очередь.");
  await expect(page.locator(".signal-hero .hero-offer")).toHaveText("Бесплатная SEO-проверка до 10 страниц");
  await expect(page.getByText("Сначала факты. Потом разговор о продвижении.", { exact: true })).toHaveCount(0);
  const heroCopyOrder = await page.locator(".signal-hero .hero-copy").evaluate((element) => (
    Array.from(element.children).map((child) => child.className)
  ));
  expect(heroCopyOrder.indexOf("hero-lead")).toBeLessThan(heroCopyOrder.indexOf("hero-offer"));
  await expect(page.getByText("Обычно 1–3 минуты. Результат покажет конкретные замечания по проверенным страницам и откроется сразу на сайте.", { exact: true })).toBeVisible();
  await expect(page.locator(".signal-hero .hero-copy").getByText(/Обычно 3–7 минут/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /посмотреть реальные результаты/i })).toBeVisible();
  await expect(page.getByTestId("hero-search-visibility")).toBeVisible();
  await expect(page.locator(".hero-audit-visual")).toHaveAttribute("aria-label", "Поисковая видимость");
  const dashboard = page.getByTestId("hero-search-visibility");
  for (const detail of ["целевой диапазон", "структура", "контент", "Целевые переходы", "Переходы из поиска", "Доступны поиску", "Ошибки сайта"]) {
    await expect(dashboard.getByText(detail, { exact: true }).first()).toBeVisible();
  }
  for (const status of ["Показы ↑", "Переходы ↑", "Ошибки ↓"]) {
    await expect(page.getByText(status, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Повторить анимацию" })).toHaveCount(0);

  const order = await page.locator("#main-content section[id]").evaluateAll((sections) => sections.map((section) => section.id));
  expect(order).toEqual(expect.arrayContaining([
    "home-tasks",
    "home-process",
    "home-levels",
    "home-cases",
    "home-deliverables",
    "home-directions",
    "home-articles",
  ]));
  expect(order.indexOf("home-tasks")).toBeLessThan(order.indexOf("home-process"));
  expect(order.indexOf("home-process")).toBeLessThan(order.indexOf("home-levels"));
  expect(order.indexOf("home-levels")).toBeLessThan(order.indexOf("home-cases"));
  expect(order.indexOf("home-cases")).toBeLessThan(order.indexOf("home-articles"));
  expect(order.indexOf("home-articles")).toBeLessThan(order.indexOf("home-deliverables"));
  expect(order.indexOf("home-deliverables")).toBeLessThan(order.indexOf("home-directions"));

  await expect(page.locator(".home-process-chapters li")).toHaveCount(4);
  await expect(page.getByRole("heading", { level: 2, name: "От бесплатной проверки до контрольного результата" })).toBeVisible();
  await expect(page.locator(".home-process-story__result")).toContainText("Видим, что мешает сайту появляться в поиске");
  await expect(page.locator(".home-process-chapters h3")).toContainText(["Проверяем", "Объясняем", "Исправляем", "Перепроверяем"]);
  await expect(page.locator(".home-decision__tab")).toHaveCount(3);
  await expect(page.locator(".home-service-list")).toHaveCount(0);
});

test("places the audit tool alongside the restored hero copy", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/");

  const geometry = await page.locator(".signal-hero .hero-tool").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const copy = document.querySelector<HTMLElement>(".signal-hero .hero-copy");
    if (!copy) throw new Error("Hero copy is missing");
    const copyRect = copy.getBoundingClientRect();
    const heading = document.querySelector<HTMLElement>(".signal-hero .hero-copy h1");
    const highlight = element.querySelector<HTMLElement>(".hero-audit-highlight");
    const surface = element.querySelector<HTMLElement>(".hero-audit-surface");
    if (!heading || !highlight || !surface) throw new Error("Hero dashboard surface is missing");
    const headingRect = heading.getBoundingClientRect();
    const highlightRect = highlight.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    return {
      toolStartsAfterCopy: rect.left > copyRect.right,
      toolWidth: rect.width,
      emptyDashboardSpace: highlightRect.height - surfaceRect.height,
      headingTopDelta: Math.abs(headingRect.top - surfaceRect.top),
    };
  });
  expect(geometry.toolStartsAfterCopy).toBe(true);
  expect(geometry.toolWidth).toBeGreaterThan(500);
  expect(geometry.emptyDashboardSpace).toBeLessThanOrEqual(8);
  expect(geometry.headingTopDelta).toBeLessThanOrEqual(4);
});

test("shows Kamen MIS second in the home case carousel with the reported position change", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForTimeout(500);

  const section = page.locator("#home-cases");
  await expect(section).toBeAttached();
  await section.scrollIntoViewIfNeeded();
  const tabs = section.getByRole("tab");
  await expect(tabs).toHaveCount(4);
  await expect(section.getByRole("tablist", { name: "Лента кейсов" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Предыдущий кейс" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Следующий кейс" })).toBeVisible();
  await expect(tabs.first()).toContainText("mestoest-ff.ru");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

  const panel = section.getByRole("tabpanel");
  await expect(panel).toHaveAttribute("data-case", "mestoest-ff");
  await expect(panel.locator(".home-case-explorer__identity h3")).toHaveCount(0);
  await expect(panel.locator(".home-case-explorer__identity p")).toHaveCount(0);
  await expect(panel).toContainText("≈700");
  await expect(panel).toContainText("3–4");
  await expect(panel).toContainText("21 день");
  await expect(panel).toContainText("По данным проекта");
  await expect(panel.locator(".home-case-explorer__results > div")).toHaveCount(4);
  await expect(panel.locator(".home-case-explorer__identity > img")).toHaveAttribute("src", /mestoest-ff\.png/);
  await expect(panel.locator(".home-case-explorer__chart-marker")).toHaveCount(6);
  await expect(panel.locator(".home-case-explorer__chart-marker").first()).toContainText("≈700");
  await expect(panel.locator(".home-case-explorer__chart-marker").last()).toContainText("3–4");

  await section.getByRole("button", { name: "Следующий кейс" }).click();
  await expect(panel).toHaveAttribute("data-case", "kamenmis");
  await expect(tabs.nth(1)).toContainText("kamenmis.ru");
  await expect(panel).toContainText("600");
  await expect(panel).toContainText("3");
  await expect(panel).toContainText("24 дня");
  await expect(panel.locator('.home-case-explorer__identity > img')).toHaveAttribute("src", /kamenmis\.svg/);
  await panel.screenshot({ path: testInfo.outputPath("kamenmis-case-desktop.png") });

  await tabs.first().click();
  await expect(panel).toHaveAttribute("data-case", "mestoest-ff");

  await section.screenshot({ path: testInfo.outputPath("mestoest-case-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(500);
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('[data-mobile-case-controls]')).toBeVisible();
  await expect(panel).toHaveAttribute("data-case", "mestoest-ff");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await panel.screenshot({ path: testInfo.outputPath("mestoest-case-mobile.png") });
});

test("keeps the new hero readable and finite at mobile widths", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
  expect(layout.height).toBeLessThan(40_000);
  await expect(page.locator(".hero-audit-visual")).toBeVisible();
  await expect(page.getByLabel("Адрес сайта")).toBeVisible();
  await expect(page.getByLabel("Ваше имя")).toHaveCount(0);
});

test("uses rounded, separated surfaces for the primary home interfaces", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const geometry = await page.evaluate(() => {
    const radius = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
    };
    const decisionTabs = document.querySelector<HTMLElement>(".home-decision__tabs");
    if (!decisionTabs) throw new Error("Missing decision tabs");
    return {
      visualRadius: radius(".hero-audit-surface .hero-audit-visual"),
      formRadius: radius(".hero-audit-surface .audit-form"),
      decisionGap: Number.parseFloat(getComputedStyle(decisionTabs).columnGap),
      tabRadius: radius(".home-decision__tab"),
    };
  });

  expect(geometry.visualRadius).toBeGreaterThanOrEqual(16);
  expect(geometry.formRadius).toBeGreaterThanOrEqual(16);
  expect(geometry.decisionGap).toBeGreaterThanOrEqual(8);
  expect(geometry.tabRadius).toBeGreaterThanOrEqual(14);

  await page.locator(".signal-hero .hero-audit-surface").screenshot({
    path: testInfo.outputPath("rounded-hero-surfaces-desktop.png"),
  });
  await page.locator(".home-decision__body").screenshot({
    path: testInfo.outputPath("rounded-format-tabs-desktop.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const mobileFormRadius = await page.locator(".hero-audit-surface .audit-form").evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)
  ));
  expect(mobileFormRadius).toBeGreaterThanOrEqual(16);
  const mobileWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(mobileWidth.scroll).toBeLessThanOrEqual(mobileWidth.client + 1);
  await page.locator(".signal-hero .hero-audit-surface").screenshot({
    path: testInfo.outputPath("rounded-hero-surfaces-mobile.png"),
  });
});

test("keeps the scope and timing facts wide enough for readable line breaks", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const tabs = page.locator(".home-decision__tab");
  for (let index = 0; index < 3; index += 1) {
    await tabs.nth(index).click();
    const facts = page.locator(".home-decision__panel:not([hidden]) dl > div");
    await expect(facts).toHaveCount(2);
    for (const fact of await facts.all()) {
      expect(await fact.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(112);
      await expect(fact.locator("dd")).toHaveCSS("word-break", "normal");
    }
  }

  await tabs.nth(1).click();
  const decision = page.locator(".home-decision__body");
  await decision.screenshot({ path: testInfo.outputPath("technical-audit-desktop-dark.png"), animations: "disabled" });
  await page.locator(".theme-toggle:not(.theme-toggle--mobile)").click();
  await decision.screenshot({ path: testInfo.outputPath("technical-audit-desktop-light.png"), animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await decision.screenshot({ path: testInfo.outputPath("technical-audit-mobile-light.png"), animations: "disabled" });
  await page.locator(".theme-toggle:not(.theme-toggle--mobile)").click();
  await decision.screenshot({ path: testInfo.outputPath("technical-audit-mobile-dark.png"), animations: "disabled" });
});

test("uses the redesigned dashboard anatomy in the compact hero footprint", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1920, height: 1119 });
  await page.goto("/");
  await page.waitForTimeout(1_200);

  const tool = page.locator(".hero-tool");
  await expect(tool).toHaveAttribute("data-home-dashboard", "premium");
  await expect(tool.locator(".hero-dashboard-chrome")).toBeVisible();
  await expect(tool.locator(".analytics-hero-chart__mode")).toBeVisible();
  await expect(tool.locator(".analytics-chart-chrome")).toBeVisible();
  await expect(tool.locator(".analytics-visibility-detail__line-glow")).toHaveCount(1);

  const geometry = await tool.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const visual = element.querySelector<HTMLElement>(".hero-audit-visual");
    const chart = element.querySelector<HTMLElement>(".analytics-visibility-detail");
    if (!visual || !chart) throw new Error("Dashboard surface is missing");
    const visualStyle = getComputedStyle(visual);
    const chartStyle = getComputedStyle(chart);
    return {
      width: bounds.width,
      height: bounds.height,
      visualBackground: visualStyle.backgroundImage,
      visualShadow: visualStyle.boxShadow,
      chartRadius: Number.parseFloat(chartStyle.borderTopLeftRadius),
      chartShadow: chartStyle.boxShadow,
    };
  });
  expect(geometry.width).toBeGreaterThanOrEqual(640);
  expect(geometry.width).toBeLessThanOrEqual(660);
  expect(geometry.height).toBeGreaterThanOrEqual(880);
  expect(geometry.height).toBeLessThanOrEqual(920);
  expect(geometry.visualBackground).toContain("radial-gradient");
  expect(geometry.visualShadow).toContain("inset");
  expect(geometry.chartRadius).toBeGreaterThanOrEqual(18);
  expect(geometry.chartShadow).toContain("inset");

  await page.locator("#home-process").scrollIntoViewIfNeeded();
  const processMaterial = await page.locator(".home-process-board").evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundImage, shadow: style.boxShadow };
  });
  expect(processMaterial.background).toContain("radial-gradient");
  expect(processMaterial.shadow).not.toBe("none");

  await page.locator("#home-levels").scrollIntoViewIfNeeded();
  const decision = page.locator(".home-decision__body");
  await expect(decision).toHaveAttribute("data-dashboard-surface", "tier-selector");
  for (const tab of await page.locator(".home-decision__tab").all()) await tab.click();

  await page.screenshot({ path: testInfo.outputPath("home-dashboard-redesign.png") });
});

test("balances the desktop hero copy and dashboard on one shared geometry", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1920, height: 1119 });
  await page.goto("/");
  await page.waitForTimeout(1_200);

  const geometry = await page.evaluate(() => {
    const eyebrow = document.querySelector<HTMLElement>(".signal-hero .hero-copy > .eyebrow");
    const heading = document.querySelector<HTMLElement>(".signal-hero .hero-copy h1");
    const dashboard = document.querySelector<HTMLElement>(".signal-hero .hero-audit-surface");
    const checks = document.querySelector<HTMLElement>(".signal-hero .scan-keywords");
    const firstCheck = document.querySelector<HTMLElement>(".signal-hero .hero-check-step");
    const step = document.querySelector<HTMLElement>(".signal-hero .audit-form-step-status");
    const formHeading = document.querySelector<HTMLElement>(".signal-hero .form-heading h2");
    const copy = document.querySelector<HTMLElement>(".signal-hero .hero-copy");
    if (!eyebrow || !heading || !dashboard || !checks || !firstCheck || !step || !formHeading || !copy) {
      throw new Error("Homepage hero geometry is incomplete");
    }
    const eyebrowBox = eyebrow.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const dashboardBox = dashboard.getBoundingClientRect();
    const checksBox = checks.getBoundingClientRect();
    const formHeadingBox = formHeading.getBoundingClientRect();
    const formHeadingLineHeight = Number.parseFloat(getComputedStyle(formHeading).lineHeight);
    const copyDecoration = getComputedStyle(copy, "::before");
    return {
      dashboardHeight: dashboardBox.height,
      dashboardBottom: dashboardBox.bottom,
      dashboardTop: dashboardBox.top,
      eyebrowTop: eyebrowBox.top,
      headingGap: headingBox.top - eyebrowBox.bottom,
      checksBottom: checksBox.bottom,
      checksBorderTop: Number.parseFloat(getComputedStyle(checks).borderTopWidth),
      firstCheckBorderTop: Number.parseFloat(getComputedStyle(firstCheck).borderTopWidth),
      decoration: copyDecoration.content,
      stepDisplay: getComputedStyle(step).display,
      formHeadingLines: formHeadingBox.height / formHeadingLineHeight,
      viewportHeight: window.innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect.soft(Math.abs(geometry.eyebrowTop - geometry.dashboardTop)).toBeLessThanOrEqual(6);
  expect.soft(geometry.headingGap).toBeLessThanOrEqual(28);
  expect.soft(geometry.dashboardHeight).toBeLessThanOrEqual(920);
  expect.soft(geometry.dashboardBottom).toBeLessThanOrEqual(geometry.viewportHeight + 4);
  expect.soft(Math.abs(geometry.dashboardBottom - geometry.checksBottom)).toBeLessThanOrEqual(8);
  expect.soft(geometry.checksBorderTop).toBe(0);
  expect.soft(geometry.firstCheckBorderTop).toBe(1);
  expect.soft(geometry.decoration).toBe("none");
  expect.soft(geometry.stepDisplay).toBe("none");
  expect.soft(geometry.formHeadingLines).toBeLessThanOrEqual(2.05);
  expect.soft(geometry.overflow).toBeLessThanOrEqual(0);
});

test("extends the desktop check cards to the bottom of the audit dashboard", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1428, height: 818 });
  await page.goto("/");

  const geometry = await page.evaluate(() => {
    const checks = document.querySelector<HTMLElement>(".signal-hero .scan-keywords");
    const dashboard = document.querySelector<HTMLElement>(".signal-hero .hero-audit-surface");
    const cards = [...document.querySelectorAll<HTMLElement>(".signal-hero .hero-check-link")];
    if (!checks || !dashboard || cards.length !== 4) throw new Error("Homepage hero checks are incomplete");
    return {
      checksBottom: checks.getBoundingClientRect().bottom,
      dashboardBottom: dashboard.getBoundingClientRect().bottom,
      cardHeights: cards.map((card) => card.getBoundingClientRect().height),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(Math.abs(geometry.dashboardBottom - geometry.checksBottom)).toBeLessThanOrEqual(6);
  expect(Math.max(...geometry.cardHeights) - Math.min(...geometry.cardHeights)).toBeLessThanOrEqual(1);
  expect(geometry.overflow).toBeLessThanOrEqual(0);
  await page.locator(".signal-hero .hero-grid").screenshot({ path: testInfo.outputPath("home-hero-aligned-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileCardHeights = await page.locator(".signal-hero .hero-check-link").evaluateAll((cards) => (
    cards.map((card) => card.getBoundingClientRect().height)
  ));
  expect(Math.max(...mobileCardHeights)).toBeLessThan(180);
  await page.screenshot({ path: testInfo.outputPath("home-hero-mobile.png"), fullPage: false });
});

test("keeps the light homepage canvas continuous behind the dark dashboard", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni:theme:v1", "light");
  });
  await page.setViewportSize({ width: 1920, height: 1119 });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  const surface = await page.locator(".home-content.home-10").evaluate((element) => {
    const heading = element.querySelector<HTMLElement>(".signal-hero h1");
    if (!heading) throw new Error("Homepage heading is missing");
    return {
      background: getComputedStyle(element).backgroundColor,
      heading: getComputedStyle(heading).color,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(surface.background).toBe("rgb(247, 248, 251)");
  expect(surface.heading).toBe("rgb(11, 19, 43)");
  expect(surface.overflow).toBe(0);
});

test("lets visitors browse all seven home-page guides and keeps theme switching distinct", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni:theme:v1", "dark");
  });
  await page.goto("/");

  const viewport = page.locator(".home-article-carousel__viewport");
  await expect(viewport.locator("[data-article-card]")).toHaveCount(7);
  await expect(viewport.locator('a[href$="/blog/seo-promotion-cost"]')).toHaveCount(1);
  const nextGuide = page.getByRole("button", { name: "Следующий разбор" });
  const previousGuide = page.getByRole("button", { name: "Предыдущий разбор" });
  await expect(nextGuide).toBeEnabled();
  await expect(previousGuide).toBeEnabled();
  await expect(page.locator(".home-article-carousel")).toHaveAttribute("data-active-index", "0");
  await previousGuide.click();
  await expect(page.locator(".home-article-carousel")).toHaveAttribute("data-active-index", "6");
  await nextGuide.click();
  await expect(page.locator(".home-article-carousel")).toHaveAttribute("data-active-index", "0");
  await nextGuide.click();
  await expect(page.locator(".home-article-carousel")).toHaveAttribute("data-active-index", "1");
  await expect(viewport.locator('[data-carousel-position="0"]')).toHaveAttribute("data-active", "true");

  await page.getByLabel("Включить светлую тему").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(page.locator(".kileni-site")).toHaveCSS("--brand", "#4164ff");
});

test("keeps the home guide carousel steady and advances it from a blurred preview", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni:theme:v1", "dark");
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const carousel = page.locator(".home-article-carousel");
  const viewport = carousel.locator(".home-article-carousel__viewport");
  await carousel.scrollIntoViewIfNeeded();

  const readGeometry = async () => carousel.evaluate((element) => {
    const control = element.querySelector<HTMLElement>(".home-article-carousel__controls");
    const active = element.querySelector<HTMLElement>('[data-carousel-position="0"]');
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-carousel-position]'))
      .filter((card) => getComputedStyle(card).display !== "none")
      .map((card) => card.offsetHeight);
    if (!control || !active) throw new Error("Carousel geometry is incomplete");
    return {
      carouselHeight: element.getBoundingClientRect().height,
      controlsTop: control.getBoundingClientRect().top,
      activeHeight: active.offsetHeight,
      cardHeights: cards,
    };
  });

  const before = await readGeometry();
  const nextPreview = viewport.locator('[data-carousel-position="1"]');
  await expect(nextPreview).toHaveCSS("pointer-events", "auto");
  await nextPreview.click();
  await expect(carousel).toHaveAttribute("data-active-index", "1");
  await page.waitForTimeout(450);

  const after = await readGeometry();
  expect(after.cardHeights.every((height) => height === after.activeHeight)).toBe(true);
  expect(after.carouselHeight).toBeCloseTo(before.carouselHeight, 0);
  expect(after.controlsTop).toBeCloseTo(before.controlsTop, 0);

  await carousel.screenshot({ path: testInfo.outputPath("home-articles-steady-preview-click.png") });
});

test("aligns the case proof with its switcher and presents deliverables as one sequence", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni:theme:v1", "dark");
  });
  await page.setViewportSize({ width: 1435, height: 958 });
  await page.goto("/");

  const caseGeometry = await page.locator(".home-case-explorer").evaluate((section) => {
    const switcher = section.querySelector<HTMLElement>(".home-case-explorer__switch");
    const surface = section.querySelector<HTMLElement>(".home-case-explorer__surface");
    if (!switcher || !surface) throw new Error("Case explorer surfaces are missing");
    const switchRect = switcher.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    return {
      leftDelta: Math.abs(switchRect.left - surfaceRect.left),
      widthDelta: Math.abs(switchRect.width - surfaceRect.width),
    };
  });
  expect(caseGeometry.leftDelta).toBeLessThanOrEqual(2);
  expect(caseGeometry.widthDelta).toBeLessThanOrEqual(2);
  await page.locator("#home-cases").scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("#home-cases img").evaluateAll((images) => images.every((image) => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth > 0;
  }))).toBe(true);

  const steps = page.locator(".home-deliverable-list > li");
  await expect(steps).toHaveCount(4);
  await expect(page.locator(".home-deliverable-list > li > b")).toHaveCount(0);
  const stepGeometry = await steps.evaluateAll((items) => items.map((item) => {
    const rect = item.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width };
  }));
  expect(new Set(stepGeometry.map(({ left }) => Math.round(left))).size).toBe(1);
  expect(new Set(stepGeometry.map(({ width }) => Math.round(width))).size).toBe(1);
  expect(stepGeometry.every((item, index) => index === 0 || item.top > stepGeometry[index - 1].top)).toBe(true);

  await page.locator("#home-cases").screenshot({ path: testInfo.outputPath("home-case-aligned.png") });
  await page.locator("#home-deliverables").screenshot({ path: testInfo.outputPath("home-deliverables-sequence.png") });
});

test("keeps the home guide carousel compact on a wide desktop", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/");

  const firstCard = page.locator('.home-article-carousel__card[data-carousel-position="0"]');
  const carouselViewport = page.locator(".home-article-carousel__viewport");
  const cardSize = await firstCard.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  });
  expect(cardSize.width).toBeLessThanOrEqual(480);
  expect(cardSize.height).toBeLessThanOrEqual(520);
  await expect(page.locator(".home-article-carousel__progress")).toHaveText("01 / 07");
  await expect(carouselViewport.locator('[data-carousel-position="-2"], [data-carousel-position="-1"], [data-carousel-position="0"], [data-carousel-position="1"], [data-carousel-position="2"]')).toHaveCount(5);
  const railGeometry = await carouselViewport.evaluate((element) => {
    const visible = Array.from(element.querySelectorAll<HTMLElement>('[data-carousel-position]'))
      .filter((card) => getComputedStyle(card).display !== "none")
      .map((card) => ({
        position: card.dataset.carouselPosition,
        width: card.getBoundingClientRect().width,
        opacity: Number(getComputedStyle(card).opacity),
        filter: getComputedStyle(card).filter,
      }));
    return visible;
  });
  expect(railGeometry).toHaveLength(5);
  const active = railGeometry.find((card) => card.position === "0");
  const distant = railGeometry.filter((card) => card.position !== "0");
  expect(active).toBeDefined();
  expect(active?.filter).toBe("none");
  expect(distant.every((card) => card.opacity < 1 && card.filter.includes("blur"))).toBe(true);
  expect(distant.every((card) => card.width < (active?.width ?? 0))).toBe(true);
  await firstCard.scrollIntoViewIfNeeded();
  await expect.poll(() => firstCard.locator("img").evaluate((image) => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth > 0;
  })).toBe(true);
  await page.locator("#home-articles").screenshot({ path: testInfo.outputPath("home-articles-compact.png") });
});

test("aligns the audit link with the last delivery step on wide screens", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/");

  const geometry = await page.evaluate(() => {
    const link = document.querySelector<HTMLElement>("#home-deliverables .button-primary");
    const lastStep = document.querySelector<HTMLElement>("#home-deliverables .home-deliverable-list > li:last-child");
    if (!link || !lastStep) throw new Error("Deliverables geometry is missing");
    return {
      linkBottom: link.getBoundingClientRect().bottom,
      lastStepBottom: lastStep.getBoundingClientRect().bottom,
    };
  });
  expect(Math.abs(geometry.linkBottom - geometry.lastStepBottom)).toBeLessThanOrEqual(2);
});

test("keeps the blog index as compact as the home guide carousel", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/blog");

  const geometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(".editorial-index-top .page-hero");
    const featured = document.querySelector<HTMLElement>(".article-index-grid .article-card-featured");
    if (!hero || !featured) throw new Error("Blog index geometry is missing");
    return {
      heroHeight: hero.getBoundingClientRect().height,
      featuredHeight: featured.getBoundingClientRect().height,
    };
  });
  expect.soft(geometry.heroHeight).toBeLessThanOrEqual(610);
  expect.soft(geometry.featuredHeight).toBeLessThanOrEqual(540);
  const featuredImage = page.locator(".article-index-grid .article-card-featured img").first();
  await featuredImage.scrollIntoViewIfNeeded();
  await expect.poll(() => featuredImage.evaluate((image) => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth > 0;
  })).toBe(true);
  await page.locator(".editorial-index-top").screenshot({ path: testInfo.outputPath("blog-index-hero-compact.png") });
  await page.locator(".article-index-browser").screenshot({ path: testInfo.outputPath("blog-index-cards-compact.png") });
});

test("keeps the blog overview compact while retaining its featured guide", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/blog");

  const geometry = await page.evaluate(() => {
    const top = document.querySelector<HTMLElement>(".editorial-index-top");
    const featured = document.querySelector<HTMLElement>(".article-index-grid .article-card-featured");
    if (!top || !featured) throw new Error("Blog overview is incomplete");
    return {
      topHeight: top.getBoundingClientRect().height,
      featuredHeight: featured.getBoundingClientRect().height,
    };
  });

  expect(geometry.topHeight).toBeLessThanOrEqual(420);
  expect(geometry.featuredHeight).toBeLessThanOrEqual(300);
});

test("keeps the revised home sections coherent on mobile", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const disclosure = page.getByRole("button", { name: "Показать разборы" });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  const carousel = page.locator(".home-article-carousel");
  const firstCard = carousel.locator("[data-article-card]").first();
  await expect(page.getByRole("button", { name: "Предыдущий разбор" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Следующий разбор" })).toBeEnabled();
  expect(await firstCard.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(350);
  await firstCard.scrollIntoViewIfNeeded();
  await expect.poll(() => firstCard.locator("img").evaluate((image) => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth > 0;
  })).toBe(true);

  const deliverableSteps = page.locator(".home-deliverable-list > li");
  await expect(deliverableSteps).toHaveCount(4);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(0);

  await page.locator("#home-articles").screenshot({ path: testInfo.outputPath("home-articles-mobile.png") });
  await page.locator("#home-deliverables").screenshot({ path: testInfo.outputPath("home-deliverables-mobile.png") });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps the home-page promise and primary CTA available", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".brand-intro")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Узнать, что мешает сайту", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "От бесплатной проверки до контрольного результата" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Как замечание превращается в проверенное исправление" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Когда одной проверки недостаточно" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Новые разборы — прямо на главной" })).toBeVisible();
  });
});
