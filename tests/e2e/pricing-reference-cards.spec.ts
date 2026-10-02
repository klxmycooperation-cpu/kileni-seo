import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
  });
});

test("shows the three price options as separate cards", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  await page.goto("/pricing?category=seo-audit");

  const cards = page.locator(".pricing-10 .cp-tier-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.first().locator(".cp-tier-card-summary")).toBeVisible();
  await expect(cards.first().locator(".cp-tier-card-details-trigger")).toBeVisible();
  await expect.poll(() => cards.nth(1).locator(".cp-tier-card-price").evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(100);

  const featuredCard = page.locator(".pricing-10 .cp-tier-card[data-featured]");
  await expect(featuredCard).toHaveCount(1);
  const palette = await cards.evaluateAll((elements) => elements.map((card) => {
    const summary = card.querySelector<HTMLElement>(".cp-tier-card-summary");
    const action = card.querySelector<HTMLElement>(".cp-tier-card-action");
    if (!summary || !action) throw new Error("A pricing card is missing its coloured surface");
    return {
      cardBorder: getComputedStyle(card).borderTopColor,
      summaryBackground: getComputedStyle(summary).backgroundColor,
      actionBorder: getComputedStyle(action).borderTopColor,
    };
  }));
  expect(palette).toEqual([
    { cardBorder: "rgb(124, 154, 255)", summaryBackground: "rgb(228, 236, 255)", actionBorder: "rgb(65, 100, 255)" },
    { cardBorder: "rgb(146, 124, 236)", summaryBackground: "rgb(238, 232, 255)", actionBorder: "rgb(113, 80, 232)" },
    { cardBorder: "rgb(104, 185, 162)", summaryBackground: "rgb(225, 245, 238)", actionBorder: "rgb(26, 158, 115)" },
  ]);

  expect(await page.locator("html").evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);

  await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("pricing-reference-desktop.png") });
});

test("keeps every price on the pricing page equally prominent in the dark theme", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/pricing?category=seo-audit", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");
  const prices = page.locator("#pricing-panel-seo-audit .cp-tier-card-price > strong");
  await expect(prices).toHaveCount(3);

  const styles = await prices.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, fontWeight: style.fontWeight, textShadow: style.textShadow };
  }));

  expect(new Set(styles.map((style) => style.color)).size).toBe(3);
  expect(styles.every((style) => style.color !== "rgb(247, 248, 252)" && style.color !== "rgb(16, 24, 42)")).toBe(true);
  expect(new Set(styles.map((style) => style.fontWeight))).toEqual(new Set(["780"]));
  expect(styles.every((style) => style.textShadow !== "none")).toBe(true);
});

test("uses the same price emphasis in every public commercial surface", async ({ page }) => {
  // The first visit to /services can trigger a cold Next.js dev compilation.
  test.setTimeout(90_000);
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));

  for (const [path, selector, colors] of [
    ["/seo-audit", ".svc-package-price.price-emphasis", ["rgb(123, 168, 255)", "rgb(184, 164, 255)", "rgb(101, 214, 178)"]],
    ["/marketplaces/wildberries", ".marketplace-offer-price.price-emphasis", ["rgb(123, 168, 255)", "rgb(184, 164, 255)", "rgb(101, 214, 178)"]],
    ["/seo", ".seo-hub__direction-price.price-emphasis", ["rgb(123, 168, 255)", "rgb(184, 164, 255)"]],
    ["/services", ".services-explorer__price.price-emphasis", ["rgb(123, 168, 255)"]],
    ["/brief", ".brief-choice-price.price-emphasis", ["rgb(123, 168, 255)", "rgb(184, 164, 255)", "rgb(101, 214, 178)", "rgb(123, 168, 255)", "rgb(184, 164, 255)", "rgb(101, 214, 178)"]],
    ["/", ".home-decision__price.price-emphasis", ["rgb(123, 168, 255)", "rgb(184, 164, 255)", "rgb(101, 214, 178)"]],
  ] as const) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const prices = page.locator(selector);
    await expect(prices).toHaveCount(colors.length);

    const styles = await prices.evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, fontWeight: style.fontWeight, textShadow: style.textShadow };
    }));

    expect(styles.map((style) => style.color)).toEqual(colors);
    expect(styles.every((style) => style.fontWeight === "780")).toBe(true);
    expect(styles.every((style) => style.textShadow !== "none")).toBe(true);
  }
});

test("keeps pricing caveats with the exclusions and uses the requested heading layout", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/pricing?category=seo-audit");

  await expect(page.getByText("3 ВАРИАНТА", { exact: true })).toHaveCount(0);
  await expect(page.locator(".cp-section-intro")).not.toContainText("Внешние расходы и работа сверх указанного объёма");

  const extras = page.locator(".cp-extras-section");
  await expect(extras.getByText("Внешние расходы и работа сверх указанного объёма согласуются до начала.", { exact: true })).toBeVisible();
  await expect(extras.getByRole("heading", { level: 2 })).toHaveCSS("white-space", "nowrap");

  const requestTitle = page.locator(".cp-request-grid h2");
  await expect(requestTitle.locator(".cp-request-title__line")).toHaveText([
    "Опишите задачу",
    "Назовём состав и цену",
  ]);

  await page.goto("/pricing?category=seo-promotion");
  const promotionTitle = page.locator(".cp-hero h1 .canvas-text");
  await expect(promotionTitle).toHaveText("Улучшаем сайт,\nчтобы клиенты\nнаходили его в поиске");
  await expect(promotionTitle).toHaveCSS("white-space", "pre-line");
});

test("switches service categories with an animated navigator while preserving tab semantics", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pricing?category=seo-audit");

  const tablist = page.getByRole("tablist", { name: "Категории услуг" });
  const indicator = tablist.locator(".cp-category-tabs__active");
  await expect(indicator).toBeVisible();
  await expect(tablist).toHaveAttribute("data-active-category", "seo-audit");

  const before = await indicator.evaluate((element) => getComputedStyle(element).transform);
  await page.getByRole("tab", { name: /SEO-продвижение/u }).click();

  await expect(page).toHaveURL(/category=seo-promotion/u);
  await expect(tablist).toHaveAttribute("data-active-category", "seo-promotion");
  await expect(page.getByRole("tab", { name: /SEO-продвижение/u })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#pricing-panel-seo-promotion")).toHaveAttribute("data-category", "seo-promotion");

  await expect.poll(() => indicator.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before);
  await expect(indicator).toHaveCSS("transition-property", /transform/u);
});

test("keeps the active category surface aligned with every category label", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const categories = [
    "seo-audit",
    "seo-promotion",
    "web-development",
    "marketplaces",
    "yandex-ads",
    "content-materials",
    "custom-task",
  ];

  for (const width of [1025, 1210, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pricing?category=seo-audit", { waitUntil: "domcontentloaded" });

    for (const category of categories) {
      const tab = page.locator(`#pricing-tab-${category}`);
      await tab.evaluate((element) => (element as HTMLButtonElement).click());
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect.poll(async () => tab.evaluate((element) => {
        const indicator = element.parentElement?.querySelector<HTMLElement>(".cp-category-tabs__active");
        if (!indicator) return Number.POSITIVE_INFINITY;
        return Math.abs(element.getBoundingClientRect().top - indicator.getBoundingClientRect().top);
      })).toBeLessThan(1);

      const layout = await tab.evaluate((element) => {
        const indicator = element.parentElement?.querySelector<HTMLElement>(".cp-category-tabs__active");
        if (!indicator) throw new Error("Missing active category surface");

        const buttonRect = element.getBoundingClientRect();
        const indicatorRect = indicator.getBoundingClientRect();
        const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
        if (!textNode) throw new Error("Missing category label text");

        const labelRange = document.createRange();
        labelRange.selectNodeContents(textNode);
        const labelRects = [...labelRange.getClientRects()];

        return {
          bottomDelta: Math.abs(buttonRect.bottom - indicatorRect.bottom),
          heightDelta: Math.abs(buttonRect.height - indicatorRect.height),
          labelLineCount: labelRects.length,
          labelOutsideButton: labelRects.some((rect) => (
            rect.left < buttonRect.left - 1
            || rect.right > buttonRect.right + 1
            || rect.top < buttonRect.top - 1
            || rect.bottom > buttonRect.bottom + 1
          )),
          scrollOverflow: element.scrollHeight - element.clientHeight,
          topDelta: Math.abs(buttonRect.top - indicatorRect.top),
        };
      });

      expect(layout.topDelta, `${category} active surface top at ${width}px`).toBeLessThan(1);
      expect(layout.bottomDelta, `${category} active surface bottom at ${width}px`).toBeLessThan(1);
      expect(layout.heightDelta, `${category} active surface height at ${width}px`).toBeLessThan(1);
      expect(layout.labelLineCount, `${category} label lines at ${width}px`).toBeLessThanOrEqual(2);
      expect(layout.labelOutsideButton, `${category} label bounds at ${width}px`).toBe(false);
      expect(layout.scrollOverflow, `${category} button overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("keeps the selected category visible inside the mobile category rail", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing?category=content-materials", { waitUntil: "domcontentloaded" });

  const selectedTab = page.locator("#pricing-tab-content-materials");
  await expect(selectedTab).toHaveAttribute("aria-selected", "true");

  await expect.poll(async () => selectedTab.evaluate((element) => {
    const rail = element.parentElement;
    if (!rail) return false;
    const tabRect = element.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();
    return tabRect.left >= railRect.left - 1 && tabRect.right <= railRect.right + 1;
  })).toBe(true);
});

test("removes category-switcher motion when the visitor asks for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pricing?category=seo-audit");

  const indicator = page.getByRole("tablist", { name: "Категории услуг" }).locator(".cp-category-tabs__active");
  await expect(indicator).toBeVisible();
  const motion = await indicator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { animation: style.animationName, duration: style.transitionDuration };
  });
  expect(motion.animation).toBe("none");
  expect(Number.parseFloat(motion.duration) * 1000).toBeLessThanOrEqual(.01);
});

test("fits two tariff cards side by side at the compact desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1210, height: 818 });
  await page.goto("/pricing?category=seo-audit");

  const cards = page.locator("#pricing-panel-seo-audit .cp-tier-card");
  await expect(cards).toHaveCount(3);
  const bounds = await cards.evaluateAll((elements) => elements.map((card) => {
    const rect = card.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, right: rect.right };
  }));
  expect(Math.abs(bounds[0].top - bounds[1].top)).toBeLessThanOrEqual(2);
  expect(bounds[2].top).toBeGreaterThan(bounds[0].bottom);
  expect(Math.max(...bounds.map((rect) => rect.right))).toBeLessThanOrEqual(1210);
  expect(await page.locator("html").evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps tariff content readable in every pricing category", async ({ page }) => {
  test.setTimeout(90_000);
  const categories = [
    "seo-audit",
    "seo-promotion",
    "web-development",
    "marketplaces",
    "yandex-ads",
    "content-materials",
    "custom-task",
  ] as const;

  for (const width of [390, 1210, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pricing?category=seo-audit", { waitUntil: "domcontentloaded" });

    for (const category of categories) {
      await page.locator(`#pricing-tab-${category}`).click();
      const panel = page.locator(`#pricing-panel-${category}`);
      await expect(panel).toBeVisible();

      const cards = panel.locator(".cp-tier-card");
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      expect(await page.locator("html").evaluate((element) => element.scrollWidth <= window.innerWidth + 1), `${category} page overflows at ${width}px`).toBe(true);

      const rows = await cards.evaluateAll((elements) => elements.map((card) => {
        const cardTop = card.getBoundingClientRect().top;
        const metric = (selector: string) => {
          const element = card.querySelector(selector);
          if (!(element instanceof HTMLElement)) throw new Error(`Missing pricing row: ${selector}`);
          const rect = element.getBoundingClientRect();
          const contentOutside = Array.from(element.children).some((child) => {
            if (child.getClientRects().length === 0) return false;
            const childRect = child.getBoundingClientRect();
            return childRect.top < rect.top - 1 || childRect.bottom > rect.bottom + 1;
          });
          return {
            top: Math.round(rect.top - cardTop),
            height: Math.round(rect.height),
            contentOutside,
          };
        };
        return {
          summary: metric(".cp-tier-card-summary"),
          price: metric(".cp-tier-card-price"),
          action: metric(".cp-tier-card-action"),
          value: metric(".cp-tier-card-value"),
          details: metric(".cp-tier-card-details-trigger"),
        };
      }));

      for (const row of rows) {
        expect(row.summary.contentOutside, `${category} summary clips at ${width}px`).toBe(false);
        expect(row.price.contentOutside, `${category} price clips at ${width}px`).toBe(false);
        expect(row.value.contentOutside, `${category} value clips at ${width}px`).toBe(false);
      }

      expect(rows.every((row) => row.details.height > 0), `${category} disclosure is missing at ${width}px`).toBe(true);
    }
  }
});

test("opens the clicked audit tariff without changing neighbouring cards", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/pricing?category=seo-audit");

  const cards = page.locator("#pricing-panel-seo-audit .cp-tier-card");
  await expect(cards).toHaveCount(3);
  const closedHeights = await cards.evaluateAll((elements) => elements.map((card) => Math.round(card.getBoundingClientRect().height)));

  for (let index = 0; index < 3; index += 1) {
    const card = cards.nth(index);
    const trigger = card.locator(".cp-tier-card-details-trigger");
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: await card.locator(".cp-tier-card-summary > strong").innerText() });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(cards.locator('.cp-tier-card-details-trigger[aria-expanded="true"]')).toHaveCount(1);
    const heights = await cards.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().height)));
    expect(heights).toEqual(closedHeights);
    await dialog.getByRole("button", { name: "Закрыть условия тарифа" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
});

test("shows only the clicked tariff terms in a viewport-bound dialog", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1728, height: 900 });
  await page.goto("/pricing?category=seo-audit");

  const cards = page.locator("#pricing-panel-seo-audit .cp-tier-card");
  const originalHeights = await cards.evaluateAll((elements) => elements.map((card) => Math.round(card.getBoundingClientRect().height)));
  await cards.first().getByRole("button", { name: /Подробнее о тарифе/u }).click();

  const dialog = page.getByRole("dialog", { name: /Ключевые страницы/u });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("3–5 рабочих дней");
  await expect(dialog).not.toContainText("5–7 рабочих дней");
  const dialogBounds = await dialog.boundingBox();
  if (!dialogBounds) throw new Error("The tariff dialog has no visible bounds");
  expect(dialogBounds.y).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(900);

  const openedHeights = await cards.evaluateAll((elements) => elements.map((card) => Math.round(card.getBoundingClientRect().height)));
  expect(openedHeights).toEqual(originalHeights);
  await page.screenshot({ path: testInfo.outputPath("pricing-modal-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("keeps mobile tariff comparison to one card height and opens selected terms on screen", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing?category=seo-audit");

  const rail = page.locator("#pricing-panel-seo-audit .cp-tier-switch");
  const cards = rail.locator(".cp-tier-card");
  await expect(cards).toHaveCount(3);
  const layout = await rail.evaluate((element) => ({
    railHeight: element.getBoundingClientRect().height,
    firstCardHeight: element.querySelector(".cp-tier-card")?.getBoundingClientRect().height ?? 0,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(layout.railHeight).toBeLessThan(layout.firstCardHeight + 20);
  expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth);
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= innerWidth)).toBe(true);

  await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("pricing-cards-mobile.png") });

  await cards.first().getByRole("button", { name: /Подробнее о тарифе/u }).click();
  const dialog = page.getByRole("dialog", { name: /Ключевые страницы/u });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("pricing-modal-mobile.png") });
  const bounds = await dialog.boundingBox();
  if (!bounds) throw new Error("The mobile tariff dialog has no visible bounds");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
});

test("keeps a narrow mobile tariff card within the viewport and preserves the full description", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/pricing?category=seo-audit");

  const card = page.locator('#pricing-panel-seo-audit .cp-tier-card[data-offer-id="seo-audit-50"]');
  expect(await card.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(568);
  await card.getByRole("button", { name: /Подробнее о тарифе/u }).click();
  const dialog = page.getByRole("dialog", { name: /Ключевые страницы/u });
  await expect(dialog).toContainText("проверим важные страницы и покажем первые исправления");
  await expect(dialog).toContainText("Разберём отчёт и ответим на вопросы");
  const bounds = await dialog.boundingBox();
  if (!bounds) throw new Error("The narrow mobile tariff dialog has no visible bounds");
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
});

test("shows one tariff at a time without page overflow on a phone", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing?category=seo-audit");

  const categoryTabs = page.getByRole("tablist", { name: "Категории услуг" });
  const selectedCategory = categoryTabs.locator('button[aria-selected="true"]');
  const nextCategory = categoryTabs.getByRole("tab").nth(1);
  const [selectedCategoryBox, nextCategoryBox] = await Promise.all([
    selectedCategory.boundingBox(),
    nextCategory.boundingBox(),
  ]);
  if (!selectedCategoryBox || !nextCategoryBox) throw new Error("Mobile category tabs must have visible bounds");
  expect(selectedCategoryBox.width).toBeLessThan(335);
  expect(390 - nextCategoryBox.x).toBeGreaterThan(20);

  const cards = page.locator(".pricing-10 .cp-tier-card");
  await expect(cards).toHaveCount(3);
  const [firstBox, secondBox] = await Promise.all([cards.first().boundingBox(), cards.nth(1).boundingBox()]);
  if (!firstBox || !secondBox) throw new Error("Mobile tariffs must have visible bounds");
  expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(2);
  expect(secondBox.x).toBeGreaterThan(firstBox.x);
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("pricing-reference-mobile.png") });
});

test("shows details for only the selected promotion tariff", async ({ page }) => {
  await page.goto("/pricing?category=seo-promotion");

  const cards = page.locator(".pricing-10 .cp-tier-card");
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole("radio", { name: /Ключевые страницы/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Страницы и материалы/ })).toBeVisible();
  await expect(page.locator(".pricing-10 .cp-package-detail")).toHaveCount(0);

  await cards.first().locator(".cp-tier-card-details-trigger").click();
  let dialog = page.getByRole("dialog", { name: /Ключевые страницы/u });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть условия тарифа" }).click();
  await cards.nth(1).locator(".cp-tier-card-details-trigger").click();
  dialog = page.getByRole("dialog", { name: /Страницы и материалы/u });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Что не входит")).toBeVisible();
  await expect(cards.locator('.cp-tier-card-details-trigger[aria-expanded="true"]')).toHaveCount(1);
  await expect(cards.nth(2).locator(".cp-tier-card-details-trigger")).toHaveAttribute("aria-expanded", "false");
});

test("shows the concrete result and package contents before the details are opened", async ({ page }) => {
  await page.goto("/pricing?category=seo-audit");

  const card = page.locator('article.cp-tier-card[data-offer-id="seo-audit-200"]');
  await expect(card.locator(".cp-tier-card-details-trigger")).toHaveAttribute("aria-expanded", "false");
  await expect(card.locator(".cp-tier-card-outcome")).toContainText("список задач");
  await expect(card.locator(".cp-tier-card-includes li")).toHaveCount(4);
  await expect(card.locator(".cp-tier-card-includes")).toContainText("адресами страниц");
  await expect(card.locator(".cp-tier-card-includes")).toContainText("задачи для разработчика");
});

test("gives a single custom offer enough width and keeps its price inside the card", async ({ page }) => {
  await page.goto("/pricing?category=custom-task");

  const card = page.locator('article.cp-tier-card[data-offer-id="custom-task-consultation"]');
  expect(await card.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(480);
  expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(card.locator(".cp-tier-card-price strong")).toHaveCSS("white-space", "normal");
});

test("shows all three SEO prices with a monthly billing label", async ({ page }, testInfo) => {
  await page.goto("/pricing?category=seo-promotion");

  const priceBlocks = page.locator(".pricing-10 .cp-tier-card-price");
  await expect(priceBlocks).toHaveCount(3);
  await expect(priceBlocks.locator("strong")).toHaveText([
    "от 25 000 ₽",
    "35 000 ₽",
    "от 60 000 ₽",
  ]);
  await expect(priceBlocks.locator("small")).toHaveText(["в месяц", "в месяц", "в месяц"]);
  await priceBlocks.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-market-price-catalogue.png"), fullPage: false });
});

test("publishes the market-reviewed price catalogue without retired public amounts", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const pricesByCategory = {
    "seo-audit": ["9 000 ₽", "29 000 ₽", "59 000 ₽"],
    "seo-promotion": ["от 25 000 ₽", "35 000 ₽", "от 60 000 ₽"],
    "web-development": ["от 30 000 ₽", "70 000 ₽", "от 80 000 ₽"],
    marketplaces: ["18 000 ₽"],
    "yandex-ads": ["15 000 ₽", "12 000 ₽"],
    "content-materials": ["5 000 ₽"],
  } as const;
  const retiredPublicAmounts = [
    "8 500 ₽", "29 750 ₽", "85 000 ₽", "55 250 ₽",
    "25 500 ₽", "34 000 ₽", "59 500 ₽",
    "68 000 ₽", "212 500 ₽", "127 500 ₽", "4 250 ₽",
    "17 000 ₽", "12 750 ₽", "5 440 ₽",
  ];

  await page.goto("/pricing?category=seo-audit", { waitUntil: "domcontentloaded" });
  for (const [category, expected] of Object.entries(pricesByCategory)) {
    await page.locator(`#pricing-tab-${category}`).click();
    const panel = page.locator(`[data-category="${category}"]`);
    await expect(panel).toBeVisible();
    await expect(panel.locator(".cp-tier-card-price strong")).toHaveText(expected);
    const publicCopy = await page.locator("main").innerText();
    for (const retired of retiredPublicAmounts) expect(publicCopy).not.toContain(retired);
  }

  await page.goto("/marketplaces/wildberries", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".marketplace-offer-price")).toHaveText([
    "2 000 ₽ за артикул",
    "2 500 ₽ за артикул",
    "5 900 ₽ за артикул",
  ]);
  await page.locator(".marketplace-offer-grid").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("market-price-catalogue.png"), fullPage: false });
});

test("keeps the selected category readable on its highlighted row", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.goto("/pricing?category=web-development");

  const selectedTab = page.locator(".pricing-10 .cp-category-tabs button[aria-selected=\"true\"]");
  await expect(selectedTab.locator("span")).toHaveText("03");
  await expect.poll(() => selectedTab.evaluate((element) => {
    const indicator = element.parentElement?.querySelector(".cp-category-tabs__active");
    return indicator ? Math.abs(element.getBoundingClientRect().top - indicator.getBoundingClientRect().top) : Number.POSITIVE_INFINITY;
  })).toBeLessThan(1);

  const highlight = await selectedTab.evaluate((element) => {
    const labelColor = getComputedStyle(element).color.match(/\d+/gu)?.map(Number) ?? [];
    const number = element.querySelector("span");
    const indicator = element.parentElement?.querySelector(".cp-category-tabs__active");
    if (!number || !indicator) throw new Error("Missing selected category highlight");
    const row = element.getBoundingClientRect();
    const surface = indicator.getBoundingClientRect();
    return {
      labelColor,
      number: number.textContent,
      numberMarker: getComputedStyle(number, "::after").content,
      topDelta: Math.abs(row.top - surface.top),
      bottomDelta: Math.abs(row.bottom - surface.bottom),
    };
  });

  expect(highlight.number).toBe("03");
  expect(highlight.numberMarker).toBe("none");
  expect(highlight.topDelta).toBeLessThan(1);
  expect(highlight.bottomDelta).toBeLessThan(1);
  expect(Math.max(...highlight.labelColor)).toBeLessThan(80);
});

test("keeps the extras and request copy readable in the dark pricing theme", async ({ page }, testInfo) => {
  await page.goto("/pricing?category=seo-audit");

  const extrasHeading = page.locator(".pricing-10 .cp-extras-section h2");
  const extrasItem = page.locator(".pricing-10 .cp-extras-section li").first();
  const requestHeading = page.locator(".pricing-10 .cp-request-section h2").first();

  await expect(extrasHeading).toBeVisible();
  await expect(extrasItem).toBeVisible();
  await expect(requestHeading).toBeVisible();
  await expect(extrasHeading).toHaveCSS("color", "rgb(247, 248, 252)");
  await expect(extrasItem).toHaveCSS("color", "rgb(170, 182, 200)");
  await expect(requestHeading).toHaveCSS("color", "rgb(247, 248, 252)");
  await extrasHeading.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("pricing-dark-readable-sections.png") });
});

test("uses the pricing-card material on service price blocks and softly highlights the best option", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.setViewportSize({ width: 1672, height: 988 });
  await page.goto("/web-development", { waitUntil: "domcontentloaded" });

  const cards = page.locator(".svc-package-grid > article");
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveCSS("background-image", /linear-gradient/);
  await expect(cards.first()).toHaveCSS("border-radius", "20px");

  const featured = cards.filter({ has: page.getByText("Рекомендуем", { exact: true }) });
  await expect(featured).toHaveCount(1);
  await expect(featured).toHaveCSS("box-shadow", /rgb/);

  const grid = page.locator(".svc-package-grid");
  for (const theme of ["dark", "light"] as const) {
    if (theme === "light") {
      await page.getByRole("button", { name: "Включить светлую тему" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
    }
    for (const width of [1672, 1280]) {
      await page.setViewportSize({ width, height: 988 });
      await expect.poll(async () => {
        const offsets = await cards.evaluateAll((elements) => elements.map((card) => {
          const price = card.querySelector(".svc-package-price");
          if (!price) throw new Error("Missing service price");
          return price.getBoundingClientRect().top - card.getBoundingClientRect().top;
        }));
        return Math.max(...offsets) - Math.min(...offsets);
      }).toBeLessThan(1);
      await grid.screenshot({ path: testInfo.outputPath(`development-${width}-${theme}.png`), animations: "disabled" });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const card of await cards.all()) {
      await expect(card.locator(".svc-package-price")).toBeVisible();
    }
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 390, height: 1000 });
    await cards.first().screenshot({ path: testInfo.outputPath(`development-mobile-${theme}.png`), animations: "disabled" });
    await page.setViewportSize({ width: 1672, height: 988 });
  }
});

test("uses the same pricing-card material for marketplace offers", async ({ page }) => {
  await page.goto("/marketplaces/ozon", { waitUntil: "domcontentloaded" });

  const cards = page.locator(".marketplace-offer-grid > article");
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveCSS("background-image", /linear-gradient/);
  const radius = await cards.first().evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));
  expect(radius).toBeGreaterThanOrEqual(18);
  expect(radius).toBeLessThanOrEqual(21);
  await expect(cards.filter({ has: page.getByText("Рекомендуем", { exact: true }) })).toHaveCSS("box-shadow", /rgb/);
});
