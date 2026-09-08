import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
    window.localStorage.removeItem("kileni-brief");
    window.localStorage.removeItem("kileni-brief:v2");
  });
});

test("serves a real SEO hub instead of redirecting to promotion", async ({ page }) => {
  await page.goto("/seo");

  await expect(page).toHaveURL(/\/seo$/u);
  await expect(page.getByRole("heading", { level: 1, name: "SEO-аудит или продвижение — выберите нужный следующий шаг" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Посмотреть SEO-аудит/u })).toHaveAttribute("href", "/seo-audit");
  await expect(page.getByRole("link", { name: /Посмотреть SEO-продвижение/u })).toHaveAttribute("href", "/seo-promotion");
  await expect(page.locator("[data-seo-step]" )).toHaveCount(4);
  await expect(page.getByRole("navigation", { name: "Хлебные крошки" }).getByText("SEO", { exact: true })).toHaveAttribute("aria-current", "page");
  const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent ?? "{}")));
  const breadcrumbSchema = schemas.find((schema) => schema["@type"] === "BreadcrumbList");
  expect(breadcrumbSchema?.itemListElement.at(-1)?.item && new URL(breadcrumbSchema.itemListElement.at(-1).item).pathname).toBe("/seo");
});

test("keeps pricing category and exact offer in URL, reload and browser history", async ({ page }) => {
  await page.goto("/pricing?category=web-development&offer=development-business");

  await expect(page.locator("#pricing-tab-web-development")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('button[data-offer-id="development-business"]')).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("heading", { level: 1, name: "Какой сайт нужно сделать?" })).toBeVisible();
  await expect(page.locator('[data-detail-offer-id="development-business"] a')).toHaveAttribute("href", "/brief?offer=development-business");

  await page.reload();
  await expect(page.locator('button[data-offer-id="development-business"]')).toHaveAttribute("data-selected", "true");

  await page.locator("#pricing-tab-yandex-ads").click();
  await expect(page).toHaveURL(/category=yandex-ads&offer=yandex-ads-setup/u);
  await expect(page.locator('button[data-offer-id="yandex-ads-setup"]')).toHaveAttribute("data-selected", "true");

  await page.locator('button[data-offer-id="yandex-ads-support"]').click();
  await expect(page).toHaveURL(/category=yandex-ads&offer=yandex-ads-support/u);
  await page.goBack();
  await expect(page.locator('button[data-offer-id="yandex-ads-setup"]')).toHaveAttribute("data-selected", "true");
  await page.goBack();
  await expect(page.locator('button[data-offer-id="development-business"]')).toHaveAttribute("data-selected", "true");
});

test("shows an explicit pricing error for an unknown offer without fallback", async ({ page }) => {
  await page.goto("/pricing?category=seo-audit&offer=missing-offer");

  await expect(page.getByRole("status")).toContainText("Тариф не найден");
  await expect(page.locator(".cp-tier-switch [data-selected=true]")).toHaveCount(0);
  await expect(page.locator(".cp-package")).toHaveCount(0);
});

test("uses one dynamic pricing detail and keeps hover or focus previews temporary", async ({ page }) => {
  await page.goto("/pricing?category=seo-audit&offer=seo-audit-200");

  const recommended = page.locator('button[data-offer-id="seo-audit-200"]');
  const alternative = page.locator('button[data-offer-id="seo-audit-50"]');
  const pricingSurface = page.locator(".cp-package-list");
  await expect(page.locator(".cp-package")).toHaveCount(1);
  await expect(page.locator('[data-detail-offer-id="seo-audit-200"]')).toBeVisible();
  const selectedHeight = await pricingSurface.evaluate((node) => node.getBoundingClientRect().height);

  await alternative.hover();
  await expect(page.locator('[data-detail-offer-id="seo-audit-50"]')).toBeVisible();
  const previewHeight = await pricingSurface.evaluate((node) => node.getBoundingClientRect().height);
  expect(previewHeight).toBe(selectedHeight);
  await expect(alternative).toHaveAttribute("data-selected", "false");
  await page.locator(".cp-category-panel > header").hover();
  await expect(page.locator('[data-detail-offer-id="seo-audit-200"]')).toBeVisible();

  await alternative.focus();
  await expect(page.locator('[data-detail-offer-id="seo-audit-50"]')).toBeVisible();
  await alternative.press("Tab");
  await expect(page.locator('[data-detail-offer-id="seo-audit-200"]')).toBeVisible();

  await alternative.focus();
  await alternative.press("Enter");
  await expect(page).toHaveURL(/category=seo-audit&offer=seo-audit-50/u);
  await expect(alternative).toHaveAttribute("data-selected", "true");
  await expect(recommended).toHaveAttribute("data-selected", "false");
  await expect(page.locator('[data-detail-offer-id="seo-audit-50"]')).toBeVisible();

  await alternative.press("ArrowRight");
  await expect(recommended).toBeFocused();
  await expect(page.locator('[data-detail-offer-id="seo-audit-200"]')).toBeVisible();
  await recommended.press("Space");
  await expect(page).toHaveURL(/category=seo-audit&offer=seo-audit-200/u);
  await expect(recommended).toHaveAttribute("data-selected", "true");
});

test("keeps seo-audit-200 price, scope and duration through pricing, history, reload and summary", async ({ page }) => {
  await page.goto("/pricing");
  const offer = page.locator('button[data-offer-id="seo-audit-200"]');
  await expect(offer).toContainText(/39\s*900\s*₽/u);
  await offer.click();
  await page.locator('[data-detail-offer-id="seo-audit-200"]').getByRole("link", { name: /Перейти к брифу/u }).click();

  await expect(page).toHaveURL(/\/brief\?offer=seo-audit-200$/u);
  const guide = page.locator(".brief-service-guide");
  await expect(guide).toContainText("Аудит до 200 страниц");
  await expect(guide).toContainText(/39\s*900\s*₽/u);
  await expect(guide).toContainText("До 200 страниц");
  await expect(guide).toContainText("5–7 рабочих дней");
  await expect(guide).toContainText("Цена фиксирована для указанного объёма");
  await expect(guide.getByRole("link", { name: "Изменить тариф" })).toHaveAttribute(
    "href",
    "/pricing?category=seo-audit&offer=seo-audit-200",
  );

  await page.reload();
  await expect(guide).toContainText(/39\s*900\s*₽/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/pricing\?category=seo-audit&offer=seo-audit-200$/u);
  await page.goForward();
  await expect(page).toHaveURL(/\/brief\?offer=seo-audit-200$/u);
  await expect(guide).toContainText(/39\s*900\s*₽/u);

  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Компания или проект").fill("Тестовый проект");
  await page.getByLabel("Что сейчас не устраивает?").fill("Нужно понять причины");
  await page.getByLabel("Какой результат нужен?").fill("План исправлений");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Ссылка на сайт").fill("https://example.ru");
  await page.getByLabel("Что беспокоит?").fill("Страницы плохо находят");
  await page.getByRole("button", { name: /^Далее/u }).click();

  const review = page.locator(".brief-review");
  await expect(review).toContainText("Аудит до 200 страниц");
  await expect(review).toContainText(/39\s*900\s*₽/u);
  await expect(review).toContainText("До 200 страниц");
  await expect(review).toContainText("5–7 рабочих дней");
});

test("explicit offer in the URL overrides an older draft without a cheapest-offer fallback", async ({ page }) => {
  await page.goto("/brief");
  await page.evaluate(() => {
    localStorage.setItem("kileni-brief:v2", JSON.stringify({
      version: 2,
      service: "audit",
      offerId: "seo-audit-50",
      answers: { company: "Старый черновик" },
      step: 0,
    }));
  });

  await page.goto("/brief?offer=seo-audit-200");
  const guide = page.locator(".brief-service-guide");
  await expect(guide).toContainText("Аудит до 200 страниц");
  await expect(guide).toContainText(/39\s*900\s*₽/u);

  await page.goto("/brief?offer=missing-offer");
  await expect(page.getByRole("status")).toContainText("предложение не найдено");
  await expect(page.locator(".brief-service-guide")).not.toContainText(/24\s*900\s*₽/u);
});

test("keeps an explicit offer for the same direction and clears it after a deliberate direction change", async ({ page }) => {
  await page.goto("/brief?offer=seo-audit-200");

  const auditDirection = page.getByRole("button", { name: /SEO-аудит/u });
  const seoDirection = page.getByRole("button", { name: /SEO и продвижение/u });
  const guide = page.locator(".brief-service-guide");

  await expect(guide).toContainText("Аудит до 200 страниц");
  await auditDirection.click();
  await expect(page).toHaveURL(/\/brief\?offer=seo-audit-200$/u);
  await expect(guide).toContainText("Аудит до 200 страниц");

  await seoDirection.click();
  await expect(page).toHaveURL(/\/brief$/u);
  await expect(guide).toContainText("SEO и продвижение");
  await expect(guide).toContainText("Стоимость после короткого брифа");
  await expect(guide).not.toContainText("Аудит до 200 страниц");

  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem("kileni-brief:v2");
    return raw ? JSON.parse(raw) : null;
  })).toMatchObject({ service: "seo" });
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem("kileni-brief:v2");
    return raw ? Object.hasOwn(JSON.parse(raw), "offerId") : true;
  })).toBe(false);
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem("kileni-brief:v2");
    return raw ? JSON.parse(raw)?.answers : null;
  })).not.toHaveProperty("sourceOffer");

  await page.reload();
  await expect(page).toHaveURL(/\/brief$/u);
  await expect(guide).toContainText("SEO и продвижение");
  await expect(guide).not.toContainText("Аудит до 200 страниц");
});

test("custom task asks for a brief instead of promising a ready price", async ({ page }) => {
  await page.goto("/custom-task");

  await expect(page.getByRole("heading", { level: 1, name: "Опишите задачу — предложим формат работы" })).toBeVisible();
  await expect(page.locator(".svc-detail-copy")).toContainText("Состав, срок и стоимость определим после короткого брифа");
  await expect(page.locator("main")).not.toContainText("Выберите объём — цена и результат уже указаны");

  const briefLink = page.getByRole("link", { name: /Описать задачу в коротком брифе/u });
  await expect(briefLink).toHaveAttribute("href", "/brief?service=custom-task");
  await briefLink.click();
  await expect(page).toHaveURL(/\/brief\?service=custom-task$/u);
  await expect(page.getByRole("button", { name: /Нестандартная задача/u })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".brief-service-guide")).toContainText("Нестандартная задача");

  await page.reload();
  await expect(page).toHaveURL(/\/brief\?service=custom-task$/u);
  await expect(page.getByRole("button", { name: /Нестандартная задача/u })).toHaveAttribute("aria-pressed", "true");
});
