import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import {
  INTRO_BOOTSTRAP,
  INTRO_DURATION_MS,
  INTRO_FINISH_MS,
  INTRO_MAX_BLOCK_MS,
  INTRO_SESSION_KEY,
} from "../../src/components/home/brand-intro-config";

describe("brand intro lifecycle contract", () => {
  it("starts a new homepage document even when the previous viewing was completed", () => {
    const root = { dataset: {} as Record<string, string> };
    const storage = new Map([[INTRO_SESSION_KEY, "1"]]);
    const browserWindow = {
      location: { pathname: "/", search: "" },
      sessionStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) },
      addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
      setTimeout: () => 1, clearTimeout() {},
      matchMedia: () => ({ matches: false }),
      __kileniBrandIntroReady: false,
      __kileniStartBrandIntro: undefined as (() => void) | undefined,
    };
    runInNewContext(INTRO_BOOTSTRAP, {
      window: browserWindow,
      document: { documentElement: root, readyState: "loading", visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
      navigator: { hardwareConcurrency: 8 },
      performance: { getEntriesByType: () => [{ type: "navigate" }], now: () => 100 },
      URLSearchParams, Event,
    });

    expect(root.dataset.kileniIntro).toBe("pending");
    browserWindow.__kileniBrandIntroReady = true;
    browserWindow.__kileniStartBrandIntro?.();
    expect(root.dataset.kileniIntro).toBe("play");
  });

  it("waits for a background Safari tab to become visible before spending the intro's time", () => {
    const root = { dataset: {} as Record<string, string> };
    const listeners = new Map<string, () => void>();
    const timers = new Map<number, () => void>();
    let timerId = 0;
    const doc = {
      documentElement: root, readyState: "complete", visibilityState: "hidden",
      addEventListener: (event: string, callback: () => void) => listeners.set(event, callback),
      removeEventListener: (event: string) => listeners.delete(event),
    };
    const browserWindow = {
      location: { pathname: "/", search: "" },
      sessionStorage: { getItem: () => null, setItem() {} },
      addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
      setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
      clearTimeout: (id: number) => timers.delete(id),
      matchMedia: () => ({ matches: false }),
      __kileniBrandIntroReady: true,
    };
    runInNewContext(INTRO_BOOTSTRAP, {
      window: browserWindow, document: doc,
      navigator: { hardwareConcurrency: 8 },
      performance: { getEntriesByType: () => [{ type: "navigate" }], now: () => 100 },
      URLSearchParams, Event,
    });
    expect(root.dataset.kileniIntro).toBe("pending");
    expect(timers.size).toBe(0);
    doc.visibilityState = "visible";
    listeners.get("visibilitychange")?.();
    expect(root.dataset.kileniIntro).toBe("play");
    expect(timers.size).toBe(1);
    doc.visibilityState = "hidden";
    listeners.get("visibilitychange")?.();
    expect(timers.size).toBe(0);
    expect(root.dataset.kileniIntro).toBe("play");
  });

  it("plays the supplied five-second video within the loading safety cap", () => {
    expect(INTRO_DURATION_MS).toBe(5_000);
    expect(INTRO_DURATION_MS + INTRO_FINISH_MS).toBeLessThanOrEqual(INTRO_MAX_BLOCK_MS);
    expect(INTRO_MAX_BLOCK_MS).toBeLessThanOrEqual(8_000);
    expect(INTRO_BOOTSTRAP).toContain(`readinessTimer = window.setTimeout(complete, ${INTRO_MAX_BLOCK_MS})`);
    // Both a natural completion and an early controlled exit must cancel the
    // emergency readiness timer so it cannot fire after the intro is gone.
    expect(INTRO_BOOTSTRAP.match(/clearTimeout\(readinessTimer\)/gu)!.length).toBeGreaterThanOrEqual(2);
  });

  it("persists completion for every visitor rather than only automated browsers", () => {
    expect(INTRO_BOOTSTRAP).toContain(`sessionStorage.setItem("${INTRO_SESSION_KEY}", "1")`);
    expect(INTRO_BOOTSTRAP).not.toContain("navigator.webdriver");
  });
});
