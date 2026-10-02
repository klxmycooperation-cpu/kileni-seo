import { expect, test } from "@playwright/test";
import { completeFixtureAudit, createQueuedFixtureAudit } from "./audit-fixture";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("term link shows a short tooltip and returns to the exact source block", async ({ page }) => {
  await page.goto("/seo-audit");

  const termLink = page.locator("a[data-glossary-inline='true']").first();
  await expect(termLink).toBeVisible();
  const sourceId = await termLink.getAttribute("data-glossary-source-id") ?? "";
  expect(sourceId).toMatch(/^glossary-source-\d+$/u);

  const tooltip = await termLink.getAttribute("data-glossary-tip");
  const tooltipWordCount = tooltip?.trim().split(/\s+/u).filter(Boolean).length ?? 0;
  expect(tooltipWordCount).toBeGreaterThanOrEqual(2);
  expect(tooltipWordCount).toBeLessThanOrEqual(3);
  await termLink.scrollIntoViewIfNeeded();
  await termLink.hover();
  await expect.poll(() => termLink.evaluate((link) => Number(getComputedStyle(link, "::after").opacity))).toBeGreaterThan(0.5);
  await termLink.focus();
  await expect.poll(() => termLink.evaluate((link) => getComputedStyle(link, "::after").visibility)).toBe("visible");

  const href = await termLink.getAttribute("href");
  expect(href).toContain("/glossary/");
  expect(href).toContain(encodeURIComponent(`/seo-audit#${sourceId}`));
  await termLink.click();
  await expect(page).toHaveURL(/\/glossary\/[^?]+\?from=/u);

  const returnLink = page.getByRole("link", { name: "Вернуться к месту в тексте" });
  await expect(returnLink).toBeVisible();
  await returnLink.click();
  await expect(page).toHaveURL(new RegExp(`/seo-audit#${sourceId}$`, "u"));

  const source = page.locator(`#${sourceId}`);
  await expect(source).toHaveCount(1);
  await expect.poll(() => source.evaluate((element) => {
    const block = element.closest("p,li,dd,dt,blockquote,figcaption,td") ?? element;
    const rect = block.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  })).toBe(true);
});

test("invalid external return target is never rendered", async ({ page }) => {
  await page.goto("/glossary/indexing?from=https%3A%2F%2Fevil.example%2Fsteal%23glossary-source-1");
  await expect(page.getByRole("link", { name: "Вернуться к месту в тексте" })).toHaveCount(0);
});

test("English pages use English glossary routes, tooltips and return copy", async ({ page }) => {
  await page.goto("/en/seo-audit");
  const termLink = page.locator("a[data-glossary-inline='true']").first();
  await expect(termLink).toBeVisible();
  await expect(termLink).toHaveAttribute("href", /\/en\/glossary\//u);
  const tooltipWordCount = (await termLink.getAttribute("data-glossary-tip"))
    ?.trim().split(/\s+/u).filter(Boolean).length ?? 0;
  expect(tooltipWordCount).toBeGreaterThanOrEqual(2);
  expect(tooltipWordCount).toBeLessThanOrEqual(3);
  await termLink.click();
  const returnLink = page.getByRole("link", { name: "Return to where you were reading" });
  await expect(returnLink).toBeVisible();
  await returnLink.click();
  await expect(page).toHaveURL(/\/en\/seo-audit#glossary-source-\d+$/u);
});

test("native browser Back returns from the glossary without breaking enhancement", async ({ page }) => {
  await page.goto("/seo-audit");
  const termLink = page.locator("a[data-glossary-inline='true']").first();
  await expect(termLink).toBeVisible();
  await termLink.click();
  await expect(page).toHaveURL(/\/glossary\/[^?]+\?from=/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/seo-audit$/u);
  await expect(page.locator("a[data-glossary-inline='true']").first()).toBeVisible();
  await expect(page.locator("a a[data-glossary-inline='true']")).toHaveCount(0);
});

test("a completed dynamic audit also links terms and restores its shareable result", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeFixtureAudit(audit, 0);
  await page.goto(`/audit/${audit.publicToken}`);
  const termLink = page.locator("a[data-glossary-inline='true']").first();
  await expect(termLink).toBeVisible();
  const sourceId = await termLink.getAttribute("data-glossary-source-id") ?? "";
  expect(sourceId).toMatch(/^glossary-source-\d+$/u);
  await termLink.click();
  const returnLink = page.getByRole("link", { name: "Вернуться к месту в тексте" });
  await expect(returnLink).toBeVisible();
  await returnLink.click();
  await expect(page).toHaveURL(new RegExp(`/audit/${audit.publicToken}#${sourceId}$`, "u"));
  await expect(page.locator(`#${sourceId}`)).toHaveCount(1);
});

test("enhancement does not create nested or duplicate term links inside a block", async ({ page }) => {
  await page.goto("/seo-audit");
  await expect(page.locator("a[data-glossary-inline='true']").first()).toBeVisible();
  await expect(page.locator("a a[data-glossary-inline='true']")).toHaveCount(0);

  const duplicateSlugs = await page.locator("p,li,dd,dt,blockquote,figcaption,td").evaluateAll((blocks) => {
    const duplicates: string[] = [];
    for (const block of blocks) {
      const slugs = Array.from(block.querySelectorAll<HTMLElement>(":scope a[data-glossary-inline='true']"))
        .map((link) => link.dataset.glossarySlug ?? "");
      for (const slug of new Set(slugs)) {
        if (slugs.filter((value) => value === slug).length > 1) duplicates.push(slug);
      }
    }
    return duplicates;
  });
  expect(duplicateSlugs).toEqual([]);
});

test("keyboard tooltip stays inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/seo-audit");
  const termLink = page.locator("a[data-glossary-inline='true']").first();
  await expect(termLink).toBeVisible();
  await termLink.focus();
  await expect.poll(() => termLink.evaluate((link) => Number(getComputedStyle(link, "::after").opacity))).toBeGreaterThan(0.5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test.describe("touch glossary term", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("first tap explains the term and the explicit link opens the glossary", async ({ page }) => {
    await page.goto("/seo-audit");
    const termLink = page.locator("a[data-glossary-inline='true']").first();
    await expect(termLink).toBeVisible();
    const sourceUrl = page.url();
    const glossaryHref = await termLink.getAttribute("href");

    await termLink.tap();

    await expect(page).toHaveURL(sourceUrl);
    const popover = page.locator("[data-glossary-touch-popover='true']");
    await expect(popover).toBeVisible();
    const tip = popover.locator("[data-glossary-touch-tip]");
    const wordCount = (await tip.textContent())?.trim().split(/\s+/u).filter(Boolean).length ?? 0;
    expect(wordCount).toBeGreaterThanOrEqual(2);
    expect(wordCount).toBeLessThanOrEqual(3);

    const detailsLink = popover.getByRole("link", { name: "Подробнее в словаре" });
    await expect(detailsLink).toHaveAttribute("href", glossaryHref ?? "");
    await detailsLink.tap();
    await expect(page).toHaveURL(/\/glossary\/[^?]+\?from=/u);
  });
});

test("does not change streamed brief content before React finishes hydration", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("hydrated")) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto("/brief");
  await expect(page.getByRole("heading", {
    name: "Расскажите о задаче Соберём предложение",
    exact: true,
  })).toBeVisible();
  await page.waitForTimeout(500);

  expect(hydrationErrors).toEqual([]);
});

test("leaves the interactive brief untouched while enhancing page copy", async ({ page }) => {
  await page.goto("/brief");
  await expect(page.locator("#main-content [data-glossary-enhanced]").first()).toBeAttached();
  await expect(page.locator(".brief-wizard [data-glossary-enhanced]")).toHaveCount(0);
});
