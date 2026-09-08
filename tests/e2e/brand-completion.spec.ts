import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("uses the approved SVG wordmark and exposes the phone in both headers", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  await expect(page.locator(".site-header .brand-logo__wordmark")).toHaveText("KILENIseo");
  await expect(page.locator(".site-header .brand-logo svg")).toHaveAttribute("viewBox", "0 0 242 54");
  await expect(page.locator(".site-header .brand-logo__name")).toHaveText("KILENI");
  await expect(page.locator(".site-header .brand-logo__descriptor")).toHaveText("seo");
  await expect(page.locator(".site-header .header-phone--desktop")).toHaveAttribute("href", "tel:+79252256020");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".menu-button").click();
  await expect(page.locator("#mobile-menu .header-phone")).toHaveAttribute("href", /^tel:/u);
});

test("finishes the KILENI intro at its natural pace and offers an explicit skip", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const intro = page.locator(".brand-intro-v9");
  await expect(intro.locator(".brand-intro-v9__kil")).toHaveText("KIL");
  await expect(intro.locator(".brand-intro-v9__ni")).toHaveText("NI");
  await expect(intro.locator(".brand-intro-v9__e")).toHaveText("E");
  await expect(intro.locator(".brand-intro-v9__s")).toHaveText("S");
  await expect(intro.locator(".brand-intro-v9__o")).toHaveText("O");
  await expect(intro.locator(".brand-intro-v9__slogan").first()).toContainText("Разбираем по буквам");
  await expect(page.getByRole("button", { name: "Пропустить заставку" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-last-started-at", /^\d+(?:\.\d+)?$/u);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-last-completed-at", /^\d+(?:\.\d+)?$/u);
  const clientDuration = await page.locator("html").evaluate((root) => (
    Number((root as HTMLElement).dataset.kileniIntroLastCompletedAt)
      - Number((root as HTMLElement).dataset.kileniIntroLastStartedAt)
  ));
  expect(clientDuration).toBeGreaterThanOrEqual(3_800);
  expect(clientDuration).toBeLessThanOrEqual(4_500);
  await expect(page.locator(".brand-intro")).toHaveCount(0);
});

test("keeps both intro controls readable without broken labels at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const controls = page.locator(".brand-intro-v9__controls button");
  await expect(controls).toHaveCount(2);
  for (const control of await controls.all()) {
    const layout = await control.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      whiteSpace: getComputedStyle(element).whiteSpace,
    }));
    expect(layout.whiteSpace).toBe("nowrap");
    expect(layout.height).toBeLessThanOrEqual(45);
  }
});

test("keeps the intro backdrop full-bleed on a phone in both orientations", async ({ page }) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ];
  await page.setViewportSize(viewports[0]);
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    const intro = page.locator(".brand-intro-v9");
    await expect(intro).toBeVisible();
    const layout = await intro.evaluate((element) => {
      const scene = element.querySelector<SVGSVGElement>(".brand-intro-v9__scene");
      const fallbackWord = element.querySelector<SVGTextElement>(".brand-intro-v9__fallback-word");
      if (!scene || !fallbackWord) throw new Error("Brand intro scene is incomplete");
      const introRect = element.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      const wordRect = fallbackWord.getBoundingClientRect();
      return {
        intro: { x: introRect.x, y: introRect.y, width: introRect.width, height: introRect.height },
        scene: { x: sceneRect.x, y: sceneRect.y, width: sceneRect.width, height: sceneRect.height },
        word: { left: wordRect.left, top: wordRect.top, right: wordRect.right, bottom: wordRect.bottom },
        backgroundImage: getComputedStyle(element).backgroundImage,
        svgBackdropCount: scene.querySelectorAll('rect[fill="url(#kileni-v9-paper)"]').length,
        preserveAspectRatio: scene.getAttribute("preserveAspectRatio"),
        videoCount: element.querySelectorAll("video").length,
        mediaWithControls: element.querySelectorAll("audio[controls], video[controls]").length,
      };
    });

    expect(layout.intro.x).toBeCloseTo(0, 0);
    expect(layout.intro.y).toBeCloseTo(0, 0);
    expect(layout.intro.width).toBeCloseTo(viewport.width, 0);
    expect(layout.intro.height).toBeCloseTo(viewport.height, 0);
    expect(layout.scene).toEqual(layout.intro);
    expect(layout.backgroundImage).toContain("radial-gradient");
    expect(layout.svgBackdropCount).toBe(0);
    expect(layout.preserveAspectRatio).toBe("xMidYMid meet");
    expect(layout.videoCount).toBe(0);
    expect(layout.mediaWithControls).toBe(0);
    expect(layout.word.left).toBeGreaterThanOrEqual(-1);
    expect(layout.word.top).toBeGreaterThanOrEqual(-1);
    expect(layout.word.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(layout.word.bottom).toBeLessThanOrEqual(viewport.height + 1);
  }
});

test("uses an opaque isolated layer for the mobile intro", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const surface = await page.locator(".brand-intro-v9").evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, isolation: style.isolation };
  });

  expect(surface.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(surface.isolation).toBe("isolate");
});

test("seals the mobile canvas while the intro is covering a dark page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  await page.locator("html").evaluate((root) => { (root as HTMLElement).dataset.kileniTheme = "dark"; });

  const canvas = await page.locator(".brand-intro-v9").evaluate((intro) => {
    const root = document.documentElement;
    return {
      intro: getComputedStyle(intro).backgroundColor,
      html: getComputedStyle(root).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
      htmlOverscroll: getComputedStyle(root).overscrollBehaviorY,
      bodyOverscroll: getComputedStyle(document.body).overscrollBehaviorY,
    };
  });

  expect(canvas.html).toBe(canvas.intro);
  expect(canvas.body).toBe(canvas.intro);
  expect(canvas.htmlOverscroll).toBe("none");
  expect(canvas.bodyOverscroll).toBe("none");
});

test("loads intro audio only after the visitor requests sound", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const audio = page.locator(".brand-intro-v9 audio");
  await expect(audio).not.toHaveAttribute("src");
  await expect(audio).toHaveAttribute("preload", "none");
  await page.getByRole("button", { name: "Включить звук" }).click();
  await expect(audio).toHaveAttribute("src", "/brand/kileni-intro-foley-v9.m4a");
});

test("holds the E still for the approved pause before forming SEO", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-e-hold-reached", "true");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-seo-forming-reached", "true");
  const samples = await page.locator("html").evaluate((root) => ({
    eDuringPause: (root as HTMLElement).dataset.kileniIntroEHoldTransform,
    sDuringPause: Number((root as HTMLElement).dataset.kileniIntroEHoldSOpacity),
    eAfterPause: (root as HTMLElement).dataset.kileniIntroSeoFormingTransform,
    sAfterPause: Number((root as HTMLElement).dataset.kileniIntroSeoFormingSOpacity),
  }));

  expect(samples.eDuringPause).toBe(samples.eAfterPause);
  expect(samples.sDuringPause).toBeLessThan(0.01);
  expect(samples.sAfterPause).toBeGreaterThan(0.5);
});

test("animates the verified case score when the selected case changes", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.goto("/");

  const caseExplorer = page.locator(".home-case-explorer");
  await expect(caseExplorer).toBeVisible();
  const firstScore = caseExplorer.locator("[data-score-from='35'][data-score-to='93']");
  await expect(firstScore.locator(".visually-hidden")).toHaveText("35 → 93");
  await expect(firstScore.locator("[aria-hidden='true']")).toContainText("35 → 93");
  await caseExplorer.getByRole("tab", { name: /засорсервис/i }).click();
  const secondScore = caseExplorer.locator("[data-score-from='37'][data-score-to='80']");
  await expect(secondScore.locator(".visually-hidden")).toHaveText("37 → 80");
  await expect(secondScore.locator("[aria-hidden='true']")).toContainText("37 → 80");
});

test("describes the hero chart without adding decorative data points to the Tab order", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.goto("/");

  const chart = page.getByRole("group", { name: /Динамика поисковой видимости с марта по август/u });
  await expect(chart).toBeVisible();
  await expect(chart.locator("title")).toHaveText("Динамика поисковой видимости с марта по август");
  await expect(chart.locator("desc")).toContainText("Март: 34%");
  await expect(chart.locator("[tabindex='0']")).toHaveCount(0);
});

test("finishes the intro through a short controlled final state", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro-v9")).toBeVisible();

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await page.evaluate(() => window.__kileniFinishBrandIntro?.());
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "finishing");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-last-finish-started-at", /^\d+(?:\.\d+)?$/u);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-last-completed-at", /^\d+(?:\.\d+)?$/u);
  const elapsed = await page.locator("html").evaluate((root) => (
    Number((root as HTMLElement).dataset.kileniIntroLastCompletedAt)
      - Number((root as HTMLElement).dataset.kileniIntroLastFinishStartedAt)
  ));

  expect(elapsed).toBeGreaterThanOrEqual(200);
  expect(elapsed).toBeLessThanOrEqual(360);
});

test("uses the short static intro on constrained connections", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "2g" },
    });
  });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-mode", "lite");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 1_500 });
});

test.describe("server-rendered home proof", () => {
  test.use({ javaScriptEnabled: false });

  test("contains the verified final case values before hydration", async ({ page }) => {
    await page.goto("/");

    const caseExplorer = page.locator(".home-case-explorer");
    await expect(caseExplorer.locator("[data-score-from='35'][data-score-to='93'] [aria-hidden='true']")).toHaveText("35 → 93");
    await expect(caseExplorer.locator("[data-counter-from='0'][data-counter-to='509'] [aria-hidden='true']")).toHaveText("509 / 509");
    await expect(caseExplorer.locator("[data-counter-from='0'][data-counter-to='99'] [aria-hidden='true']")).toHaveText("99 / 100");
  });
});
