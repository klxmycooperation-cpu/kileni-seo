import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences",
      JSON.stringify({ essential: true, analytics: false, marketing: false }),
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
    await expect(page.locator(".marketplace-offer[data-selected='true']")).toHaveCount(1);

    const firstOffer = page.locator(".marketplace-offer").first();
    await firstOffer.getByRole("button", { name: "Выбрать вариант" }).click();
    await expect(firstOffer).toHaveAttribute("data-selected", "true");
    await expect(firstOffer.getByRole("link", { name: /Передать в короткий бриф/u })).toHaveAttribute(
      "href",
      new RegExp(`platform=${platform}.*tier=`, "u"),
    );
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

  await expect(page).toHaveURL(/\/brief\?service=marketplaces&platform=yandex-market&tier=/u);
  await expect(page.locator(".service-choice button[aria-pressed='true']")).toContainText("Маркетплейсы");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByRole("button", { name: /^Далее/u }).click();
  await expect(page.getByLabel(/Площадка/u)).toHaveValue("yandex-market");

  await page.goto("/seo-audit");
  const serviceTier = page.locator(".svc-package-grid > article").nth(1);
  const serviceTierName = (await serviceTier.getByRole("heading", { level: 3 }).textContent())?.trim() ?? "";
  await serviceTier.getByRole("button", { name: "Выбрать уровень" }).click();
  await expect(serviceTier).toHaveAttribute("data-selected", "true");
  await serviceTier.getByRole("link", { name: "Перейти к заявке" }).click();
  await expect(page.locator("#request input[name='selectedTier']")).toHaveValue(serviceTierName);
});

test("keeps marketplace commerce inside a 390px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/marketplaces/wildberries", "/marketplaces/megamarket", "/en/marketplaces/yandex-market"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.locator(".marketplace-offer")).toHaveCount(3);
  }
});
