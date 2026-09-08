import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Request } from "@playwright/test";

const publicRoutes = [
  "/",
  "/services",
  "/seo",
  "/free-audit",
  "/pricing",
  "/brief",
  "/cases",
  "/marketplaces",
  "/blog",
  "/glossary",
  "/contacts",
  "/about",
] as const;

function isCancelledNextPrefetch(request: Request, url: URL) {
  return request.failure()?.errorText === "net::ERR_ABORTED"
    && request.resourceType() === "fetch"
    && !request.isNavigationRequest()
    && request.method() === "GET"
    && url.searchParams.has("_rsc")
    && request.headers()["next-router-prefetch"] === "1";
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("keeps breadcrumbs readable in the light theme", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  for (const path of ["/seo", "/glossary/lighthouse", "/checks/http-status"] as const) {
    await page.goto(path, { waitUntil: "networkidle" });
    const result = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    expect(result.violations, path).toEqual([]);
  }
});

test("keeps key public pages readable when text is enlarged to 200%", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const path of ["/", "/services", "/free-audit", "/brief", "/pricing"] as const) {
    await page.goto(path);
    await page.locator("html").evaluate((element) => {
      element.style.fontSize = "200%";
    });
    await expect(page.locator("main h1").first(), path).toBeVisible();
    await expect(page.locator("main#main-content"), path).toBeVisible();

    const geometry = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      mainWidth: document.querySelector<HTMLElement>("main#main-content")?.getBoundingClientRect().width ?? 0,
    }));
    expect(geometry.pageWidth, path).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.mainWidth, path).toBeGreaterThan(0);
  }
});

test("switches the 1280px header to keyboard-safe compact navigation at 200% text", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const header = page.locator(".site-header");
  await expect(page.locator("main#main-content h1").first()).toBeVisible();
  await page.locator("html").evaluate((element) => {
    element.style.fontSize = "200%";
  });

  const menuButton = page.getByRole("button", { name: "Открыть меню" });
  await expect(header).toHaveAttribute("data-text-scale-compact", "true");
  await expect(page.locator(".desktop-nav")).toBeHidden();
  await expect(menuButton).toBeVisible();

  const geometry = await header.evaluate((node) => {
    const logo = node.querySelector<HTMLElement>(".brand-logo")?.getBoundingClientRect();
    const actions = node.querySelector<HTMLElement>(".header-actions")?.getBoundingClientRect();
    return {
      separated: Boolean(logo && actions && logo.right <= actions.left + 1),
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(geometry.separated).toBe(true);
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

  await menuButton.focus();
  await menuButton.press("Enter");
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await expect(page.locator(".mobile-services-trigger")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();

  await page.locator("html").evaluate((element) => {
    element.style.fontSize = "";
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(header).not.toHaveAttribute("data-text-scale-compact", "true");
  await expect(page.locator(".desktop-nav")).toBeVisible();
  await expect(menuButton).toBeHidden();
});

test("loads the core public routes without browser errors or failed same-origin resources", async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin === new URL(page.url() || "http://127.0.0.1").origin) {
      if (isCancelledNextPrefetch(request, url)) return;
      errors.push(
        `requestfailed: ${url.pathname}${url.search} [${request.resourceType()} nav=${request.isNavigationRequest()} method=${request.method()}] (${request.failure()?.errorText ?? "unknown"})`,
      );
    }
  });
  page.on("response", (response) => {
    const current = page.url();
    if (!current) return;
    const url = new URL(response.url());
    if (url.origin === new URL(current).origin && response.status() >= 400) {
      errors.push(`http ${response.status()}: ${url.pathname}`);
    }
  });

  for (const path of publicRoutes) {
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("main#main-content"), path).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test("keeps public content available at 320px when JavaScript is disabled", async ({ browser }) => {
  test.slow();
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 720 } });
  const page = await context.newPage();
  try {
    for (const path of ["/", "/services", "/seo", "/pricing", "/cases", "/blog", "/about"] as const) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("main#main-content"), path).toBeVisible();
      await expect(page.locator("main h1").first(), path).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path)
        .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth) + 1);
    }
  } finally {
    await context.close();
  }
});

test("keeps all admin lists navigable at phone, tablet and desktop widths", async ({ page }) => {
  test.slow();
  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  await expect(page.getByRole("heading", { name: "Обзор" })).toBeVisible();

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ] as const) {
    await page.setViewportSize(viewport);
    for (const path of ["/admin/audits", "/admin/leads", "/admin/briefs"] as const) {
      await page.goto(path);
      await expect(page.locator(".admin-shell"), `${path} at ${viewport.width}px`).toBeVisible();
      await expect(page.locator(".admin-title h1"), `${path} at ${viewport.width}px`).toBeVisible();
      await expect(page.locator(".admin-header nav"), `${path} at ${viewport.width}px`).toBeVisible();
      const geometry = await page.evaluate(() => ({
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(geometry.pageWidth, `${path} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    }
  }
});
