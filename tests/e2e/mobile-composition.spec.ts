import { expect, test } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
  await page.setViewportSize(MOBILE);
});

test("mobile hero keeps the approved copy, chart and audit action in one visible surface", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", {
    name: "Сайт есть. Пора сделать так, чтобы его находили.",
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    "Проверим сайт и простыми словами покажем, что мешает ему появляться в поиске и что исправить в первую очередь.",
    { exact: true },
  )).toBeVisible();

  const entry = page.locator(".hero-entry-actions").getByRole("link", { name: "Узнать, что мешает сайту" });
  await expect(entry).toBeVisible();
  await expect(page.locator(".hero-audit-surface")).toHaveCount(1);
  await expect(page.locator(".analytics-demo-caption")).toHaveCount(0);

  await entry.click();
  const input = page.getByLabel("Адрес сайта");
  const submit = page.locator("#free-check").getByRole("button", { name: "Узнать, что мешает сайту" });
  await expect(input).toBeVisible();
  await expect(submit).toBeVisible();
  const [inputBox, submitBox] = await Promise.all([input.boundingBox(), submit.boundingBox()]);
  expect(inputBox).not.toBeNull();
  expect(submitBox).not.toBeNull();
  expect(inputBox!.y).toBeGreaterThanOrEqual(64);
  expect(inputBox!.y).toBeLessThanOrEqual(160);
  expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(MOBILE.height);
});

test("mobile homepage changes process stages inside one visible panel", async ({ page }) => {
  await page.goto("/");

  const tabs = page.locator("[data-mobile-process-tabs]").getByRole("tab");
  await expect(tabs).toHaveCount(4);
  const panel = page.locator("#home-process-mobile-panel");
  await expect(panel).toBeVisible();
  await panel.evaluate((element) => element.scrollIntoView({ block: "center" }));

  for (let index = 0; index < 4; index += 1) {
    await tabs.nth(index).click();
    await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true");
    await expect(panel).toHaveAttribute("data-stage", String(index));
    await panel.evaluate((element) => element.scrollIntoView({ block: "center" }));
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(MOBILE.height);
  }

  const composedHeight = await page.evaluate(() => {
    const main = document.getElementById("main-content");
    const finalCta = document.querySelector<HTMLElement>(".warm-final-cta");
    if (!main || !finalCta) return Number.POSITIVE_INFINITY;
    return finalCta.getBoundingClientRect().bottom - main.getBoundingClientRect().top;
  });
  expect(composedHeight).toBeLessThanOrEqual(7.5 * MOBILE.height);
});

test("mobile brief anchors to the workspace and keeps its actions reachable", async ({ page }) => {
  await page.goto("/brief#brief");

  const workspace = page.locator(".brief-workspace#brief");
  await expect(workspace).toBeVisible();
  await expect(page.locator(".brief-mobile-summary")).toBeVisible();
  const services = page.locator(".service-choice > button");
  await expect(services).toHaveCount(6);
  await services.nth(1).click();

  const actions = page.locator(".wizard-actions");
  await expect(actions).toHaveCSS("position", "sticky");
  const actionsBox = await actions.boundingBox();
  expect(actionsBox).not.toBeNull();
  expect(actionsBox!.y + actionsBox!.height).toBeLessThanOrEqual(MOBILE.height);
});

test("mobile about uses compact disclosures and a two-column role grid", async ({ page }) => {
  await page.goto("/about");

  await expect(page.locator(".about-mobile-disclosure")).toHaveCount(4);
  const roles = page.locator(".about-roles ul");
  const columns = await roles.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
  expect(columns).toBe(2);
  const aboutHeight = await page.locator("#main-content").evaluate((main) => main.getBoundingClientRect().height);
  expect(aboutHeight).toBeLessThanOrEqual(6 * MOBILE.height);

  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of ["/", "/brief", "/about"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
