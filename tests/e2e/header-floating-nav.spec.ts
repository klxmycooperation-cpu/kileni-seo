import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("turns the public header into a compact glass navigation after scrolling", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const header = page.locator(".site-header");
  const headerInner = page.locator(".site-header .header-inner");

  await expect(header).toHaveAttribute("data-header-presentation", "full");
  const wordmarkBounds = await header.locator(".brand-logo__wordmark").evaluate((wordmark) => {
    const name = wordmark.querySelector<SVGTextElement>(".brand-logo__name");
    const descriptor = wordmark.querySelector<SVGTextElement>(".brand-logo__descriptor");
    if (!name || !descriptor) throw new Error("Wordmark text is missing");
    const nameBounds = name.getBBox();
    const descriptorBounds = descriptor.getBBox();
    return {
      nameRight: nameBounds.x + nameBounds.width,
      descriptorLeft: descriptorBounds.x,
    };
  });
  expect(wordmarkBounds.nameRight).toBeLessThan(wordmarkBounds.descriptorLeft);
  const fullWidth = await headerInner.evaluate((element) => element.getBoundingClientRect().width);
  const fullHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
  const fullHeaderInsets = await headerInner.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      left: Number.parseFloat(style.paddingInlineStart),
      right: Number.parseFloat(style.paddingInlineEnd),
    };
  });
  expect(fullHeight).toBeLessThanOrEqual(80);
  expect(fullHeaderInsets.left).toBeGreaterThanOrEqual(20);
  expect(fullHeaderInsets.right).toBeGreaterThanOrEqual(20);

  const navGaps = await page.locator(".site-header .desktop-nav > *").evaluateAll((items) =>
    items.slice(1).map((item, index) => {
      const previous = items[index].getBoundingClientRect();
      const current = item.getBoundingClientRect();
      return current.left - previous.right;
    }),
  );
  expect(Math.min(...navGaps)).toBeGreaterThanOrEqual(8);

  await page.evaluate(() => window.scrollTo({ top: 260, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-header-presentation", "compact");
  await expect.poll(() => headerInner.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(fullWidth * .95);
  await expect.poll(() => headerInner.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(fullWidth * .88);
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(fullHeight);
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(fullHeight * .82);
  await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(header.getByRole("button", { name: "Услуги" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Кейсы" })).toBeVisible();
  await expect(header.getByRole("link", { name: "О компании" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Узнать, что мешает сайту" })).toBeVisible();
  const compactNavGaps = await header.locator(".desktop-nav > *").evaluateAll((items) =>
    items.slice(1).map((item, index) => {
      const previous = items[index].getBoundingClientRect();
      const current = item.getBoundingClientRect();
      return current.left - previous.right;
    }),
  );
  expect(Math.min(...compactNavGaps)).toBeGreaterThanOrEqual(12);
  expect(Math.max(...compactNavGaps) - Math.min(...compactNavGaps)).toBeLessThanOrEqual(1);
  const chevron = header.locator(".desktop-nav .services-chevron");
  await expect(chevron).toBeVisible();
  await expect(chevron).toHaveCSS("width", "5px");
  await expect(chevron).toHaveCSS("height", "5px");
  const compactPhoneGap = await header.locator(".header-phone--desktop").evaluate((element) => Number.parseFloat(getComputedStyle(element).gap));
  expect(compactPhoneGap).toBeGreaterThanOrEqual(8);
  expect(await headerInner.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const compactVerticalBounds = await headerInner.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(compactVerticalBounds.scrollHeight).toBeLessThanOrEqual(compactVerticalBounds.clientHeight);
  await page.screenshot({ path: testInfo.outputPath("floating-header-compact.png") });
});

test("keeps the compact phone control clear of Brief and its own number", async ({ page }) => {
  for (const width of [1361, 2560]) {
    await page.setViewportSize({ width, height: 1354 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo({ top: 260, behavior: "instant" }));

    const header = page.locator(".site-header");
    await expect(header).toHaveAttribute("data-header-presentation", "compact");
    await page.waitForTimeout(550);

    const geometry = await header.evaluate((node) => {
      const brief = [...node.querySelectorAll<HTMLElement>(".desktop-nav a")]
        .find((link) => link.textContent?.trim() === "Бриф")?.getBoundingClientRect();
      const phone = node.querySelector<HTMLElement>(".header-phone--desktop");
      const icon = phone?.querySelector<HTMLElement>("img")?.getBoundingClientRect();
      const number = phone?.querySelector<HTMLElement>("span")?.getBoundingClientRect();
      if (!brief || !phone || !icon || !number) throw new Error("Expected the desktop phone control and Brief link");
      return {
        briefToIcon: icon.left - brief.right,
        iconToNumber: number.left - icon.right,
        fitsHeader: node.querySelector<HTMLElement>(".header-inner")!.scrollWidth
          <= node.querySelector<HTMLElement>(".header-inner")!.clientWidth,
      };
    });

    expect(geometry.briefToIcon, `${width}px: Brief to phone icon`).toBeGreaterThanOrEqual(12);
    expect(geometry.iconToNumber, `${width}px: phone icon to number`).toBeGreaterThanOrEqual(8);
    expect(geometry.fitsHeader, `${width}px: header fits`).toBe(true);
  }
});

test("keeps every navigation section on one line until the mobile breakpoint", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  for (const width of [1360, 1280, 1180, 1080, 1021, 1020, 980, 900, 768, 701]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

    const header = page.locator(".site-header");
    await expect(header).toHaveAttribute("data-header-presentation", "full");
    const headerInner = header.locator(".header-inner");
    const navigation = header.locator(".desktop-nav");
    await expect(navigation, `navigation at ${width}px`).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Услуги" })).toBeVisible();
    for (const label of ["Кейсы", "Цены", "Блог", "Термины", "О компании", "Бриф"]) {
      await expect(navigation.getByRole("link", { name: label }), `${label} at ${width}px`).toBeVisible();
    }
    const navigationGaps = await navigation.locator(":scope > *").evaluateAll((items) =>
      items.slice(1).map((item, index) => item.getBoundingClientRect().left - items[index].getBoundingClientRect().right),
    );
    expect(Math.min(...navigationGaps), `navigation labels stay separate at ${width}px`).toBeGreaterThanOrEqual(3);
    await expect(header.getByRole("button", { name: "Открыть меню" })).toBeHidden();
    await expect(header.locator(".header-phone--desktop")).toBeVisible();
    await expect(header.locator(".header-actions .theme-toggle")).toBeVisible();
    await expect(header.locator(".header-actions .language-link")).toBeVisible();
    if (width > 1020) {
      await expect(header.getByRole("link", { name: "Узнать, что мешает сайту" })).toBeVisible();
    }
    const geometry = await headerInner.evaluate((element) => {
      const logo = element.querySelector<HTMLElement>(".brand-logo")!.getBoundingClientRect();
      const nav = element.querySelector<HTMLElement>(".desktop-nav")!.getBoundingClientRect();
      const actions = element.querySelector<HTMLElement>(".header-actions")!.getBoundingClientRect();
      const inner = element.getBoundingClientRect();
      return {
        logoRight: logo.right,
        navLeft: nav.left,
        navRight: nav.right,
        actionsLeft: actions.left,
        logoCenter: (logo.top + logo.bottom) / 2,
        navCenter: (nav.top + nav.bottom) / 2,
        actionsCenter: (actions.top + actions.bottom) / 2,
        innerTop: inner.top,
        innerBottom: inner.bottom,
        fits: element.scrollWidth <= element.clientWidth,
      };
    });
    expect(geometry.navLeft - geometry.logoRight, `logo and navigation do not overlap at ${width}px`).toBeGreaterThanOrEqual(4);
    expect(geometry.actionsLeft - geometry.navRight, `navigation and actions do not overlap at ${width}px`).toBeGreaterThanOrEqual(4);
    expect(Math.abs(geometry.navCenter - geometry.logoCenter), `logo and navigation share a row at ${width}px`).toBeLessThanOrEqual(8);
    expect(Math.abs(geometry.navCenter - geometry.actionsCenter), `navigation and actions share a row at ${width}px`).toBeLessThanOrEqual(8);
    expect(geometry.innerBottom - geometry.innerTop, `header remains one row at ${width}px`).toBeLessThanOrEqual(80);
    expect(geometry.fits, `header width at ${width}px`).toBe(true);
    const breadcrumbTop = await page.locator("main .breadcrumbs").evaluate((element) =>
      element.firstElementChild?.getBoundingClientRect().top ?? element.getBoundingClientRect().top,
    );
    expect(breadcrumbTop, `breadcrumbs clear the header at ${width}px`).toBeGreaterThan(geometry.innerBottom + 8);
    await page.screenshot({ path: testInfo.outputPath(`floating-header-${width}.png`), fullPage: false });

    await page.evaluate(() => window.scrollTo({ top: 260, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-header-presentation", "compact");
    await expect(navigation).toBeVisible();
    await expect(header.getByRole("button", { name: "Открыть меню" })).toBeHidden();
    const scrolledCenters = await headerInner.evaluate((element) => {
      const logo = element.querySelector<HTMLElement>(".brand-logo")!.getBoundingClientRect();
      const nav = element.querySelector<HTMLElement>(".desktop-nav")!.getBoundingClientRect();
      const actions = element.querySelector<HTMLElement>(".header-actions")!.getBoundingClientRect();
      return [(logo.top + logo.bottom) / 2, (nav.top + nav.bottom) / 2, (actions.top + actions.bottom) / 2];
    });
    expect(Math.max(...scrolledCenters) - Math.min(...scrolledCenters), `scrolled header stays on one row at ${width}px`).toBeLessThanOrEqual(8);
    await page.screenshot({ path: testInfo.outputPath(`floating-header-${width}-scrolled.png`), fullPage: false });
  }

  await expect(page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Кейсы" })).toHaveAttribute("href", "/cases");
});

test("uses the menu only at mobile widths", async ({ page }, testInfo) => {
  for (const width of [390, 700]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    const header = page.locator(".site-header");
    await expect(header.locator(".desktop-nav")).toBeHidden();
    const menuButton = header.getByRole("button", { name: "Открыть меню" });
    await expect(menuButton).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`floating-header-mobile-${width}-closed.png`), fullPage: false });
    await menuButton.click();
    await expect(header.getByRole("dialog", { name: "Мобильное меню" })).toBeVisible();
    await expect(header.getByRole("navigation", { name: "Мобильная навигация" }).getByRole("link", { name: "Кейсы" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`floating-header-mobile-${width}.png`), fullPage: false });
  }
});

test("keeps the same single-row navigation in the light theme", async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  for (const width of [1021, 701]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
    const header = page.locator(".site-header");
    await expect(header.locator(".desktop-nav")).toBeVisible();
    const centers = await header.locator(".header-inner").evaluate((element) => {
      const logo = element.querySelector<HTMLElement>(".brand-logo")!.getBoundingClientRect();
      const nav = element.querySelector<HTMLElement>(".desktop-nav")!.getBoundingClientRect();
      const actions = element.querySelector<HTMLElement>(".header-actions")!.getBoundingClientRect();
      return [(logo.top + logo.bottom) / 2, (nav.top + nav.bottom) / 2, (actions.top + actions.bottom) / 2];
    });
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(8);
    await page.screenshot({ path: testInfo.outputPath(`floating-header-light-${width}.png`) });
  }
});

test("keeps the home headline clear of the full navigation while resizing", async ({ page }, testInfo) => {
  for (const width of [390, 701, 768, 980, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const header = page.locator(".site-header");
    if (width > 700) await expect(header.locator(".desktop-nav")).toBeVisible();
    else await expect(header.getByRole("button", { name: "Открыть меню" })).toBeVisible();
    const headerBottom = await header.evaluate((element) => element.getBoundingClientRect().bottom);
    const headingTop = await page.locator("#hero-title").evaluate((element) => element.getBoundingClientRect().top);
    expect(headingTop, `home headline clears the header at ${width}px`).toBeGreaterThan(headerBottom + 8);
    const leadToOfferGap = await page.locator(".signal-hero .hero-lead").evaluate((lead) => {
      const offer = document.querySelector<HTMLElement>(".signal-hero .hero-offer");
      if (!offer) throw new Error("The hero offer is missing");
      return offer.getBoundingClientRect().top - lead.getBoundingClientRect().bottom;
    });
    expect(leadToOfferGap, `home offer stays below its description at ${width}px`).toBeGreaterThanOrEqual(8);
    await page.screenshot({ path: testInfo.outputPath(`floating-header-home-${width}.png`), fullPage: false });
  }
});
