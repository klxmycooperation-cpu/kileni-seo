import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument } from "pdf-lib";

import { completeFixtureAudit, createQueuedFixtureAudit } from "./audit-fixture";
import { database } from "../../src/db/client";
import { buildAuditClientPresentation } from "../../src/lib/audit/client-presentation";
import type { AuditResultContractV3 } from "../../src/lib/audit/contract-v3";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("renders the Russian and English public home pages with the right locale", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Сайт есть. Пора сделать так, чтобы его находили.",
  })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("font-family", /Manrope/u);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /Manrope/u);

  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Your website is live. Now make it discoverable.",
  })).toBeVisible();
});

test("switches locale while preserving the current public route", async ({ page }) => {
  await page.goto("/pricing?utm_source=e2e#request");
  await page.locator(".language-link").click();

  await expect(page).toHaveURL(/\/en\/pricing\?utm_source=e2e#request$/u);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How many pages should we check?");
});

test("offers an accessible services dropdown and a persistent theme switch", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  const header = page.locator(".site-header");
  const services = header.getByRole("button", { name: "Услуги", exact: true });
  await expect(services).toBeVisible();
  await expect(services).toHaveAttribute("aria-expanded", "false");
  await expect(services).toHaveAttribute("aria-controls", "desktop-services-menu");
  await expect(header.getByRole("link", { name: "Бесплатная проверка", exact: true })).toHaveCount(0);
  const themeToggle = header.locator(".theme-toggle:not(.theme-toggle--mobile)");
  await expect(themeToggle).toBeVisible();
  await expect(page.locator("#kileni-theme-bootstrap")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");
  await expect(themeToggle).toHaveAccessibleName("Включить сигнальную тему");
  await themeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await expect(themeToggle).toHaveAccessibleName("Включить светлую тему");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await header.locator(".theme-toggle:not(.theme-toggle--mobile)").click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(header.locator(".theme-toggle:not(.theme-toggle--mobile)")).toHaveAccessibleName("Включить тёмную тему");
  await expect(header.getByRole("link", { name: "Узнать, что мешает сайту", exact: true })).toHaveCount(1);
  await expect(header).toHaveCSS("position", "fixed");
  await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  await services.focus();
  await page.keyboard.press("ArrowDown");
  await expect(services).toHaveAttribute("aria-expanded", "true");
  const servicesMenu = page.getByRole("menu", { name: "Услуги" });
  await expect(servicesMenu).toBeVisible();
  await expect(servicesMenu.getByRole("menuitem")).toHaveCount(4);
  await expect(servicesMenu.getByRole("menuitem", { name: "SEO", exact: true })).toHaveAttribute("href", "/seo");
  await expect(servicesMenu.getByRole("menuitem", { name: "Нестандартные задачи", exact: true })).toHaveAttribute("href", "/custom-task");
  await expect(servicesMenu.getByRole("menuitem", { name: "SEO", exact: true })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(services).toBeFocused();
  await expect(services).toHaveAttribute("aria-expanded", "false");

  await services.hover();
  await expect(servicesMenu).toBeVisible();
  await servicesMenu.hover();
  await expect(servicesMenu).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(servicesMenu).toBeHidden();

  await services.click();
  await expect(services).toHaveAttribute("aria-expanded", "true");
  await services.click();
  await expect(services).toHaveAttribute("aria-expanded", "false");

  const initialHeaderHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
  const initialMainTop = await page.locator("#main-content").evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 240));
  await expect(header).toHaveAttribute("data-scrolled", "true");
  await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect.poll(
    () => header.evaluate((element) => element.getBoundingClientRect().height),
    { message: "header finishes its compact scroll transition" },
  ).toBeLessThan(initialHeaderHeight);
  const scrolledMainTop = await page.locator("#main-content").evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  expect(Math.abs(scrolledMainTop - initialMainTop)).toBeLessThanOrEqual(1);
});

test("explains the service in a bounded overview with a direct glossary route", async ({ page }) => {
  await page.goto("/seo-audit");

  const overview = page.locator(".svc-compact-overview");
  await expect(overview).toBeVisible();
  await expect(overview.locator("article")).toHaveCount(3);
  await expect(overview).toContainText("Когда подходит");
  await expect(overview).toContainText("Что делаем");
  await expect(overview).toContainText("Что получите");
  await expect(page.locator(".svc-context-links").getByRole("link", { name: "Термины" })).toHaveAttribute("href", "/glossary");

  const violations = await new AxeBuilder({ page }).include(".svc-compact-overview").analyze();
  expect(violations.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
});

test("covers the complete company story without invented biographies or promises", async ({ page }) => {
  await page.goto("/about");

  for (const heading of [
    "Что мы делаем",
    "Компетенции внутри работы",
    "Как начинается проект",
    "Что получает клиент",
    "Ответственность",
    "Как принимается работа",
  ]) {
    await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
  }
  const roles = page.locator(".about-roles");
  await expect(roles.getByRole("listitem").filter({ hasText: "Маркетплейсы" })).toBeVisible();
  await expect(roles.getByRole("listitem").filter({ hasText: "Реклама" })).toBeVisible();
  await expect(page.locator(".about-boundaries details")).toHaveAttribute("open", "");
  await expect(page.locator(".about-boundaries").getByRole("listitem").filter({ hasText: "Топ-1" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/about");
  await expect(page.getByText("What the client receives", { exact: true })).toBeVisible();
  await page.getByText("Show accountability boundaries", { exact: true }).click();
  await expect(page.getByText("We do not guarantee", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("recalculates the marketplace estimate at the ten-SKU package boundary", async ({ page }) => {
  await page.goto("/calculator");
  await page.getByRole("tab", { name: "Маркетплейсы" }).click();
  await page.getByLabel("Число артикулов").fill("10");
  await page.getByLabel("Пакет").selectOption("optimization");

  await expect(page.locator(".estimate-panel h2")).toContainText(/39\s900\s₽.*46\s000\s₽/u);
});

test("advances the brief and restores its browser draft after reload", async ({ page }) => {
  await page.goto("/brief");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await expect(page.getByRole("heading", { level: 2, name: "О задаче" })).toBeVisible();
  await page.getByLabel("Компания или проект").fill("KILENI fixture");

  await page.reload();

  await expect(page.getByRole("heading", { level: 2, name: "О задаче" })).toBeVisible();
  await expect(page.getByLabel("Компания или проект")).toHaveValue("KILENI fixture");
});

test("opens the keyboard-labelled navigation without overflow at 320 and 360 pixels", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Открыть меню" });

    await expect(menu).toBeVisible();
    const headerCta = page.locator(".site-header .header-cta");
    await expect(headerCta).toBeHidden();
    const logo = page.locator(".site-header .brand-logo");
    const menuBox = await menu.boundingBox();
    const logoBox = await logo.boundingBox();
    expect(menuBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(menuBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(logoBox).not.toBeNull();
    expect((logoBox?.x ?? 0) + (logoBox?.width ?? 0)).toBeLessThanOrEqual(menuBox?.x ?? 0);
    await menu.click();
    await expect(page.getByRole("button", { name: "Закрыть меню" })).toHaveAttribute("aria-expanded", "true");
    const mobileNavigation = page.getByRole("navigation", { name: "Мобильная навигация" });
    await expect(mobileNavigation).toBeVisible();
    const mobileCta = mobileNavigation.getByRole("link", { name: "Узнать, что мешает сайту", exact: true });
    await expect(mobileCta).toBeVisible();
    await expect(mobileCta).toHaveAttribute("href", "/free-audit");
    const mobileCtaBox = await mobileCta.boundingBox();
    expect(mobileCtaBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    const mobileThemeToggle = mobileNavigation.locator(".theme-toggle--mobile");
    await expect(mobileThemeToggle).toBeVisible();
    await expect(mobileThemeToggle).toHaveAccessibleName("Включить сигнальную тему");
    const themeToggleBox = await mobileThemeToggle.boundingBox();
    expect(themeToggleBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(themeToggleBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(mobileNavigation.getByRole("link", { name: "English", exact: true })).toBeVisible();
    await mobileNavigation.getByRole("button", { name: "Услуги", exact: true }).click();
    await expect(mobileNavigation.getByRole("link", { name: "SEO", exact: true })).toBeVisible();
    await expect(mobileNavigation.getByRole("link", { name: "Нестандартные задачи", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();
  }

  await page.goto("/pricing");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.getByRole("navigation", { name: "Мобильная навигация" }).getByRole("link", { name: "Цены" }).click();
  await expect(page.getByRole("button", { name: "Открыть меню" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#mobile-menu")).toBeHidden();

  await page.setViewportSize({ width: 1_024, height: 768 });
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.setViewportSize({ width: 1_440, height: 900 });
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await expect(page.locator(".desktop-nav")).toBeVisible();
});

test("keeps the home hero in two real columns on wide screens", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni:theme:v1", "light");
  });

  await page.setViewportSize({ width: 1_181, height: 960 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const width of [1_181, 1_440, 1_920, 2_560, 3_840]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(page.locator(".signal-hero .hero-copy")).toBeVisible();

    const copy = await page.locator(".signal-hero .hero-copy").boundingBox();
    const tool = await page.locator(".signal-hero .hero-tool").boundingBox();
    expect(copy).not.toBeNull();
    expect(tool).not.toBeNull();
    expect(tool?.y ?? Number.POSITIVE_INFINITY).toBeLessThan((copy?.y ?? 0) + (copy?.height ?? 0));
    expect((copy?.x ?? 0) + (copy?.width ?? 0)).toBeLessThan(tool?.x ?? 0);
    expect(copy?.width ?? 0).toBeGreaterThan(420);
    expect(tool?.width ?? 0).toBeGreaterThan(380);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("does not hold the hero in its intro state when reduced motion is requested", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" && /hydration/iu.test(message.text())) hydrationErrors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
  await expect(page.locator(".hero")).toHaveClass(/hero-ready/u);
  await expect(page.locator(".hero-form-wrap")).toHaveCSS("opacity", "1");
  expect(hydrationErrors).toEqual([]);
});

test("finishes the approved SVG brand reveal at its natural pace", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  const intro = page.locator(".brand-intro");
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute("role", "region");
  await expect(intro).toHaveAttribute("aria-label", "Заставка KILENI");
  await expect(intro).toHaveCSS("pointer-events", "auto");
  await expect(intro.locator(".brand-intro-v9__kil")).toHaveText("KIL");
  await expect(intro.locator(".brand-intro-v9__ni")).toHaveText("NI");
  await expect(intro.locator(".brand-intro-v9__e")).toHaveText("E");
  await expect(intro.locator(".brand-intro-v9__s")).toHaveText("S");
  await expect(intro.locator(".brand-intro-v9__o")).toHaveText("O");
  await expect(intro.locator(".brand-intro-v9__slogan").first()).toContainText("Разбираем по буквам");

  const completionMs = await page.evaluate(async () => {
    const root = document.documentElement;
    const readDuration = () => Number(root.dataset.kileniIntroLastCompletedAt) - Number(root.dataset.kileniIntroLastStartedAt);
    if (root.dataset.kileniIntro === "done") return readDuration();
    return await new Promise<number>((resolve) => {
      const observer = new MutationObserver(() => {
        if (root.dataset.kileniIntro !== "done") return;
        observer.disconnect();
        resolve(readDuration());
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-kileni-intro"] });
    });
  });
  expect(completionMs).toBeGreaterThanOrEqual(4_100);
  expect(completionMs).toBeLessThanOrEqual(5_000);
  await expect(intro).toHaveCount(0);

  const layout = await page.locator(".signal-hero h1").evaluate((heading) => {
    const style = getComputedStyle(heading);
    return {
      lines: heading.getBoundingClientRect().height / Number.parseFloat(style.lineHeight),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.lines).toBeLessThanOrEqual(5.05);
  expect(layout.overflow).toBe(false);
});

test("keeps the mobile intro opaque above the page until it has finished", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const intro = page.locator(".brand-intro-v9");
  await expect(intro).toBeVisible();
  const coverage = await intro.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      zIndex: Number.parseInt(style.zIndex, 10),
      alpha: Number.parseFloat(style.opacity),
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(coverage.zIndex).toBeGreaterThanOrEqual(10_000);
  expect(coverage.alpha).toBe(1);
  expect(coverage.top).toBeLessThanOrEqual(0);
  expect(coverage.bottom).toBeGreaterThanOrEqual(coverage.viewportHeight - 1);
});

test("shows the intro once per browser session and keeps an explicit replay route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Пропустить заставку" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("kileni:intro:v9"))).toBe("1");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);

  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", /pending|play/u);
  await expect(page.locator(".brand-intro")).toBeVisible();
});

test("starts the intro on client-side navigation to the home page", async ({ page }) => {
  await page.goto("/pricing");
  await page.evaluate(() => {
    window.sessionStorage.removeItem("kileni:intro:v9");
    delete document.documentElement.dataset.kileniIntro;
  });
  await page.locator(".site-header .brand-logo").click();

  await expect(page).toHaveURL(/\/$/u);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await expect(page.locator(".brand-intro")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/pricing");
  await page.locator(".site-header .brand-logo").click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
});

test("allows input to dismiss the intro before React hydrates", async ({ page }) => {
  await page.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  const fallback = page.locator(".brand-intro-v9__fallback");
  await expect(fallback).toBeVisible({ timeout: 2_500 });
  await expect(fallback).toContainText("KILENI");
  await page.getByRole("button", { name: "Пропустить заставку" }).click({ timeout: 2_500 });

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 500 });
});

test("keeps the home layout within 390, 768, 1024 and 1440 pixels", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  for (const width of [390, 768, 1_024, 1_440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 1_000 });
    const layout = await page.locator(".signal-hero h1").evaluate((heading) => {
      const style = getComputedStyle(heading);
      return {
        lines: heading.getBoundingClientRect().height / Number.parseFloat(style.lineHeight),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(layout.lines, `heading lines at ${width}px`).toBeLessThanOrEqual(width === 390 ? 5.05 : 4.05);
    expect(layout.overflow, `horizontal overflow at ${width}px`).toBe(false);
    if (width > 360 && width <= 768) await expect(page.locator(".header-cta")).toBeVisible();
  }
});

test("dismisses the intro on pointer, keyboard and wheel without swallowing the action", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v9"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro")).toBeVisible();

  const url = page.getByLabel("Адрес сайта");
  await url.click({ force: true });
  await url.fill("https://example.ru");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
  await expect(url).toBeFocused();
  await expect(url).toHaveValue("https://example.ru");

  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v9"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v9"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro")).toBeVisible();
  await page.mouse.wheel(0, 320);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("submits the free-audit form and preserves the quota after repeated active-domain requests", async ({ page, browserName }) => {
  const activeDomain = browserName === "webkit" ? "example.net" : "example.com";
  const nextDomain = browserName === "webkit" ? "example.edu" : "example.org";
  await page.goto("/free-audit");
  await page.getByLabel("Адрес сайта").fill(`https://${activeDomain}/a-page`);
  await expect(page.getByLabel("Сколько страниц проверить")).toHaveCount(0);
  await page.getByRole("button", { name: /Проверить сайт бесплатно/u }).click();
  await expect(page.getByText("Результат откроется сразу. Email — по желанию")).toBeVisible();
  await expect(page.getByLabel("Email (необязательно)")).toBeVisible();
  await expect(page.getByText(/согласие на обработку email для подготовки и однократной отправки отчёта/iu)).toHaveCount(0);
  await page.getByLabel(/Я имею отношение к сайту/u).check();
  await page.getByRole("button", { name: /Запустить проверку/u }).click();
  await expect(page).toHaveURL(/\/audit\/[A-Za-z0-9_-]{43}$/u);
  await expect(page.getByRole("dialog", { name: "Ход SEO-проверки" })).toBeVisible();
  await expect(page.locator("#audit-live-heading")).toBeVisible();
  const created = await page.request.get(new URL(page.url()).pathname.replace("/audit/", "/api/audits/"));
  expect((await created.json() as { pageLimit: number }).pageLimit).toBe(10);

  const csrfResponse = await page.request.get("/api/csrf");
  const { token } = await csrfResponse.json() as { token: string };
  const requestOrigin = process.env.APP_BASE_URL ?? "http://127.0.0.1:3107";
  const duplicate = () => page.request.post("/api/audits", {
    headers: { "content-type": "application/json", "x-csrf-token": token, origin: requestOrigin },
    data: { url: `https://www.${activeDomain}/another-page`, email: "", consent: false, authority: true, honeypot: "", turnstileToken: "turnstile-disabled", locale: "ru", source: "playwright" },
  });
  for (const repeated of [await duplicate(), await duplicate()]) {
    const repeatedBody = await repeated.json() as { error?: string; ok?: boolean; cached?: boolean };
    expect([200, 409]).toContain(repeated.status());
    expect(repeatedBody).toMatchObject(
      repeated.status() === 409
        ? { error: "DOMAIN_AUDIT_ACTIVE" }
        : { ok: true, cached: true },
    );
  }

  const newDomain = await page.request.post("/api/audits", {
    headers: { "content-type": "application/json", "x-csrf-token": token, origin: requestOrigin },
    data: { url: `https://${nextDomain}/new-page`, email: "", consent: false, authority: true, honeypot: "", turnstileToken: "turnstile-disabled", locale: "ru", source: "playwright" },
  });
  expect([200, 202]).toContain(newDomain.status());
  if (newDomain.status() === 200) {
    expect(await newDomain.json()).toMatchObject({ ok: true, cached: true });
  }
});

test("streams observed fixture crawl progress, completes, and reopens the result", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await page.goto(`/audit/${audit.publicToken}`);
  await expect(page.getByRole("heading", { level: 1, name: "Подключение" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Ход проверки сайта" })).toBeVisible();

  const work = completeFixtureAudit(audit);
  await expect(page.locator(".audit-complete")).toBeVisible({ timeout: 20_000 });
  await work;
  await expect(page.locator(".final-score")).toHaveCount(0);
  await expect(page.getByText("/100", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Краткий итог для correct.test" })).toBeVisible();
  await expect(page.locator(".audit-client-stats").getByText("Найдено HTML-страниц", { exact: true })).toBeVisible();
  await expect(page.locator(".audit-client-stats").getByText("Подробно проверено страниц", { exact: true })).toBeVisible();
  await expect(page.locator(".audit-client-issues").getByRole("heading", { name: "Что стоит проверить" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Что уже в порядке" }).first()).toBeVisible();
  await expect(page.locator(".audit-complete h1")).toHaveCSS("font-family", /Manrope/u);
  await expect(page.getByText("Полный аудит стоит", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Скачать PDF" })).toHaveAttribute("href", `/api/audits/${audit.publicToken}/report.pdf`);
  const publicPdf = await page.request.get(`/api/audits/${audit.publicToken}/report.pdf`);
  expect(publicPdf.status()).toBe(200);
  expect(publicPdf.headers()["content-type"]).toContain("application/pdf");
  expect((await publicPdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.reload();
  await expect(page.locator(".final-score")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Краткий итог для correct.test" })).toBeVisible();
});

test("shows an explicit error for an unknown audit link", async ({ page }) => {
  await page.goto(`/audit/${"A".repeat(43)}`);

  await expect(page.getByRole("heading", { name: "Проверка не найдена" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Новая проверка" })).toBeVisible();
});

test("submits the short form and calculator lead", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByLabel("Имя").fill("E2E Lead");
  await page.getByLabel("Телефон или e-mail").fill("lead-e2e@example.com");
  await page.getByLabel(/согласие на обработку персональных данных/iu).check();
  await page.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(page.getByText(/Заявка сохранена/u)).toBeVisible();

  await page.goto("/calculator");
  await page.locator(".estimate-panel input[name=name]").fill("E2E Calculator");
  await page.locator(".estimate-panel input[name=contact]").fill("calculator-e2e@example.com");
  await page.locator(".estimate-panel input[name=consent]").check();
  await page.getByRole("button", { name: "Отправить расчёт" }).click();
  await expect(page.getByText(/Расчёт сохранён/u)).toBeVisible();
});

test("submits the detailed brief with a validated private PNG attachment", async ({ page, request, browserName }) => {
  const briefName = `E2E Brief User ${browserName}`;
  await page.goto("/brief");
  await page.waitForFunction(() => window.localStorage.getItem("kileni-brief:v2") !== null);
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Компания или проект").fill("E2E Brief");
  await page.getByLabel("Что сейчас не устраивает?").fill("Посетители не находят нужные услуги в поиске.");
  await page.getByLabel("Какой результат нужен?").fill("Понятный план роста заявок из поиска.");
  await page.waitForFunction(() => {
    const draft = JSON.parse(window.localStorage.getItem("kileni-brief:v2") ?? "null") as { answers?: { result?: string } } | null;
    return draft?.answers?.result === "Понятный план роста заявок из поиска.";
  });
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Ссылка на сайт").fill("https://example.com");
  await page.getByLabel("Приоритетные услуги").fill("SEO-аудит и продвижение.");
  await page.waitForFunction(() => {
    const draft = JSON.parse(window.localStorage.getItem("kileni-brief:v2") ?? "null") as { answers?: { priorities?: string } } | null;
    return draft?.answers?.priorities === "SEO-аудит и продвижение.";
  });
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Имя").fill(briefName);
  await page.getByLabel("Телефон или e-mail").fill("brief-e2e@example.com");
  await page.getByLabel(/согласие на обработку персональных данных/iu).check();
  await page.locator('input[type="file"]').setInputFiles("public/brand/kileni-og.png");
  await expect(page.getByText(/kileni-og\.png/u)).toBeVisible();
  await page.getByRole("button", { name: "Получить расчёт" }).click();
  await expect(page.getByRole("heading", { name: /Спасибо. Бриф уже в работе/u })).toBeVisible();

  const savedBrief = (await database.execute({
    sql: "SELECT id FROM brief_submissions WHERE name=? ORDER BY created_at DESC LIMIT 1",
    args: [briefName],
  })).rows[0] as { id?: string } | undefined;
  expect(savedBrief?.id).toEqual(expect.any(String));
  const briefId = savedBrief!.id!;
  const savedAttachment = (await database.execute({
    sql: "SELECT id,original_name AS originalName,mime FROM attachments WHERE brief_id=? ORDER BY created_at DESC LIMIT 1",
    args: [briefId],
  })).rows[0] as { id?: string; originalName?: string; mime?: string } | undefined;
  expect(savedAttachment).toMatchObject({ id: expect.any(String), originalName: "kileni-og.png", mime: "image/png" });
  const attachmentHref = `/api/admin/attachments/${savedAttachment!.id!}`;

  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/u);

  await page.goto(`/admin/briefs/${briefId}`);
  await expect(page.getByRole("heading", { name: briefName })).toBeVisible();
  await page.getByLabel("Статус").selectOption("contacted");
  await page.getByLabel("Новая заметка").fill("QA: бриф открыт, контакт проверен");
  await page.getByLabel("Тестовая запись (QA)").check();
  await page.getByLabel("Метка QA").fill("Playwright · путь брифа");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("QA: бриф открыт, контакт проверен")).toBeVisible();
  await expect(page.getByText("Playwright · путь брифа")).toBeVisible();

  const briefExport = await page.request.get(`/api/admin/briefs/${briefId}/export`);
  expect(briefExport.status()).toBe(200);
  expect(briefExport.headers()["content-disposition"]).toContain(`brief-${briefId}.json`);
  expect(await briefExport.json()).toMatchObject({
    kind: "brief",
    record: { id: briefId, status: "contacted" },
    metadata: { qaLabel: "Playwright · путь брифа" },
    notes: [{ note: "QA: бриф открыт, контакт проверен" }],
  });

  const anonymousDownload = await request.get(attachmentHref);
  expect(anonymousDownload.status()).toBe(401);
  const privateDownload = await page.request.get(attachmentHref);
  expect(privateDownload.status()).toBe(200);
  expect(privateDownload.headers()["content-type"]).toContain("image/png");
  expect(privateDownload.headers()["cache-control"]).toContain("private");
  expect((await privateDownload.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  await page.getByLabel("Запись в архиве").check();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith(`/api/admin/briefs/${briefId}`) && response.request().method() === "PATCH"),
    page.getByRole("button", { name: "Сохранить" }).click(),
  ]);
  await expect(page.getByText("В архиве", { exact: true })).toBeVisible();
  const briefRowLink = page.locator(`a.admin-record-link[href="/admin/briefs/${briefId}"]`);
  await page.goto("/admin/briefs");
  await expect(briefRowLink).toHaveCount(0);
  await page.getByLabel("Записи").selectOption("archived");
  await page.getByRole("button", { name: "Применить" }).click();
  await expect(briefRowLink).toBeVisible();
});

test("keeps one audit snapshot consistent across public result, PDF and admin lifecycle", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeFixtureAudit(audit, 0);

  await page.goto(`/audit/${audit.publicToken}`);
  const publicResponse = await page.request.get(`/api/audits/${audit.publicToken}`);
  expect(publicResponse.status()).toBe(200);
  const publicPayload = await publicResponse.json() as {
    result: {
      resultVersion: number;
      contractVersion: number;
      engineVersion: string;
      selectedPages: Array<{ url: string }>;
      checkedPages: Array<{ url: string }>;
      pagesNotCheckedTotal: number;
    };
  };
  expect(publicPayload.result).toMatchObject({ resultVersion: 4, contractVersion: 3 });
  const publicClient = buildAuditClientPresentation(publicPayload.result, "ru");
  await expect(page.locator(".audit-client-stats")).toBeVisible();
  await expect(page.locator(".audit-page-card")).toHaveCount(publicPayload.result.checkedPages.length);

  const publicPdfResponse = await page.request.get(`/api/audits/${audit.publicToken}/report.pdf`);
  expect(publicPdfResponse.status()).toBe(200);
  const publicPdf = await PDFDocument.load(await publicPdfResponse.body());
  expect(publicPdf.getPageCount()).toBeGreaterThanOrEqual(1);
  expect(publicPdf.getPageCount()).toBeLessThanOrEqual(3);

  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  const json = await page.request.get(`/api/admin/audits/${audit.id}/export`);
  expect(json.status()).toBe(200);
  const exported = await json.json() as {
    audit: { id: string; publicResult: AuditResultContractV3 };
    metadata: { qaLabel: string | null; archivedAt: number | null };
    notes: Array<{ note: string }>;
  };
  expect(buildAuditClientPresentation(exported.audit.publicResult, "ru")).toEqual(publicClient);
  await page.goto("/admin/audits");
  await page.getByRole("link", { name: "correct.test" }).first().click();
  await expect(page.getByRole("heading", { name: "correct.test" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Почему выбраны эти страницы · ${publicPayload.result.selectedPages.length}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Статусы и доказательства · ${exported.audit.publicResult.checks.length}` })).toBeVisible();
  await expect(page.getByText(publicPayload.result.engineVersion, { exact: true }).first()).toBeVisible();
  const rawData = page.locator("details.admin-card").filter({ has: page.locator("summary", { hasText: "Служебные данные и полный JSON" }) });
  await expect(rawData).toHaveJSProperty("open", false);
  await rawData.locator("summary").click();
  await expect(rawData).toHaveJSProperty("open", true);
  await expect(rawData.getByRole("heading", { name: "Полный результат" })).toBeVisible();

  expect(exported.audit).toMatchObject({ id: audit.id, publicResult: { resultVersion: 4, contractVersion: 3 } });
  expect(exported.audit.publicResult.selectedPages.map((item) => item.url)).toEqual(publicPayload.result.selectedPages.map((item) => item.url));
  expect(exported.audit.publicResult.pagesNotCheckedTotal).toBe(publicPayload.result.pagesNotCheckedTotal);
  const pdf = await page.request.get(`/api/admin/audits/${audit.id}/export?format=pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.getByLabel("Новая заметка").fill("QA: публичный результат, PDF и карточка сверены");
  await page.getByLabel("Тестовая запись (QA)").check();
  await page.getByLabel("Метка QA").fill("Playwright · parity");
  await page.getByLabel("Запись в архиве").check();
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("QA: публичный результат, PDF и карточка сверены")).toBeVisible();
  await expect(page.getByText("QA · Playwright · parity", { exact: true })).toBeVisible();
  await expect(page.getByText("В архиве", { exact: true })).toBeVisible();

  const lifecycleExport = await page.request.get(`/api/admin/audits/${audit.id}/export`);
  const lifecycle = await lifecycleExport.json() as typeof exported;
  expect(lifecycle.metadata).toMatchObject({ qaLabel: "Playwright · parity", archivedAt: expect.any(Number) });
  expect(lifecycle.notes).toEqual(expect.arrayContaining([
    expect.objectContaining({ note: "QA: публичный результат, PDF и карточка сверены" }),
  ]));

  await page.goto("/admin/audits");
  await expect(page.locator(`a[href="/admin/audits/${audit.id}"]`)).toHaveCount(0);
  await page.getByLabel("Записи").selectOption("archived");
  await page.getByLabel("QA").selectOption("qa");
  await page.getByRole("button", { name: "Применить" }).click();
  await expect(page.locator(`a[href="/admin/audits/${audit.id}"]`).first()).toBeVisible();
});

test("has no serious automated accessibility violations on key public pages", async ({ page }) => {
  for (const path of ["/", "/free-audit", "/pricing", "/cases/eco-santeh"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious"), `${path}: serious axe violations`).toEqual([]);
  }
});
