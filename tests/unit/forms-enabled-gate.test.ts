import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("FORMS_ENABLED API gate", () => {
  it.each([
    ["audits", () => import("../../app/api/audits/route")],
    ["leads", () => import("../../app/api/leads/route")],
    ["calculator", () => import("../../app/api/calculator/route")],
    ["briefs", () => import("../../app/api/briefs/route")],
  ] as const)("returns a stable unavailable response for %s before parsing input", async (path, loadRoute) => {
    vi.stubEnv("FORMS_ENABLED", "false");
    vi.resetModules();
    const route = await loadRoute();

    const response = await route.POST(new Request(`http://localhost/api/${path}`, { method: "POST" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "FORM_SUBMISSIONS_DISABLED" });
  });

  it("keeps the audit endpoint unavailable when the audit feature is disabled", async () => {
    vi.stubEnv("FORMS_ENABLED", "true");
    vi.stubEnv("AUDIT_ENABLED", "false");
    vi.resetModules();
    const route = await import("../../app/api/audits/route");

    const response = await route.POST(new Request("http://localhost/api/audits", { method: "POST" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "AUDIT_DISABLED" });
  });

  it("recognizes the verified bundled company details on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("FORMS_ENABLED", "true");
    vi.resetModules();
    const site = await import("../../src/config/site");
    expect(site.publicFormsAreEnabled()).toBe(true);
  });
});
