import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(() => undefined),
}));

vi.mock("../../src/db/client", () => ({
  sqlite: {
    prepare: vi.fn(() => ({ get: mocks.get })),
  },
}));

const previousEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...previousEnvironment };
  mocks.get.mockReset();
  mocks.get.mockReturnValue(undefined);
});

describe("health route", () => {
  it("reports Vercel's inline audit runner as healthy without a background worker", async () => {
    process.env.VERCEL = "1";
    process.env.HEALTH_REQUIRE_WORKER = "true";

    const { GET } = await import("../../app/api/health/route");
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      auditRunner: "vercel_inline",
      worker: "not_required",
    });
  });
});
