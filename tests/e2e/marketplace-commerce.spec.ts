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
  for (const platform of ["wildberries", "ozon", "yandex-market", "megamarket"]) {
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
  for (const [platform, name] of [["yandex-market", "Yandex Market"], ["megamarket", "Megamarket"]] as const) {
    await page.goto(`/en/marketplaces/${platform}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.locator(".marketplace-docs a").first()).toBeVisible();
    await expect(page.locator(".marketplace-docs a").first()).toHaveAttribute("href", /^https:\/\//u);
    await expect(page.locator("main")).not.toContainText(/[А-Яа-яЁё]/u);
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

  for (const path of ["/marketplaces/wildberries", "/marketplaces/megamarket", "/en/marketplaces/yandex-market"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.locator(".marketplace-offer")).toHaveCount(3);
  }
});
