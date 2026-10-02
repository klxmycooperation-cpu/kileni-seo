import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("uses the approved SVG wordmark and exposes the phone in both headers", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:welcome:v1", "1"));
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

test("plays the new welcome video on the normal homepage after the old intro was seen", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  const video = page.locator(".brand-intro video");
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
  await page.getByRole("button", { name: "Пропустить заставку" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await expect.poll(() => page.locator(".brand-intro video").evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
  await page.getByRole("button", { name: "Пропустить заставку" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
});

for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
  test(`starts the ${name} welcome video with a previously completed viewing`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("kileni:intro:welcome:v1", "1"));
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
    const video = page.locator(".brand-intro video");
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
    await page.getByRole("button", { name: "Пропустить заставку" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");

    // Client-side navigation still keeps the completed viewing out of the way.
    if (name === "mobile") await page.locator(".menu-button").click();
    await page.locator(name === "mobile" ? "#mobile-menu" : ".desktop-nav").getByRole("link", { name: "Кейсы", exact: true }).click();
    await expect(page).toHaveURL(/\/cases$/u);
    await page.locator(".site-header .brand-logo").click();
    await expect(page).toHaveURL(/\/$/u);
    await expect(page.locator(".brand-intro")).toHaveCount(0);
  });
}

test("never loads the static logo during a normal video intro", async ({ page }) => {
  const posterRequests: string[] = [];
  page.on("request", (request) => {
    if (/kileni-welcome-.*-poster\.png/u.test(request.url())) posterRequests.push(request.url());
  });
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  // The finished logo must not enter the initial HTML or the first paint,
  // even if a browser briefly paints before hydration.
  expect((await response!.text()).includes('class="brand-intro-video__poster"')).toBe(false);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await expect(page.locator(".brand-intro-video__poster")).toHaveCount(0);
  await expect.poll(() => page.locator(".brand-intro video").evaluate((video) => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(.3);
  expect(posterRequests).toEqual([]);
});

test("waits for the static logo to load before the short reduced intro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let releasePoster!: () => void;
  const loading = new Promise<void>((resolve) => { releasePoster = resolve; });
  await page.route("**/brand/kileni-welcome-*-poster.png", async (route) => {
    await loading;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".brand-intro-video__poster")).toHaveCount(1);
    await page.waitForTimeout(400);
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "pending");
    releasePoster();
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 1_500 });
  } finally {
    releasePoster();
  }
});

for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
  test(`keeps the ${name} loading image continuous with the first video frame`, async ({ page }) => {
    await page.setViewportSize(viewport);
    let releaseVideo!: () => void;
    const loading = new Promise<void>((resolve) => { releaseVideo = resolve; });
    await page.route("**/brand/kileni-welcome-*.mp4", async (route) => {
      await loading;
      await route.continue();
    });
    try {
      await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "pending");
      await expect.poll(() => page.locator(".brand-intro picture img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      const clip = { x: 0, y: 0, width: viewport.width, height: viewport.height - 84 };
      const pending = await page.screenshot({ clip });

      releaseVideo();
      await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
      const video = page.locator(".brand-intro video");
      await video.evaluate((element) => {
        const media = element as HTMLVideoElement;
        media.pause();
        media.currentTime = 0;
      });
      await expect.poll(() => video.evaluate((element) => {
        const media = element as HTMLVideoElement;
        return !media.seeking && media.currentTime === 0 && media.readyState >= 2;
      })).toBe(true);
      const firstFrame = await page.screenshot({ clip });
      await test.info().attach("loading", { body: pending, contentType: "image/png" });
      await test.info().attach("first-video-frame", { body: firstFrame, contentType: "image/png" });
      const before = await sharp(pending).removeAlpha().raw().toBuffer();
      const after = await sharp(firstFrame).removeAlpha().raw().toBuffer();
      let difference = 0;
      let changedPixels = 0;
      for (let i = 0; i < before.length; i += 3) {
        const delta = [0, 1, 2].map((channel) => Math.abs(before[i + channel] - after[i + channel]));
        difference += delta[0] + delta[1] + delta[2];
        if (Math.max(...delta) > 32) changedPixels++;
      }
      // Image/video colour conversion differs slightly in WebKit. A bright
      // logo disappearing between frames is a much larger, local change.
      expect(difference / before.length).toBeLessThan(6);
      expect(changedPixels / (before.length / 3)).toBeLessThan(.005);
    } finally {
      releaseVideo();
    }
  });
}

for (const finish of ["skip", "complete"] as const) {
  test(`replays the welcome video on a normal homepage reload after ${finish}`, async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
    if (finish === "skip") await page.getByRole("button", { name: "Пропустить заставку" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");

    await page.reload({ waitUntil: "domcontentloaded" });
    const video = page.locator(".brand-intro video");
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
    await page.getByRole("button", { name: "Пропустить заставку" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");

    await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "О компании", exact: true }).click();
    await page.locator(".site-header .brand-logo").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".brand-intro")).toHaveCount(0);
  });
}

test("finishes the KILENI intro at its natural pace and offers an explicit skip", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const intro = page.locator(".brand-intro-v9");
  const video = intro.locator("video");
  await expect(video).toHaveAttribute("src", "/brand/kileni-welcome-mobile.mp4");
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
  await expect(page.getByRole("button", { name: "Пропустить заставку" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-last-started-at", /^\d+(?:\.\d+)?$/u);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro-last-completed-at", /^\d+(?:\.\d+)?$/u);
  const clientDuration = await page.locator("html").evaluate((root) => (
    Number((root as HTMLElement).dataset.kileniIntroLastCompletedAt)
      - Number((root as HTMLElement).dataset.kileniIntroLastStartedAt)
  ));
  expect(clientDuration).toBeGreaterThanOrEqual(5_000);
  expect(clientDuration).toBeLessThanOrEqual(6_000);
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
    await expect(intro.locator("video")).toHaveAttribute("src", viewport.width < viewport.height ? "/brand/kileni-welcome-mobile.mp4" : "/brand/kileni-welcome-desktop.mp4");
    const layout = await intro.evaluate((element) => {
      const scene = element.querySelector<HTMLVideoElement>("video");
      if (!scene) throw new Error("Brand intro video is missing");
      const introRect = element.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      return {
        intro: { x: introRect.x, y: introRect.y, width: introRect.width, height: introRect.height },
        scene: { x: sceneRect.x, y: sceneRect.y, width: sceneRect.width, height: sceneRect.height },
        objectFit: getComputedStyle(scene).objectFit,
        src: scene.getAttribute("src"),
        videoCount: element.querySelectorAll("video").length,
        mediaWithControls: element.querySelectorAll("audio[controls], video[controls]").length,
      };
    });

    expect(layout.intro.x).toBeCloseTo(0, 0);
    expect(layout.intro.y).toBeCloseTo(0, 0);
    expect(layout.intro.width).toBeCloseTo(viewport.width, 0);
    expect(layout.intro.height).toBeCloseTo(viewport.height, 0);
    expect(layout.scene).toEqual(layout.intro);
    expect(layout.objectFit).toBe("contain");
    expect(layout.src).toBe(viewport.width < viewport.height ? "/brand/kileni-welcome-mobile.mp4" : "/brand/kileni-welcome-desktop.mp4");
    expect(layout.videoCount).toBe(1);
    expect(layout.mediaWithControls).toBe(0);
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
      center: getComputedStyle(intro).getPropertyValue("--intro-paper-center").trim(),
      middle: getComputedStyle(intro).getPropertyValue("--intro-paper-middle").trim(),
      html: getComputedStyle(root).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
      htmlOverscroll: getComputedStyle(root).overscrollBehaviorY,
      bodyOverscroll: getComputedStyle(document.body).overscrollBehaviorY,
    };
  });

  expect(canvas.html).toBe(canvas.intro);
  expect(canvas.body).toBe(canvas.intro);
  expect(canvas.center).toBe("#101d2f");
  expect(canvas.middle).toBe("#07111f");
  expect(canvas.htmlOverscroll).toBe("none");
  expect(canvas.bodyOverscroll).toBe("none");
});

test("plays the supplied video muted until the visitor requests sound", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const video = page.locator(".brand-intro-v9 video");
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).muted)).toBe(true);
  await page.getByRole("button", { name: "Включить звук" }).click();
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).muted)).toBe(false);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
});

test("uses the desktop video and releases the page when skipped", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await expect(page.locator(".brand-intro-v9 video")).toHaveAttribute("src", "/brand/kileni-welcome-desktop.mp4");
  await page.getByRole("button", { name: "Пропустить заставку" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator(".brand-intro")).toHaveCount(0);
});

test("releases the page if the welcome video cannot load", async ({ page }) => {
  await page.route("**/brand/kileni-welcome-*.mp4", (route) => route.abort());
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 9000 });
  await expect(page.locator(".brand-intro")).toHaveCount(0);
});

test("does not download motion video for reduced-motion visitors", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mediaRequests: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith(".mp4")) mediaRequests.push(request.url()); });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 1500 });
  expect(mediaRequests).toEqual([]);
});

test("animates the verified case score when the selected case changes", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:welcome:v1", "1"));
  await page.goto("/");

  const caseExplorer = page.locator(".home-case-explorer");
  await expect(caseExplorer).toBeVisible();
  await caseExplorer.getByRole("tab", { name: /eco-santeh/i }).click();
  const firstScore = caseExplorer.locator("[data-score-from='35'][data-score-to='93']");
  await expect(firstScore.locator(".visually-hidden")).toHaveText("35 → 93");
  await expect(firstScore.locator("[aria-hidden='true']")).toContainText("35 → 93");
  await caseExplorer.getByRole("tab", { name: /засорсервис/i }).click();
  const secondScore = caseExplorer.locator("[data-score-from='37'][data-score-to='80']");
  await expect(secondScore.locator(".visually-hidden")).toHaveText("37 → 80");
  await expect(secondScore.locator("[aria-hidden='true']")).toContainText("37 → 80");
});

test("describes the hero chart without adding decorative data points to the Tab order", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:welcome:v1", "1"));
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

test("keeps the static logo visible while a constrained visitor skips it", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true, effectiveType: "2g" } });
    document.addEventListener("DOMContentLoaded", () => {
      const root = document.documentElement;
      const observer = new MutationObserver(() => {
        if (root.dataset.kileniIntro !== "reduced") return;
        const poster = document.querySelector(".brand-intro-video__poster");
        if (!poster) return;
        root.dataset.testPosterBeforeSkip = getComputedStyle(poster).opacity;
        window.__kileniFinishBrandIntro?.();
        root.dataset.testPosterAfterSkip = getComputedStyle(poster).opacity;
        observer.disconnect();
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-kileni-intro"] });
    }, { once: true });
  });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-test-poster-before-skip", "1");
  await expect(page.locator("html")).toHaveAttribute("data-test-poster-after-skip", "1");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
});

test.describe("server-rendered home proof", () => {
  test.use({ javaScriptEnabled: false });

  test("contains the current first case facts before hydration", async ({ page }) => {
    await page.goto("/");

    const caseExplorer = page.locator(".home-case-explorer");
    await expect(caseExplorer.getByRole("tab", { name: /mestoest-ff.ru/i })).toHaveAttribute("aria-selected", "true");
    await expect(caseExplorer.locator(".home-case-explorer__results")).toContainText("≈700");
    await expect(caseExplorer.locator(".home-case-explorer__results")).toContainText("3–4");
    await expect(caseExplorer.getByRole("tabpanel")).toContainText("21 день");
  });
});

test("resumes a pending video play after Safari aborts it in a hidden tab", async ({ page }) => {
  await page.addInitScript(() => {
    let hidden = false;
    let rejectPlay: ((error: DOMException) => void) | undefined;
    let firstPlay = true;
    const realPlay = HTMLMediaElement.prototype.play;
    const realPause = HTMLMediaElement.prototype.pause;
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => hidden ? "hidden" : "visible" });
    HTMLMediaElement.prototype.play = function () {
      if (!firstPlay) return realPlay.call(this);
      firstPlay = false;
      return new Promise<void>((_resolve, reject) => { rejectPlay = reject; });
    };
    HTMLMediaElement.prototype.pause = function () {
      if (hidden && rejectPlay) {
        rejectPlay(new DOMException("Background video playback was interrupted", "AbortError"));
        rejectPlay = undefined;
      }
      realPause.call(this);
    };
    window.addEventListener("kileni-test-visibility", (event) => {
      hidden = (event as CustomEvent<boolean>).detail;
      document.dispatchEvent(new Event("visibilitychange"));
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kileni-test-visibility", { detail: true })));
  await page.waitForTimeout(350);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await expect(page.locator(".brand-intro video")).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kileni-test-visibility", { detail: false })));
  await expect.poll(() => page.locator(".brand-intro video").evaluate((video) => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(.2);
  await page.getByRole("button", { name: "Пропустить заставку" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
});
