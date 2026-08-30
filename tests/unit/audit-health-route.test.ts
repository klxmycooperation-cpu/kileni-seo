import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.resetModules();
});

describe("audit health route", () => {
  it("reports an unavailable Vercel audit without exposing a signing secret", async () => {
    process.env.VERCEL = "1";
    delete process.env.FORMS_ENABLED;
    process.env.AUDIT_RESTORE_SECRET = "r".repeat(32);
    vi.resetModules();

    const { GET } = await import("../../app/api/audit/health/route");
    const response = await GET();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "blocked",
      auditRunner: "vercel_inline",
      submissions: "disabled",
      persistence: "ephemeral",
      restore: "configured",
      database: "reachable",
      audit: "enabled",
      queue: "not_required",
      worker: "not_required",
      legal: "complete",
    });
    expect(JSON.stringify(body)).not.toContain(process.env.AUDIT_RESTORE_SECRET);
  });

  it("reports an explicitly disabled audit without exposing operational details", async () => {
    process.env.VERCEL = "0";
    process.env.FORMS_ENABLED = "true";
    process.env.AUDIT_ENABLED = "false";
    process.env.AUDIT_RESTORE_SECRET = "r".repeat(32);
    vi.resetModules();

    const { GET } = await import("../../app/api/audit/health/route");
    const response = await GET();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ status: "blocked", submissions: "enabled", audit: "disabled" });
    expect(JSON.stringify(body)).not.toContain(process.env.AUDIT_RESTORE_SECRET);
  });
});
