import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(async () => ({ rows: [] })),
}));

vi.mock("../../src/db/client", () => ({
  database: {
    execute: mocks.execute,
  },
}));

const previousEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...previousEnvironment };
  mocks.execute.mockReset();
  mocks.execute.mockResolvedValue({ rows: [] });
});

describe("health route", () => {
  it("reports Vercel's inline audit runner as healthy without a background worker", async () => {
    process.env.VERCEL = "1";
    process.env.HEALTH_REQUIRE_WORKER = "true";

    const { GET } = await import("../../app/api/health/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      auditRunner: "vercel_inline",
      worker: "not_required",
    });
  });
});
