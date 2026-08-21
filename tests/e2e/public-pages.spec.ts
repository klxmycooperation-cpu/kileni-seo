import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { completeFixtureAudit, createQueuedFixtureAudit } from "./audit-fixture";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences",
      JSON.stringify({ essential: true, analytics: false, marketing: false }),
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choose the direction, then the right scope.");
});

test("offers an accessible services dropdown and a persistent theme switch", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
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
  await expect(header.getByRole("link", { name: "Проверить сайт", exact: true })).toHaveCount(1);
  await expect(header).toHaveCSS("position", "fixed");
  await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  await services.focus();
  await page.keyboard.press("ArrowDown");
  await expect(services).toHaveAttribute("aria-expanded", "true");
  const servicesMenu = page.getByRole("menu", { name: "Услуги" });
  await expect(servicesMenu).toBeVisible();
  await expect(servicesMenu.getByRole("menuitem")).toHaveCount(4);
  await expect(servicesMenu.getByRole("menuitem", { name: "SEO", exact: true })).toHaveAttribute("href", "/services");
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
  const scrolledHeaderHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
  const scrolledMainTop = await page.locator("#main-content").evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  expect(scrolledHeaderHeight).toBeLessThan(initialHeaderHeight);
  expect(Math.abs(scrolledMainTop - initialMainTop)).toBeLessThanOrEqual(1);
});

test("explains a bounded set of service terms through keyboard-accessible disclosures", async ({ page }) => {
  await page.goto("/seo-audit");

  const glossary = page.getByRole("region", { name: "Термины этого раздела" });
  await expect(glossary).toBeVisible();
  await expect(glossary.locator("details")).toHaveCount(3);

  const firstSummary = glossary.locator("summary").first();
  await firstSummary.focus();
  await page.keyboard.press("Enter");
  await expect(glossary.locator("details").first()).toHaveAttribute("open", "");
  await expect(glossary.getByRole("link", { name: "Открыть в словаре" }).first()).toHaveAttribute("href", /\/glossary#[a-z0-9-]+$/u);

  const violations = await new AxeBuilder({ page }).include(".svc-inline-glossary").analyze();
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
  await expect(page.locator(".about-boundaries").getByRole("listitem").filter({ hasText: "Топ-1" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/about");
  await expect(page.getByText("What the client receives", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { level: 2, name: "Контекст задачи" })).toBeVisible();
  await page.getByLabel("Компания или проект").fill("KILENI fixture");

  await page.reload();

  await expect(page.getByRole("heading", { level: 2, name: "Контекст задачи" })).toBeVisible();
  await expect(page.getByLabel("Компания или проект")).toHaveValue("KILENI fixture");
});

test("opens the keyboard-labelled navigation without overflow at 320 and 360 pixels", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Открыть меню" });

    await expect(menu).toBeVisible();
    await expect(page.locator(".site-header .header-cta")).toBeVisible();
    await menu.click();
    await expect(page.getByRole("button", { name: "Закрыть меню" })).toHaveAttribute("aria-expanded", "true");
    const mobileNavigation = page.getByRole("navigation", { name: "Мобильная навигация" });
    await expect(mobileNavigation).toBeVisible();
    const mobileThemeToggle = mobileNavigation.locator(".theme-toggle--mobile");
    await expect(mobileThemeToggle).toBeVisible();
    await expect(mobileThemeToggle).toHaveAccessibleName("Включить сигнальную тему");
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
    window.sessionStorage.setItem("kileni:intro:v3", "1");
    window.localStorage.setItem("kileni:theme:v1", "light");
  });

  for (const width of [1_181, 1_440, 1_920, 2_560, 3_840]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");

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

test("finishes the approved typographic brand reveal inside its 4400ms visual timeline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v3"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const intro = page.locator(".brand-intro");
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute("aria-hidden", "true");
  await expect(intro).toHaveCSS("pointer-events", "none");
  await expect(intro.locator(".brand-intro__initial")).toHaveText("KILENI");
  await expect(intro.locator(".brand-intro__split")).toContainText("KILENI");
  await expect(intro.locator(".brand-intro__seo")).toHaveText("SEO");
  await expect(intro.locator(".brand-intro__slogan")).toContainText("Разбираем по буквам");

  const animationEnd = await page.evaluate(() => {
    const elements = [
      document.querySelector(".brand-intro"),
      document.querySelector(".site-header--home"),
      document.querySelector(".signal-hero .hero-grid"),
    ].filter((element): element is Element => element instanceof Element);
    return Math.max(...elements.flatMap((element) => element.getAnimations({ subtree: true })
      .map((animation) => Number(animation.effect?.getComputedTiming().endTime ?? 0))
      .filter(Number.isFinite)));
  });
  expect(animationEnd).toBe(4_400);

  const completionMs = await page.evaluate(async () => {
    const root = document.documentElement;
    const startedAt = Number(root.dataset.kileniIntroStartedAt);
    if (root.dataset.kileniIntro === "done") return performance.now() - startedAt;
    return await new Promise<number>((resolve) => {
      const observer = new MutationObserver(() => {
        if (root.dataset.kileniIntro !== "done") return;
        observer.disconnect();
        resolve(performance.now() - startedAt);
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-kileni-intro"] });
    });
  });
  expect(completionMs).toBeGreaterThanOrEqual(4_000);
  expect(completionMs).toBeLessThanOrEqual(4_400 + 50);
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

test("uses a repeat-session transition no longer than 350ms", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
  await page.reload({ waitUntil: "commit" });
  await page.waitForFunction(() => document.documentElement?.dataset.kileniIntro === "repeat");

  const repeat = await page.evaluate(async () => {
    const root = document.documentElement;
    const startedAt = Number(root.dataset.kileniIntroStartedAt);
    const intro = document.querySelector(".brand-intro");
    const header = document.querySelector(".site-header--home");
    const hero = document.querySelector(".signal-hero .hero-grid");
    const animationEnd = Math.max(...[intro, header, hero]
      .filter((element): element is Element => element instanceof Element)
      .flatMap((element) => element.getAnimations({ subtree: true })
        .map((animation) => Number(animation.effect?.getComputedTiming().endTime ?? 0))
        .filter(Number.isFinite)));
    const completionMs = await new Promise<number>((resolve) => {
      const observer = new MutationObserver(() => {
        if (root.dataset.kileniIntro !== "done") return;
        observer.disconnect();
        resolve(performance.now() - startedAt);
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-kileni-intro"] });
    });
    return { animationEnd, completionMs };
  });

  expect(repeat.animationEnd).toBeLessThanOrEqual(350);
  expect(repeat.completionMs).toBeLessThanOrEqual(350);
  await expect(page.locator(".brand-intro")).toHaveCount(0);
});

test("starts the intro on client-side navigation to the home page", async ({ page }) => {
  await page.goto("/pricing");
  await page.evaluate(() => {
    window.sessionStorage.removeItem("kileni:intro:v3");
    delete document.documentElement.dataset.kileniIntro;
  });
  await page.locator(".site-header .brand-logo").click();

  await expect(page).toHaveURL(/\/$/u);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await expect(page.locator(".brand-intro")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/pricing");
  await page.locator(".site-header .brand-logo").click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "repeat");
  await expect(page.locator(".brand-intro")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 500 });
});

test("allows input to dismiss the intro before React hydrates", async ({ page }) => {
  await page.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForFunction(() => document.documentElement.dataset.kileniIntro === "play");
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  expect(await page.evaluate(() => window.sessionStorage.getItem("kileni:intro:v3"))).toBe("1");
});

test("keeps the home layout within 390, 768, 1024 and 1440 pixels", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
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
    if (width <= 768) await expect(page.locator(".header-cta")).toBeVisible();
  }
});

test("dismisses the intro on pointer, keyboard and wheel without swallowing the action", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v3"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro")).toBeVisible();

  const url = page.getByLabel("Адрес сайта");
  await url.click({ force: true });
  await url.fill("https://example.ru");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
  await expect(url).toBeFocused();
  await expect(url).toHaveValue("https://example.ru");
  expect(await page.evaluate(() => window.sessionStorage.getItem("kileni:intro:v3"))).toBe("1");

  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v3"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v3"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro")).toBeVisible();
  await page.mouse.wheel(0, 320);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("submits the free-audit form and preserves the quota after repeated active-domain requests", async ({ page }) => {
  await page.goto("/free-audit");
  await page.getByLabel("Адрес сайта").fill("https://example.com/a-page");
  await expect(page.getByLabel("Сколько страниц проверить")).toHaveCount(0);
  await page.getByRole("button", { name: /Проверить сайт бесплатно/u }).click();
  await page.getByLabel("Ваше имя").fill("E2E Audit");
  await page.getByLabel("Телефон, Telegram или e-mail").fill("audit-e2e@example.com");
  await page.getByLabel(/Согласен на обработку данных/u).check();
  await page.getByLabel(/Я имею отношение к сайту/u).check();
  await page.getByRole("button", { name: /Запустить проверку/u }).click();
  await expect(page).toHaveURL(/\/audit\/[A-Za-z0-9_-]{43}$/u);
  await expect(page.getByRole("heading", { name: "Проводим SEO-проверку сайта" })).toBeVisible();
  const created = await page.request.get(new URL(page.url()).pathname.replace("/audit/", "/api/audits/"));
  expect((await created.json() as { pageLimit: number }).pageLimit).toBe(10);

  const csrfResponse = await page.request.get("/api/csrf");
  const { token } = await csrfResponse.json() as { token: string };
  const requestOrigin = process.env.APP_BASE_URL ?? "http://127.0.0.1:3107";
  const duplicate = () => page.request.post("/api/audits", {
    headers: { "content-type": "application/json", "x-csrf-token": token, origin: requestOrigin },
    data: { url: "https://www.example.com/another-page", name: "E2E Repeat", contact: "repeat@example.com", consent: true, authority: true, honeypot: "", turnstileToken: "turnstile-disabled", locale: "ru", source: "playwright" },
  });
  for (const repeated of [await duplicate(), await duplicate()]) {
    expect(repeated.status()).toBe(409);
    expect(await repeated.json()).toMatchObject({ error: "DOMAIN_AUDIT_ACTIVE" });
  }

  const newDomain = await page.request.post("/api/audits", {
    headers: { "content-type": "application/json", "x-csrf-token": token, origin: requestOrigin },
    data: { url: "https://example.org/new-page", name: "E2E New", contact: "new@example.com", consent: true, authority: true, honeypot: "", turnstileToken: "turnstile-disabled", locale: "ru", source: "playwright" },
  });
  expect(newDomain.status()).toBe(202);
});

test("streams observed fixture crawl progress, completes, and reopens the result", async ({ page }) => {
  const audit = createQueuedFixtureAudit();
  await page.goto(`/audit/${audit.publicToken}`);
  await expect(page.getByRole("heading", { name: "Проводим SEO-проверку сайта" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Ход проверки сайта" })).toBeVisible();

  const work = completeFixtureAudit(audit);
  await expect(page.locator(".audit-complete")).toBeVisible({ timeout: 20_000 });
  await work;
  await expect(page.locator(".final-score strong")).toHaveText("100");
  await expect(page.getByText("Проверено 2 из максимум 10 страниц. Найдено доступных страниц: 2.")).toBeVisible();
  await expect(page.getByText(/согласие зафиксировано/u)).toBeVisible();
  await expect(page.locator(".audit-complete h1")).toHaveCSS("font-family", /Manrope/u);
  await expect(page.getByText("Полный аудит стоит", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Скачать PDF-отчёт" })).toHaveAttribute("href", `/api/audits/${audit.publicToken}/report.pdf`);
  const publicPdf = await page.request.get(`/api/audits/${audit.publicToken}/report.pdf`);
  expect(publicPdf.status()).toBe(200);
  expect(publicPdf.headers()["content-type"]).toContain("application/pdf");
  expect((await publicPdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.reload();
  await expect(page.locator(".final-score strong")).toHaveText("100");
  await expect(page.locator(".risk-directions article")).toHaveCount(5);
});

test("shows an explicit error for an unknown audit link", async ({ page }) => {
  await page.goto(`/audit/${"A".repeat(43)}`);

  await expect(page.getByRole("heading", { name: "Проверка не найдена" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Запустить новую проверку" })).toBeVisible();
});

test("submits the short form and calculator lead", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByLabel("Имя").fill("E2E Lead");
  await page.getByLabel("Телефон, Telegram или e-mail").fill("lead-e2e@example.com");
  await page.getByLabel(/Согласен на обработку данных/u).check();
  await page.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(page.getByText(/Заявка сохранена/u)).toBeVisible();

  await page.goto("/calculator");
  await page.locator(".estimate-panel input[name=name]").fill("E2E Calculator");
  await page.locator(".estimate-panel input[name=contact]").fill("calculator-e2e@example.com");
  await page.locator(".estimate-panel input[name=consent]").check();
  await page.getByRole("button", { name: "Отправить расчёт" }).click();
  await expect(page.getByText(/Расчёт сохранён/u)).toBeVisible();
});

test("submits the detailed brief with a validated private PNG attachment", async ({ page }) => {
  await page.goto("/brief");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Компания или проект").fill("E2E Brief");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Ссылка на сайт").fill("https://example.com");
  await page.getByRole("button", { name: /^Далее/u }).click();
  await page.getByLabel("Имя").fill("E2E Brief User");
  await page.getByLabel("E-mail для ответа").fill("brief-e2e@example.com");
  await page.getByLabel(/Согласен на обработку данных/u).check();
  await page.locator('input[type="file"]').setInputFiles("public/brand/kileni-og.png");
  await page.getByRole("button", { name: "Получить расчёт" }).click();
  await expect(page.getByRole("heading", { name: /Спасибо. Бриф уже в работе/u })).toBeVisible();
});

test("authenticates admin, opens a full audit, exports JSON/PDF, and deletes it", async ({ page }) => {
  const audit = createQueuedFixtureAudit();
  await completeFixtureAudit(audit, 0);
  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin\/audits$/u);
  await page.getByRole("link", { name: "correct.test" }).first().click();
  await expect(page.getByRole("heading", { name: "correct.test" })).toBeVisible();
  await expect(page.getByText("Полный результат")).toBeVisible();

  const json = await page.request.get(`/api/admin/audits/${audit.id}/export`);
  expect(json.status()).toBe(200);
  expect(await json.json()).toMatchObject({ audit: { id: audit.id, overallScore: 100 } });
  const pdf = await page.request.get(`/api/admin/audits/${audit.id}/export?format=pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  page.once("dialog", (dialog) => dialog.accept("DELETE"));
  await page.getByRole("button", { name: "Удалить" }).click();
  await expect(page).toHaveURL(/\/admin\/audits$/u);
  const removed = await page.request.get(`/api/audits/${audit.publicToken}`);
  expect(removed.status()).toBe(404);
});

test("has no serious automated accessibility violations on key public pages", async ({ page }) => {
  for (const path of ["/", "/free-audit", "/pricing", "/cases/eco-santeh"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious"), `${path}: serious axe violations`).toEqual([]);
  }
});
