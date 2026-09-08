import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("shows a concrete result and three selectable offers for every marketplace", async ({ page }) => {
  for (const platform of ["wildberries", "ozon", "yandex-market"]) {
    await page.goto(`/marketplaces/${platform}`);

    await expect(page.getByRole("heading", { level: 2, name: /Три варианта/u })).toBeVisible();
    await expect(page.locator(".marketplace-result-states article")).toHaveCount(2);
    await expect(page.locator(".marketplace-result-files > div")).toHaveCount(5);
    await expect(page.locator(".marketplace-offer")).toHaveCount(3);
    await expect(page.locator(".marketplace-offer details")).toHaveCount(0);
    await expect(page.locator(".marketplace-offer__included")).toHaveCount(3);
    await expect(page.locator(".marketplace-offer[data-selected='true']")).toHaveCount(1);

    const firstOffer = page.locator(".marketplace-offer").first();
    await firstOffer.getByRole("button", { name: "Выбрать вариант" }).click();
    await expect(firstOffer).toHaveAttribute("data-selected", "true");
    await expect(firstOffer.getByRole("button", { name: "Выбрано", exact: true })).toHaveCount(0);
    await expect(firstOffer.getByRole("link", { name: /Передать в короткий бриф/u })).toHaveAttribute(
      "href",
      new RegExp(`offer=marketplace-${platform}-audit$`, "u"),
    );
  }
});

test("keeps the after-state readable in every theme", async ({ page }) => {
  for (const theme of ["light", "dark", "signal"] as const) {
    await page.addInitScript((value) => window.localStorage.setItem("kileni:theme:v1", value), theme);
    await page.goto("/marketplaces/ozon");
    const ratio = await page.locator(".marketplace-result-states article[data-after]").evaluate((card) => {
      const parse = (value: string) => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
      const luminance = (value: string) => {
        const channels = parse(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
        });
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      const foreground = luminance(getComputedStyle(card.querySelector("h3")!).color);
      const background = luminance(getComputedStyle(card).backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
    expect(ratio, theme).toBeGreaterThanOrEqual(4.5);
  }
});

test("keeps English marketplace names and official links fully localized", async ({ page }) => {
  for (const [platform, name] of [["yandex-market", "Yandex Market"]] as const) {
    await page.goto(`/en/marketplaces/${platform}`);
    await expect(page.getByRole("heading", { level: 1, name: `${name} product listing services` })).toBeVisible();
    await expect(page.locator(".marketplace-docs a").first()).toBeVisible();
    await expect(page.locator(".marketplace-docs a").first()).toHaveAttribute("href", /^https:\/\//u);
    await expect(page.locator("main")).not.toContainText(/[А-Яа-яЁё]/u);
  }
});

test("uses exact marketplace H1s and complete visible breadcrumbs", async ({ page }) => {
  await page.goto("/marketplaces");
  await expect(page.getByRole("heading", { level: 1, name: "Оформление карточек товаров для маркетплейсов" })).toBeVisible();
  await expect(page.locator(".marketplace-card")).toHaveCount(3);

  await page.goto("/marketplaces/ozon");
  await expect(page.getByRole("heading", { level: 1, name: "Оформление карточек Ozon" })).toBeVisible();
  const breadcrumbs = page.getByRole("navigation", { name: "Хлебные крошки" });
  await expect(breadcrumbs).toContainText("Главная");
  await expect(breadcrumbs.getByRole("link", { name: "Маркетплейсы" })).toHaveAttribute("href", "/marketplaces");
  await expect(breadcrumbs.getByText("Ozon", { exact: true })).toHaveAttribute("aria-current", "page");
  const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent ?? "{}")));
  const breadcrumbSchema = schemas.find((schema) => schema["@type"] === "BreadcrumbList");
  expect(breadcrumbSchema?.itemListElement.map((item: { item?: string }) => item.item && new URL(item.item).pathname)).toEqual([
    "/",
    "/marketplaces",
    "/marketplaces/ozon",
  ]);
});

test("redirects the retired Megamarket routes once to the marketplace overview", async ({ request }) => {
  for (const [source, target] of [["/marketplaces/megamarket", "/marketplaces"], ["/en/marketplaces/megamarket", "/en/marketplaces"]] as const) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(target);
    const destination = await request.get(target, { maxRedirects: 0 });
    expect(destination.status()).toBe(200);
  }
});

test("carries the selected marketplace and service tier into the brief", async ({ page }) => {
  await page.goto("/marketplaces/yandex-market");
  const selectedOffer = page.locator(".marketplace-offer[data-selected='true']");
  const briefLink = selectedOffer.getByRole("link", { name: /Передать в короткий бриф/u });
  await briefLink.click();

  await expect(page).toHaveURL(/\/brief\?offer=marketplace-yandex-market-optimization$/u);
  await expect(page.locator(".brief-service-guide")).toContainText("Яндекс Маркет");
  await expect(page.locator(".brief-service-guide")).toContainText(/4\s*900\s*₽ за артикул/u);
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Компания или проект").fill("Тестовый магазин");
  await page.getByLabel("Что сейчас не устраивает?").fill("Карточки сложно сравнивать");
  await page.getByLabel("Какой результат нужен?").fill("Понятные карточки для покупателей");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await expect(page.getByLabel(/Площадка/u)).toHaveValue("yandex-market");

  await page.goto("/seo-audit");
  const serviceTier = page.locator(".svc-package-grid > article").nth(1);
  const serviceTierName = (await serviceTier.getByRole("heading", { level: 3 }).textContent())?.trim() ?? "";
  await serviceTier.getByRole("button", { name: "Выбрать" }).click();
  await expect(serviceTier).toHaveAttribute("data-selected", "true");
  await serviceTier.getByRole("link", { name: "Продолжить с этим вариантом" }).click();
  await expect(page).toHaveURL(/\/brief\?offer=seo-audit-200$/u);
  await expect(page.locator(".brief-service-guide")).toContainText(serviceTierName);
});

test("keeps marketplace commerce inside a 390px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/marketplaces/wildberries", "/marketplaces/ozon", "/en/marketplaces/yandex-market"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.locator(".marketplace-offer")).toHaveCount(3);
  }
});

test("keeps the three marketplace overview cards in one row at tablet widths", async ({ page }) => {
  for (const width of [768, 1024] as const) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto("/marketplaces");

    const geometry = await page.locator(".marketplace-card").evaluateAll((cards) => cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, width: rect.width };
    }));
    expect(geometry, `${width}px`).toHaveLength(3);
    expect(Math.max(...geometry.map((card) => card.top)) - Math.min(...geometry.map((card) => card.top)), `${width}px`).toBeLessThan(2);
    expect(new Set(geometry.map((card) => Math.round(card.left))).size, `${width}px`).toBe(3);
    expect(geometry.every((card) => card.width > 0 && card.right <= width + 1), `${width}px`).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px`)
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth) + 1);
  }
});
