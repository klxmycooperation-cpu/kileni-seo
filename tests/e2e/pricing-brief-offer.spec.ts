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

test("keeps seo-audit-200 price, scope and duration through pricing, history, reload and summary", async ({ page }) => {
  await page.goto("/pricing");
  const offer = page.locator('[data-offer-id="seo-audit-200"]');
  await expect(offer).toContainText(/39\s*900\s*₽/u);
  await offer.getByRole("button", { name: "Выбрать", exact: true }).click();
  await offer.getByRole("link", { name: /Перейти к брифу/u }).click();

  await expect(page).toHaveURL(/\/brief\?offer=seo-audit-200$/u);
  const guide = page.locator(".brief-service-guide");
  await expect(guide).toContainText("Аудит до 200 страниц");
  await expect(guide).toContainText(/39\s*900\s*₽/u);
  await expect(guide).toContainText("До 200 страниц");
  await expect(guide).toContainText("5–7 рабочих дней");

  await page.reload();
  await expect(guide).toContainText(/39\s*900\s*₽/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/pricing$/u);
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
});
