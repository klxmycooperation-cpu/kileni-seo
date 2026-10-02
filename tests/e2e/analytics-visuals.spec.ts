import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
  });
});

test("renders the native visibility chart before an audit begins", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Поисковая видимость", { exact: true })).toBeVisible();
  await expect(page.getByText("Обзор за месяц", { exact: true })).toBeVisible();
  await expect(page.getByText("Показы ↑", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-audit-visual")).toHaveAttribute("aria-label", "Поисковая видимость");
  await expect(page.locator(".analytics-visibility-detail svg")).toBeVisible();
  await expect(page.getByText("График показывает, как может меняться видимость сайта после исправлений. Это пример, а не результат клиента.", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-tool")).toHaveAttribute("data-audit-state", "demo");
});

test("uses the shared dimensional data surfaces without changing the chart footprint", async ({ page }, testInfo) => {
  await page.goto("/");

  const card = page.locator(".hero-audit-visual.analytics-card");
  const chart = card.locator(".analytics-visibility-detail");
  const chip = card.locator(".analytics-visibility-detail__chips > span").first();
  const chartSurface = await chart.evaluate((element) => {
    const { height, width } = element.getBoundingClientRect();
    return { borderRadius: getComputedStyle(element).borderRadius, height, width };
  });

  await expect(card).toHaveCSS("background-image", /linear-gradient/);
  await expect(chip).toHaveCSS("box-shadow", /rgb/);
  expect(Number.parseFloat(chartSurface.borderRadius)).toBeGreaterThanOrEqual(14);
  expect(chartSurface.width).toBeGreaterThan(200);
  expect(chartSurface.height).toBeGreaterThan(100);

  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("data-primitives-chart-shell.png") });
});

test("adapts the hero dashboard to light mode and keeps the chart proportions", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/");

  const dashboard = page.locator(".hero-tool[data-home-dashboard='premium']");
  const surface = dashboard.locator(".hero-audit-surface");
  const primaryPanel = dashboard.locator(".analytics-hero-chart__metric-primary");
  const deltaPanel = dashboard.locator(".analytics-hero-chart__metric-change");
  const indexedPanel = dashboard.locator(".analytics-hero-chart__metric-context");
  const metricPanels = dashboard.locator(".analytics-hero-chart__metric > div");
  const statuses = dashboard.locator(".analytics-hero-chart__statuses > span");
  const delta = deltaPanel.locator(".analytics-delta");
  const chartSurface = dashboard.locator(".analytics-visibility-detail");
  const chart = dashboard.locator(".analytics-visibility-detail svg");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(surface).toHaveCSS("background-color", "rgb(237, 243, 255)");
  await expect(primaryPanel.locator("strong")).toHaveText("68%");
  expect(await delta.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(28);
  expect(await deltaPanel.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(168);
  await expect(metricPanels).toHaveCount(3);
  await expect(indexedPanel).toContainText("92/100");
  const metricPanelWidths = await metricPanels.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
  expect(Math.max(...metricPanelWidths) - Math.min(...metricPanelWidths)).toBeLessThanOrEqual(1);
  const metricPanelHeights = await metricPanels.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(Math.max(...metricPanelHeights) - Math.min(...metricPanelHeights)).toBeLessThanOrEqual(1);
  const metricValueSizes = await Promise.all([
    primaryPanel.locator("strong").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    deltaPanel.locator(".analytics-delta").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    indexedPanel.locator("b").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ]);
  expect(Math.max(...metricValueSizes) - Math.min(...metricValueSizes)).toBeLessThanOrEqual(1);
  const metricValueTops = await Promise.all([
    primaryPanel.locator("strong").evaluate((element) => element.getBoundingClientRect().top),
    deltaPanel.locator(".analytics-delta").evaluate((element) => element.getBoundingClientRect().top),
    indexedPanel.locator("b").evaluate((element) => element.getBoundingClientRect().top),
  ]);
  expect(Math.max(...metricValueTops) - Math.min(...metricValueTops)).toBeLessThanOrEqual(1);
  const primaryInset = await primaryPanel.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const value = element.querySelector("strong")?.getBoundingClientRect();
    return value ? value.left - panel.left : Number.POSITIVE_INFINITY;
  });
  expect(primaryInset).toBeLessThanOrEqual(24);
  await expect(statuses).toHaveCount(5);
  const statusGeometry = await statuses.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width };
  }));
  expect(Math.max(...statusGeometry.map(({ width }) => width)) - Math.min(...statusGeometry.map(({ width }) => width))).toBeLessThanOrEqual(1);
  const statusRowFill = await dashboard.locator(".analytics-hero-chart__statuses").evaluate((element) => {
    const row = element.getBoundingClientRect();
    const children = Array.from(element.children).map((child) => child.getBoundingClientRect());
    return children.length ? (children.at(-1)!.right - children[0].left) / row.width : 0;
  });
  expect(statusRowFill).toBeGreaterThanOrEqual(0.98);
  await expect(chart).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");

  const chartRatio = await chart.evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return width / height;
  });
  const chartFill = await Promise.all([
    chart.evaluate((element) => element.getBoundingClientRect().width),
    chartSurface.evaluate((element) => element.getBoundingClientRect().width),
  ]).then(([chartWidth, surfaceWidth]) => chartWidth / surfaceWidth);
  expect(chartRatio).toBeGreaterThan(2.25);
  expect(chartRatio).toBeLessThan(2.45);
  expect(chartFill).toBeGreaterThanOrEqual(0.98);
  const chartEndpoints = await chart.locator(".analytics-visibility-detail__point-wrap").evaluateAll((elements) => {
    const circles = elements.map((element) => element.querySelector(".analytics-visibility-detail__point"));
    return {
      first: Number(circles[0]?.getAttribute("cx") ?? Number.NaN),
      last: Number(circles.at(-1)?.getAttribute("cx") ?? Number.NaN),
    };
  });
  expect(chartEndpoints.first).toBeLessThanOrEqual(34);
  expect(chartEndpoints.last).toBeGreaterThanOrEqual(526);
  await expect(chart.locator(".analytics-visibility-detail__value-tag")).toHaveCount(3);

  const formLimit = dashboard.locator(".audit-form .form-limit");
  await expect(formLimit).toHaveText("Бесплатно проверим до 10 репрезентативных страниц сайта");
  const formLimitGeometry = await formLimit.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
      whiteSpace: style.whiteSpace,
    };
  });
  expect(formLimitGeometry.whiteSpace).toBe("nowrap");
  expect(formLimitGeometry.height).toBeLessThanOrEqual(formLimitGeometry.lineHeight * 1.2);

  await expect(page.locator(".hero-entry-actions .button-primary > span")).toHaveText("↗");

  await dashboard.screenshot({ path: testInfo.outputPath("hero-dashboard-light-balanced.png") });
  await page.locator(".signal-hero").screenshot({ path: testInfo.outputPath("hero-light-full-composition.png") });
});

test("keeps all three hero metrics on one line at mobile width", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const dashboard = page.locator(".hero-tool[data-home-dashboard='premium']");
  const metricPanels = dashboard.locator(".analytics-hero-chart__metric > div");
  const primaryValue = dashboard.locator(".analytics-hero-chart__metric-primary strong");

  await expect(metricPanels).toHaveCount(3);
  const valueGeometry = await primaryValue.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
      whiteSpace: style.whiteSpace,
    };
  });
  expect(valueGeometry.whiteSpace).toBe("nowrap");
  expect(valueGeometry.height).toBeLessThanOrEqual(valueGeometry.lineHeight * 1.15);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await dashboard.screenshot({ path: testInfo.outputPath("hero-dashboard-mobile-balanced.png") });
});

test("shows SEO promotion as a static growth map without imitating a clickable search result", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/seo-promotion");

  const visual = page.locator(".svc-visual-growth-map");
  await expect(page.getByRole("heading", { level: 1, name: "Превращаем поисковый спрос в понятные страницы сайта" })).toBeVisible();
  await expect(page.getByText("Собираем запросы, находим пробелы в структуре и обновляем страницы, чтобы поисковые системы и посетители понимали, какую услугу вы предлагаете и как с вами связаться.", { exact: true })).toBeVisible();
  await expect(visual).toBeVisible();
  await expect(visual.getByRole("heading", { name: "Как работа с поиском меняет сайт" })).toBeVisible();
  await expect(visual.locator("ol > li")).toHaveCount(3);
  await expect(visual.locator("a, button")).toHaveCount(0);
  await expect(page.locator(".svc-visual-search-listing")).toHaveCount(0);
  await expect(page.locator(".svc-visual-growth-loop")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.locator(".svc-detail-hero").screenshot({ path: testInfo.outputPath("seo-promotion-growth-map-desktop.png") });
});

test("uses one premium material across the existing public cards", async ({ page }) => {
  const targets = [
    ["/", ".home-entry-route__list > a"],
    ["/", ".home-decision__body"],
    ["/", ".home-article-carousel__card"],
    ["/pricing", ".cp-tier-card"],
    ["/blog", ".article-card"],
    ["/marketplaces", ".marketplace-card"],
  ] as const;

  for (const [path, selector] of targets) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const surface = page.locator(selector).first();
    await expect(surface, `${path} ${selector}`).toHaveCSS("background-image", /(linear|radial)-gradient/);
    await expect(surface, `${path} ${selector}`).toHaveCSS("box-shadow", /rgb/);
    expect(await surface.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderRadius))).toBeGreaterThanOrEqual(14);
  }
});

test("keeps the route continuous while giving the footer a blended surface", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".site-tracing-beam__content")).toHaveCSS("background-image", /linear-gradient/);
  await expect(page.locator("main")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".site-footer")).toHaveCSS("background-image", /linear-gradient/);
  const footerSurface = await page.locator(".site-footer").evaluate((element) => {
    const surface = getComputedStyle(element);
    const atmosphere = getComputedStyle(element, "::before");
    const grid = getComputedStyle(element, "::after");
    return {
      background: surface.backgroundImage,
      topColor: surface.getPropertyValue("--footer-blend-top").trim(),
      atmosphere: atmosphere.backgroundImage,
      blur: atmosphere.filter,
      mask: atmosphere.maskImage || atmosphere.getPropertyValue("-webkit-mask-image"),
      gridMask: grid.maskImage || grid.getPropertyValue("-webkit-mask-image"),
    };
  });
  expect(footerSurface.background).toContain("linear-gradient");
  expect(footerSurface.background).not.toContain("radial-gradient");
  expect(footerSurface.topColor).toBe("#07111f");
  expect(footerSurface.atmosphere).toContain("radial-gradient");
  expect(footerSurface.blur).toContain("blur");
  expect(footerSurface.mask).toContain("linear-gradient");
  expect(footerSurface.gridMask).toContain("linear-gradient");
  await expect(page.locator(".home-pin-cta")).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await page.locator("main").focus();
  await expect(page.locator("main")).toHaveCSS("outline-style", "none");

  await page.evaluate(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect.poll(() => page.locator(".site-footer").evaluate((element) => (
    getComputedStyle(element).getPropertyValue("--footer-blend-top").trim()
  ))).toBe("#f7f8fb");
});

test("keeps the hero chart decorative for the keyboard and restarts it every 15 seconds", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");

  const visual = page.locator("[data-testid='hero-search-visibility']");
  const figure = page.locator(".hero-audit-visual");
  await expect(visual).toBeVisible();
  await expect(figure.locator(".analytics-visibility-detail__point-wrap[tabindex='0']")).toHaveCount(0);
  await expect(figure.locator(".analytics-visibility-detail__point-wrap[role='button']")).toHaveCount(0);
  await expect(figure.getByRole("button", { name: /Повторить анимацию/u })).toHaveCount(0);

  await expect(visual).toHaveAttribute("data-visualisation-run", "0");
  await page.clock.fastForward("00:00:01");
  await page.clock.fastForward("15:00");
  await expect(visual).toHaveAttribute("data-visualisation-run", "1");
});

test("renders the hero graph as a complete static picture for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const visual = page.locator("[data-testid='hero-search-visibility']");
  await expect(visual).toHaveAttribute("data-ready", "true");
  await expect(visual.locator(".analytics-visibility-detail__line")).toHaveCSS("stroke-dashoffset", "0px");
  await expect(visual.locator(".analytics-visibility-detail__area")).toHaveCSS("opacity", "1");
  await expect(visual.locator(".analytics-visibility-detail__point").first()).toHaveCSS("opacity", "1");
});

test("starts the hero graph only after the intro and pauses it outside the viewport", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const visual = page.locator("[data-testid='hero-search-visibility']");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", /^(pending|play)$/u);
  await expect(visual).toHaveAttribute("data-ready", "false");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 8_500 });
  await expect(visual).toHaveAttribute("data-ready", "true");
  await expect(visual).toHaveAttribute("data-in-viewport", "true");

  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute("data-in-viewport", "false");
  await expect(visual.locator(".analytics-visibility-detail__line")).toHaveCSS("animation-play-state", "paused");
});

test("renders compact service outcomes and case metrics without horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/seo-audit");
  await expect(page.locator(".svc-compact-grid article").nth(2).getByRole("heading", { name: "Что получите" })).toBeVisible();
  await expect(page.locator(".svc-audit-journey")).toBeVisible();
  await expect(page.locator(".svc-audit-journey__pages li")).toHaveCount(6);
  await expect(page.locator(".svc-audit-journey__checks li")).toHaveCount(4);
  await expect(page.getByText("Для каждой найденной проблемы показываем адрес страницы, объясняем причину и описываем проверку после исправления.", { exact: true })).toBeVisible();
  await expect(page.getByText("Фрагмент готового отчёта", { exact: true })).toHaveCount(0);
  await expect(page.locator(".svc-compact-grid article").first()).toHaveCSS("background-image", /linear-gradient/);
  await expect(page.locator(".svc-compact-grid article").first()).toHaveCSS("box-shadow", /rgb/);
  await page.screenshot({ path: testInfo.outputPath("seo-audit-data-surfaces-mobile.png") });

  await page.goto("/seo-promotion");
  await expect(page.getByText("Состав фиксируется до начала работы", { exact: true })).toBeVisible();
  await expect(page.locator(".svc-compact-grid article")).toHaveCount(3);

  await page.goto("/cases");
  const caseGrowth = page.getByRole("article", { name: "Рост переходов и поисковой видимости" });
  await expect(caseGrowth).toBeVisible();
  await expect(caseGrowth.getByText("12 100 → 27 842", { exact: true })).toBeVisible();
  await expect(caseGrowth.getByText("34% → 68%", { exact: true })).toBeVisible();
  await expect(caseGrowth.locator(".analytics-case-errors__control")).toBeVisible();

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("uses the requested two-line audit title and an informative crawl journey", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/seo-audit");

  const title = page.locator(".service-10-seo-audit .svc-detail-copy h1 .canvas-text");
  const visual = page.locator(".service-10-seo-audit .svc-audit-journey");

  await expect(title).toHaveText("Проверим сайт\nСоставим список работ");
  await expect(title).toHaveCSS("white-space", "pre");
  const titleGeometry = await title.evaluate((element) => {
    const style = getComputedStyle(element);
    return { height: element.getBoundingClientRect().height, lineHeight: Number.parseFloat(style.lineHeight) };
  });
  expect(titleGeometry.height).toBeGreaterThanOrEqual(titleGeometry.lineHeight * 1.9);
  expect(titleGeometry.height).toBeLessThanOrEqual(titleGeometry.lineHeight * 2.1);

  await expect(visual).toBeVisible();
  await expect(visual.getByText("Сначала находим страницы, затем проверяем каждую по четырём направлениям.", { exact: true })).toBeVisible();
  await expect(visual.locator(".svc-audit-journey__pages li")).toHaveCount(6);
  await expect(visual.locator(".svc-audit-journey__checks li")).toHaveCount(4);
  await expect(visual.locator(".svc-site-scan__page")).toHaveCount(0);
  await expect(visual).not.toContainText("Фрагмент готового отчёта");

  await page.screenshot({ path: testInfo.outputPath("seo-audit-hero-crawl-journey-desktop.png") });
});

test("keeps the compact service outcome legible in Signal and reduced-motion modes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "signal"));
  await page.goto("/seo-promotion", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await expect(page.locator(".svc-visual-search-listing")).toBeVisible();
  await expect(page.locator(".svc-compact-grid")).toBeVisible();
});

test("reveals result graphics on a short landscape screen", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cases-redesign")).toBeVisible();

  const visual = page.locator(".analytics-card").first();
  await expect(visual).toBeVisible();
  await visual.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(visual).toHaveAttribute("data-ready", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test.describe("server-rendered visibility chart", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps 68 percent, the line and its points visible without JavaScript", async ({ page }) => {
    await page.goto("/");

    const visual = page.locator("[data-testid='hero-search-visibility']");
    await expect(visual.locator(".analytics-hero-chart__metric strong")).toHaveText("68%");
    await expect(visual.locator(".analytics-visibility-detail__line")).toHaveCSS("stroke-dashoffset", "0px");
    await expect(visual.locator(".analytics-visibility-detail__area")).toHaveCSS("opacity", "1");
    await expect(visual.locator(".analytics-visibility-detail__point").first()).toHaveCSS("opacity", "1");
    await expect(visual.locator(".analytics-visibility-detail__end-tag")).toHaveCSS("opacity", "0.9");
  });
});
