import { expect, test } from "@playwright/test";

const expected = [
  ["phone", "tel:+79252256020"],
  ["telegram", "https://t.me/kmdozz"],
  ["max", "https://web.max.ru/"],
] as const;

for (const path of ["/contacts", "/en/contacts"] as const) {
  test(`${path} shows the approved contact channels with loaded colour icons`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);

    const cards = page.locator(".contact-grid .public-contact-links--cards");
    await expect(cards.locator(".public-contact-link")).toHaveCount(expected.length);

    for (const [kind, href] of expected) {
      const contact = cards.locator(`[data-contact-kind="${kind}"]`);
      await expect(contact).toHaveAttribute("href", href);
      await expect(contact.locator("img")).toBeVisible();
      await expect.poll(() => contact.locator("img").evaluate((image) => ({
        filter: getComputedStyle(image).filter,
        loaded: (image as HTMLImageElement).naturalWidth > 0,
      }))).toEqual({ filter: "none", loaded: true });
    }

    const maxCopy = cards.locator('[data-contact-kind="max"]');
    await expect(maxCopy).toContainText("+7 925 225-60-20");
    await expect(maxCopy).toContainText(path.startsWith("/en") ? "Find in MAX by phone" : "Найти в MAX по номеру");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("about, footer and structured data use the same public contacts", async ({ page }) => {
  await page.goto("/about");

  const aboutContacts = page.locator(".about-next .public-contact-links--compact");
  await expect(aboutContacts.locator(".public-contact-link")).toHaveCount(expected.length);
  await expect(page.locator(".site-footer .footer-contacts .public-contact-link")).toHaveCount(expected.length);

  const structuredData = await page.locator('script[type="application/ld+json"]').last().textContent();
  expect(structuredData).toContain("+7 925 225-60-20");
  expect(structuredData).toContain("https://t.me/kmdozz");
});
