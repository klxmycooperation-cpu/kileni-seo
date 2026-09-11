import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { articleSlugs } from "../../src/content/articles";
import { glossaryTerms } from "../../src/content/glossary";
import { auditCheckSlugs } from "../../src/content/audit-checks";

const evidence = resolve("work/browser-qa/final-sept11");

test("team section does not clip the first letter of its label", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator(".about-roles-grid")).toHaveCSS("overflow", "visible");
  await expect(page.locator(".about-deliverables-grid")).toHaveCSS("overflow", "visible");
});

test("glossary links stay in the same text column inside service lists", async ({ page }) => {
  await page.goto("/en/web-development");
  const item = page.locator(".svc-compact-grid article").first().locator("li").first();
  await expect(item.locator(":scope > span")).toContainText("You need a landing page or corporate website");
  await expect(item.locator("span a.glossary-inline-term")).toBeVisible();
});

test("all public RU and EN routes have readable metadata and a single main heading", async ({ request }) => {
  test.setTimeout(600_000);
  const { load } = await import("cheerio");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const map = load(await sitemap.text(), { xml: true });
  const publicRoutes = map("url > loc").map((_, element) => new URL(map(element).text()).pathname.replace(/^\/en(?:\/|$)|^\//u, "").replace(/\/$/u, "")).get();
  const routes = [...new Set([
    ...publicRoutes, "checks", ...articleSlugs.map(slug => `blog/${slug}`),
    ...glossaryTerms.map(term => `glossary/${term.slug}`), ...auditCheckSlugs.map(slug => `checks/${slug}`),
  ])];
  for (const locale of ["ru", "en"]) {
    for (const route of routes) {
      const path = `${locale === "en" ? "/en" : ""}/${route}`;
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const $ = load(await response.text());
      expect($("html").attr("lang"), path).toBe(locale);
      expect($("h1").length, path).toBe(1);
      expect($("h1").text().trim().length, path).toBeGreaterThan(0);
      expect($("title").text().trim().length, path).toBeGreaterThan(4);
      expect($("meta[name=description]").attr("content")?.length, path).toBeGreaterThan(10);
      expect($("link[rel=canonical]").attr("href"), path).toBeTruthy();
      expect($("meta[property='og:title']").attr("content"), path).toBeTruthy();
      expect($("main").text(), path).not.toMatch(/один сигнал|одна скорость|один результат|одна точка|Ваш сайт имеет серьезные проблемы|Поисковые системы накажут сайт/iu);
      expect($("img:not([alt])").length, path).toBe(0);
    }
  }
  console.log(`Public route checks: ${routes.length * 2}`);
});

for (const theme of ["dark", "signal", "light"]) {
  for (const width of [390, 1440]) {
    test(`revised copy and images: ${theme}, ${width}px, RU/EN`, async ({ page }) => {
      test.setTimeout(180_000);
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem("kileni:theme:v1", selectedTheme);
        sessionStorage.setItem("kileni:intro:v9", "1");
        localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
      }, theme);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      for (const locale of ["ru", "en"]) {
        const prefix = locale === "ru" ? "" : "/en";
        for (const route of ["web-development", "seo-audit", "seo-promotion", "yandex-ads", "content-materials", "custom-task", "about", "blog", "free-audit", "services", ""]) {
          await page.goto(`${prefix}/${route}`);
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme);
          await expect(page.locator("h1")).toBeVisible();
          const hasOverview = await page.locator(".svc-compact-overview").count();
          const target = route === "about" ? ".about-roles" : hasOverview ? ".svc-compact-overview" : "h1";
          await page.locator(target).scrollIntoViewIfNeeded();
          await page.mouse.wheel(0, -110);
          await page.waitForTimeout(150);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${locale}/${route}`).toBeLessThanOrEqual(1);
          if (route === "web-development") {
            await expect(page.locator("#svc-overview-title")).toHaveText(locale === "ru" ? "От структуры страниц до работающего сайта" : "From page structure to a working website");
          }
          if (route === "blog") {
            const cover = page.locator(".article-card-image img").first();
            await cover.scrollIntoViewIfNeeded();
            await expect.poll(() => cover.evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
            const imageUrl = await cover.evaluate(img => (img as HTMLImageElement).currentSrc);
            const imageResponse = await page.request.get(imageUrl, { headers: { Accept: "image/avif,image/webp,*/*" } });
            expect(imageResponse.headers()["content-type"]).toBe("image/webp");
          }
          await page.screenshot({ path: resolve(evidence, `${locale}-${route || "home"}-${theme}-${width}.png`), animations: "disabled" });
        }
      }
      expect(errors).toEqual([]);
    });
  }
}
