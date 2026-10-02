import { expect, test } from "@playwright/test";

test("applies the local Cosmos colour preview to the existing home without changing its content", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
  });
  await page.goto("/?palette=cosmos");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "cosmos");
  await expect(page.getByRole("heading", { name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
  await expect(page.locator("video[data-prompt-3d-object]")).toHaveAttribute("autoplay", "");
  await expect.poll(() => page.locator("video[data-prompt-3d-object]").evaluate((video) => (video as HTMLVideoElement).muted)).toBe(true);
  await expect(page.locator("video[data-prompt-3d-object]")).toHaveAttribute("src", "/visuals/kileni-3d-object.mp4");
  await expect(page.locator("video[data-prompt-3d-object]")).toHaveClass(/hero-reference-visual/u);
});
