import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
});

test("uses the same editorial scale for equivalent public-page elements", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const titles = [await fontSizeOf(page, ".signal-hero h1")];
  const sectionTitles = [await fontSizeOf(page, ".home-10 .home-section-heading h2")];

  await page.goto("/seo", { waitUntil: "domcontentloaded" });
  titles.push(await fontSizeOf(page, ".seo-hub__hero h1"));
  sectionTitles.push(await fontSizeOf(page, ".seo-hub__section-heading h2"));
  const directionCard = await readCardMetrics(page.locator(".seo-hub__direction").first(), ".services-hub__button");

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  titles.push(await fontSizeOf(page, ".pricing-10 .cp-hero h1"));
  sectionTitles.push(await fontSizeOf(page, ".pricing-10 .cp-section-intro h2"));
  const prices = [await fontSizeOf(page, ".pricing-10 .cp-tier-card-price > strong")];
  const pricingCard = await readCardMetrics(page.locator(".pricing-10 .cp-tier-card").first(), ".cp-tier-card-action");

  await page.goto("/marketplaces", { waitUntil: "domcontentloaded" });
  titles.push(await fontSizeOf(page, ".marketplace-hero h1"));

  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });
  prices.push(await fontSizeOf(page, ".svc-package-price"));

  await page.goto("/marketplaces/wildberries", { waitUntil: "domcontentloaded" });
  prices.push(await fontSizeOf(page, ".marketplace-offer-price"));

  expectSameRole(titles, "page titles");
  expectSameRole(sectionTitles, "section titles");
  expectSameRole(prices, "package prices");

  expect(pricingCard.radius, "repeated cards use the same corner radius").toBeCloseTo(directionCard.radius, 1);
  expect(pricingCard.actionHeight, "primary card actions use the same height").toBeCloseTo(directionCard.actionHeight, 1);
});

test("uses one page-title scale across every public marketing route", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  const titleSizes: number[] = [];
  for (const path of ["/", "/seo", "/pricing", "/marketplaces", "/seo-audit", "/seo-promotion", "/about", "/brief", "/blog", "/glossary", "/contacts", "/cases"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    titleSizes.push(await fontSizeOf(page, "main h1"));
  }

  expectSameRole(titleSizes, "public page titles");
});

test("uses one section-heading scale across public marketing pages", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const headingSizes = [
    await fontSizeOf(page, ".home-entry-route__heading h2"),
    await fontSizeOf(page, ".home-10 .home-section-heading h2"),
    await fontSizeOf(page, ".home-decision__intro h2"),
  ];

  await page.goto("/seo", { waitUntil: "domcontentloaded" });
  headingSizes.push(await fontSizeOf(page, ".seo-hub__section-heading h2"));

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  headingSizes.push(
    await fontSizeOf(page, ".cp-section-intro h2"),
    await fontSizeOf(page, ".cp-extras-grid h2"),
  );

  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });
  headingSizes.push(
    await fontSizeOf(page, ".svc-compact-heading h2"),
    await fontSizeOf(page, ".svc-section-heading h2"),
  );

  await page.goto("/about", { waitUntil: "domcontentloaded" });
  headingSizes.push(await fontSizeOf(page, ".about-section-heading h2"));

  await page.goto("/brief", { waitUntil: "domcontentloaded" });
  headingSizes.push(await fontSizeOf(page, ".brief-download-heading h2"));

  expectSameRole(headingSizes, "section headings");
});

test("keeps an estimate in the brief compact instead of promoting it to a package price", async ({ page }) => {
  await page.goto("/brief", { waitUntil: "domcontentloaded" });

  const choicePrice = await fontSizeOf(page, ".brief-choice-price");
  expect(choicePrice, "brief choice prices stay a supporting line, not a display heading").toBeLessThan(20);
});

test("uses one card-title scale in repeatable content cards", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const cardTitles: number[] = [];

  await page.goto("/", { waitUntil: "domcontentloaded" });
  cardTitles.push(await fontSizeOf(page, ".home-article-carousel__body h3"));

  await page.goto("/seo", { waitUntil: "domcontentloaded" });
  cardTitles.push(await fontSizeOf(page, ".seo-hub__direction h2"));

  await page.goto("/blog", { waitUntil: "domcontentloaded" });
  cardTitles.push(await fontSizeOf(page, ".article-card-copy h2"));

  await page.goto("/glossary", { waitUntil: "domcontentloaded" });
  cardTitles.push(await fontSizeOf(page, ".glossary-item h3"));

  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  cardTitles.push(await fontSizeOf(page, ".cp-narrative-header h2"));

  expectSameRole(cardTitles, "repeatable card titles");
});

test("keeps readable word gaps in display headings across public pages", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1080 });

  for (const path of ["/", "/seo", "/pricing", "/marketplaces", "/about", "/brief", "/blog", "/cases"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const headings = await page.locator("main h1, main h2, main h3").evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const fontSize = Number.parseFloat(getComputedStyle(node).fontSize);
          return rect.width > 0 && rect.height > 0 && fontSize >= 23;
        })
        .map((node) => {
          const style = getComputedStyle(node);
          const fontSize = Number.parseFloat(style.fontSize);
          return {
            text: node.textContent?.trim().slice(0, 70) ?? "",
            ratio: Number.parseFloat(style.wordSpacing) / fontSize,
          };
        }),
    );

    expect(headings.length, `${path} exposes display headings`).toBeGreaterThan(0);
    for (const heading of headings) {
      expect(heading.ratio, `${path}: ${heading.text}`).toBeCloseTo(.065, 2);
    }
  }
});

async function fontSizeOf(page: Page, selector: string) {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();
  return fontSize(element);
}

async function fontSize(locator: Locator) {
  return locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
}

async function readCardMetrics(card: Locator, actionSelector: string) {
  return card.evaluate((node, selector) => {
    const style = getComputedStyle(node);
    const action = node.querySelector(selector);
    if (!(action instanceof HTMLElement)) throw new Error("Expected a card action");
    return {
      radius: Number.parseFloat(style.borderTopLeftRadius),
      actionHeight: action.getBoundingClientRect().height,
    };
  }, actionSelector);
}

function expectSameRole(values: number[], role: string) {
  expect(Math.max(...values) - Math.min(...values), `${role}: ${values.join(", ")}px`).toBeLessThanOrEqual(.2);
}
