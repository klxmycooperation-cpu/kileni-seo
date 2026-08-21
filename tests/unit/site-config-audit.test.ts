import { afterEach, describe, expect, it, vi } from "vitest";

const previousPageLimit = process.env.AUDIT_PAGE_LIMIT;
const previousCacheDays = process.env.AUDIT_CACHE_DAYS;
const previousPrelaunchMode = process.env.PRELAUNCH_MODE;

afterEach(() => {
  if (previousPageLimit === undefined) delete process.env.AUDIT_PAGE_LIMIT;
  else process.env.AUDIT_PAGE_LIMIT = previousPageLimit;
  if (previousCacheDays === undefined) delete process.env.AUDIT_CACHE_DAYS;
  else process.env.AUDIT_CACHE_DAYS = previousCacheDays;
  if (previousPrelaunchMode === undefined) delete process.env.PRELAUNCH_MODE;
  else process.env.PRELAUNCH_MODE = previousPrelaunchMode;
  vi.resetModules();
});

describe("public audit limits", () => {
  it("keeps the server-owned crawl cap at 10 and the domain cache at exactly seven days", async () => {
    process.env.AUDIT_PAGE_LIMIT = "1000";
    process.env.AUDIT_CACHE_DAYS = "1";
    vi.resetModules();

    const { siteConfig } = await import("../../src/config/site");

    expect(siteConfig.audit.pageLimit).toBe(10);
    expect(siteConfig.audit.cacheDays).toBe(7);
    expect(siteConfig.audit.rateLimit).toEqual({ hourly: 12, daily: 50 });
  });

  it("does not allow a stale deployment environment to change the public audit cap", async () => {
    process.env.AUDIT_PAGE_LIMIT = "100";
    vi.resetModules();

    const { siteConfig } = await import("../../src/config/site");

    expect(siteConfig.audit.pageLimit).toBe(10);
  });

  it("returns global noindex metadata only while prelaunch mode is enabled", async () => {
    process.env.PRELAUNCH_MODE = "true";
    vi.resetModules();
    let siteModule = await import("../../src/config/site");
    expect(siteModule.prelaunchRobotsMetadata()).toEqual({ index: false, follow: false, nocache: true });

    process.env.PRELAUNCH_MODE = "false";
    vi.resetModules();
    siteModule = await import("../../src/config/site");
    expect(siteModule.prelaunchRobotsMetadata()).toBeUndefined();
  });
});
