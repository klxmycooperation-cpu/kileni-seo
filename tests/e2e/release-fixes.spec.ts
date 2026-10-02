import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { load } from "cheerio";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("kileni:intro:welcome:v1", "1");
    localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
  });
});

test("removes every English public entry and keeps Russian search metadata", async ({ request }) => {
  for (const path of ["/en", "/en/about", "/en/brief", "/en/checks/http-status", "/en/glossary/indexing", "/en/articles/website-speed-loading", "/en/audit/bad-token"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/en");
  for (const path of ["/cases/mestoest-ff", "/cases/kamenmis", "/checks/http-status", "/glossary/indexing"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<html lang="ru"');
    expect(html).not.toContain("Страница не найдена — KILENI");
    const $ = load(html);
    expect($('link[hreflang]')).toHaveLength(0);
    expect($('meta[name="robots"]').attr("content") ?? "").not.toMatch(/noindex/iu);
    expect(html).toContain('rel="canonical"');
  }
});

test("preserves the selected service tariff through a real short form and admin view", async ({ page }) => {
  await page.goto("/web-development");
  const card = page.locator('.svc-package-grid article[data-offer-id="development-business"]');
  await card.getByRole("button", { name: "Выбрать", exact: true }).click();
  const form = page.locator(".lead-form");
  const contact = `offer-${Date.now()}@example.test`;
  await expect(form).toContainText("Сайт компании");
  await form.locator('input[name="name"]').fill("Проверка тарифа");
  await form.locator('input[name="contact"]').fill(contact);
  await form.locator('textarea[name="comment"]').fill("Заявка для проверки передачи тарифа");
  await form.locator('input[name="consent"]').check();
  const saved = page.waitForResponse(response => response.url().endsWith("/api/leads") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Отправить заявку" }).click();
  expect((await saved).status()).toBe(201);
  await expect(form.getByRole("status")).toContainText("Заявка сохранена");
  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  await page.goto(`/admin/leads?q=${encodeURIComponent(contact)}`);
  await page.getByRole("link", { name: "Открыть →", exact: true }).click();
  await expect(page.locator("main")).toContainText("Сайт компании (development-business)");
  await expect(page.locator("main")).toContainText(/70\s*000\s*₽/u);
  await expect(page.locator("main")).toContainText("До 5 шаблонов и 10 готовых страниц");
  await page.screenshot({ path: test.info().outputPath("selected-tariff-admin.png"), fullPage: true });
});

test("keeps About headings readable in Light and removes invalid typing labels", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kileni:theme:v1", "light"));
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  const headingColor = await page.locator("#about-story-title .canvas-text").evaluate(element => getComputedStyle(element).backgroundImage);
  expect(headingColor).toContain("220, 231, 255");
  const staggeredBackground = await page.locator(".about-v3-staggered-text").first().evaluate(element => getComputedStyle(element).backgroundImage);
  expect(staggeredBackground).toBe("none");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
});
