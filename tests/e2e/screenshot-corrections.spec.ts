import { expect, test, type Locator, type Page } from "@playwright/test";

async function selectLightTheme(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.kileniTheme = "light";
    window.localStorage.setItem("kileni-theme", "light");
  });
}

async function topSpread(locator: Locator) {
  const tops = await locator.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
  return Math.max(...tops) - Math.min(...tops);
}

async function computedRadius(locator: Locator) {
  return locator.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));
}

test.describe("правки по скриншотам 2026-09-06", () => {
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

  test("тарифные карточки услуг используют человеческие подписи и общую вертикальную сетку", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/web-development");
    await selectLightTheme(page);

    const cards = page.locator(".svc-package-grid > article");
    await expect(cards).toHaveCount(3);
    await expect(page.getByText("ПРЕДЕЛ", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Одна услуга · один язык", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Одна услуга на одном языке", { exact: true })).toBeVisible();
    expect(await topSpread(cards.locator(".svc-package-limit"))).toBeLessThanOrEqual(3);
    expect(await topSpread(cards.locator(":scope > strong"))).toBeLessThanOrEqual(3);
  });

  test("карточки SEO-аудита и Wildberries выровнены, а действия не дублируются", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/seo-audit");
    await selectLightTheme(page);

    const serviceCards = page.locator(".svc-package-grid > article");
    expect(await topSpread(serviceCards.locator(".svc-package-limit"))).toBeLessThanOrEqual(3);
    expect(await topSpread(serviceCards.locator(":scope > strong"))).toBeLessThanOrEqual(3);

    await page.goto("/marketplaces/wildberries");
    await selectLightTheme(page);
    const marketplaceCards = page.locator(".marketplace-offer");
    await expect(marketplaceCards).toHaveCount(3);
    expect(await topSpread(marketplaceCards.locator(":scope > strong"))).toBeLessThanOrEqual(3);
    await marketplaceCards.nth(0).getByRole("button", { name: "Выбрать вариант" }).click();
    await expect(marketplaceCards.nth(0).getByRole("link", { name: /Передать в короткий бриф/ })).toBeVisible();
    await expect(marketplaceCards.nth(0).getByRole("button", { name: "Выбрано" })).toHaveCount(0);
  });

  test("крупные заголовки сохраняют смысловые строки", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/seo");
    const seoTitle = page.locator(".seo-hub__hero h1");
    const seoFontSize = await seoTitle.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(seoFontSize).toBeLessThanOrEqual(84);

    await page.goto("/web-development");
    const developmentTitle = page.locator(".svc-detail-copy h1");
    const titleMetrics = await developmentTitle.evaluate((element) => {
      const style = getComputedStyle(element);
      return { height: element.getBoundingClientRect().height, lineHeight: Number.parseFloat(style.lineHeight) };
    });
    expect(titleMetrics.height / titleMetrics.lineHeight).toBeLessThanOrEqual(3.2);
  });

  test("главная переключает три формата и показывает четыре законченных этапа", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    const decision = page.locator(".home-decision");
    const tabs = decision.getByRole("tablist", { name: "Выбор формата работы" }).getByRole("tab");
    const panels = decision.locator(".home-decision__panel");

    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(panels.nth(0).getByRole("heading", { name: "Бесплатная проверка" })).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
    await expect(panels.nth(2)).toBeHidden();
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(panels.nth(2).getByRole("heading", { name: "Аудит и внедрение" })).toBeVisible();
    await expect(panels.nth(0)).toBeHidden();
    await expect(panels.nth(1)).toBeHidden();

    const deliverySteps = page.locator(".home-deliverable-list > li");
    await expect(deliverySteps).toHaveCount(4);
    await expect(deliverySteps.nth(3)).toContainText("Повторно проверяем");
  });

  test("карточки статей имеют изображения и карусель начинается без обрезания", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator(".home-article-carousel")).toBeAttached();
    await page.evaluate(() => document.querySelector(".home-article-carousel")?.scrollIntoView({ block: "center" }));
    const carousel = page.locator(".home-article-carousel__viewport");
    const cards = carousel.locator("[data-article-card]");
    await expect(carousel).toBeVisible();
    await expect(cards.first()).toBeVisible();
    const geometry = await carousel.evaluate((element) => ({ left: element.getBoundingClientRect().left, scrollLeft: element.scrollLeft }));
    const firstCardLeft = await cards.first().evaluate((element) => element.getBoundingClientRect().left);
    expect(geometry.scrollLeft).toBeLessThanOrEqual(4);
    expect(firstCardLeft).toBeGreaterThanOrEqual(geometry.left - 1);
    const images = cards.locator("img");
    await expect.poll(() => images.first().evaluate((element) => {
      const image = element as HTMLImageElement;
      return image.complete && image.naturalWidth > 0;
    })).toBe(true);
    const imageUrls = await images.evaluateAll((elements) => elements.map((element) => {
      const image = element as HTMLImageElement;
      return image.currentSrc || image.src;
    }));
    for (const imageUrl of imageUrls) {
      expect((await page.request.get(imageUrl)).status()).toBe(200);
    }
  });

  test("кейсы используют цельные скруглённые блоки и непротиворечивую нумерацию", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/cases/eco-santeh");
    expect(await computedRadius(page.locator(".cp-case-detail-title .cp-fact-strip"))).toBeGreaterThanOrEqual(12);
    expect(await computedRadius(page.locator(".cp-evidence-list"))).toBeGreaterThanOrEqual(12);
    await expect(page.locator(".cp-story-pair .cp-action-list > li > span")).toHaveCount(0);

    await page.goto("/cases");
    const caseCards = page.locator(".cp-narrative-case");
    await expect(caseCards).toHaveCount(2);
    expect(await computedRadius(caseCards.first())).toBeGreaterThanOrEqual(12);
    expect(await computedRadius(caseCards.first().locator(".cp-narrative-result"))).toBeGreaterThanOrEqual(12);
  });

  test("custom task и бриф не дробят слова на мобильном", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/custom-task");
    const customIntro = page.locator(".svc-custom-path__intro");
    const introLayout = await customIntro.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(introLayout).toBe(1);
    for (const selector of [".svc-custom-path__intro > p", ".svc-custom-path h3", ".svc-custom-path li p", "h1"]) {
      const wrapping = await page.locator(selector).first().evaluate((element) => {
        const style = getComputedStyle(element);
        return { overflowWrap: style.overflowWrap, wordBreak: style.wordBreak };
      });
      expect(wrapping).toEqual({ overflowWrap: "normal", wordBreak: "normal" });
    }

    await page.goto("/brief?service=custom-task");
    const summary = page.locator(".brief-service-summary");
    if (await summary.count()) {
      const columns = await summary.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
      expect(columns).toBe(1);
      const titleWrapping = await summary.locator("strong").evaluate((element) => {
        const style = getComputedStyle(element);
        return { overflowWrap: style.overflowWrap, wordBreak: style.wordBreak };
      });
      expect(titleWrapping).toEqual({ overflowWrap: "normal", wordBreak: "normal" });
    }
  });

  test("brief, pricing, about и marketplace используют ровные составные блоки", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto("/brief");
    await expect(page.locator(".brief-hero-note")).toContainText("После брифа вы получите");
    expect(await computedRadius(page.locator(".brief-hero-note"))).toBeGreaterThanOrEqual(12);

    await page.goto("/pricing?category=seo-audit&offer=seo-audit-200");
    const exclusions = page.locator(".cp-package-exclusions");
    await exclusions.locator("summary").click();
    expect(await computedRadius(exclusions)).toBeGreaterThanOrEqual(12);

    await page.goto("/about");
    const headingLeft = await page.locator(".about-boundaries .about-section-heading h2").evaluate((element) => Math.round(element.getBoundingClientRect().left));
    const cardsLeft = await page.locator(".about-boundary-grid").evaluate((element) => Math.round(element.getBoundingClientRect().left));
    expect(Math.abs(headingLeft - cardsLeft)).toBeLessThanOrEqual(3);

    await page.goto("/marketplaces/wildberries");
    const toc = page.locator(".compact-page-toc ol");
    const tocLayout = await toc.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(tocLayout).not.toBe("none");
    const docs = page.locator(".marketplace-docs");
    const cta = page.locator(".marketplace-cta");
    const [docsPadding, ctaPadding] = await Promise.all([docs, cta].map((locator) => locator.evaluate((element) => getComputedStyle(element).paddingLeft)));
    expect(docsPadding).toBe(ctaPadding);
  });
});
