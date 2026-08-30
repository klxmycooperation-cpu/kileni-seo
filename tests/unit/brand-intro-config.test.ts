import { describe, expect, it } from "vitest";

import {
  INTRO_BOOTSTRAP,
  INTRO_DURATION_MS,
  INTRO_FINISH_MS,
  INTRO_MAX_BLOCK_MS,
  INTRO_SESSION_KEY,
} from "../../src/components/home/brand-intro-config";

describe("brand intro lifecycle contract", () => {
  it("never blocks the home page for more than five seconds", () => {
    expect(INTRO_DURATION_MS + INTRO_FINISH_MS).toBeLessThanOrEqual(5_000);
    expect(INTRO_MAX_BLOCK_MS).toBeLessThanOrEqual(5_000);
    expect(INTRO_BOOTSTRAP).toContain(`readinessTimer = window.setTimeout(complete, ${INTRO_MAX_BLOCK_MS})`);
    expect(INTRO_BOOTSTRAP.match(/clearTimeout\(readinessTimer\)/gu)).toHaveLength(1);
  });

  it("persists completion for every visitor rather than only automated browsers", () => {
    expect(INTRO_BOOTSTRAP).toContain(`sessionStorage.setItem("${INTRO_SESSION_KEY}", "1")`);
    expect(INTRO_BOOTSTRAP).not.toContain("navigator.webdriver");
  });
});
