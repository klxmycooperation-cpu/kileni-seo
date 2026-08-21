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
});
