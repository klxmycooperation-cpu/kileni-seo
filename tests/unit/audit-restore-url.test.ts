import { describe, expect, it } from "vitest";

import { withAuditRestore } from "../../src/lib/audit/restore-url";

describe("audit restore URLs", () => {
  it("adds the signed restore value without changing the audit token path", () => {
    const restore = "payload.signature";
    expect(withAuditRestore(`/audit/${"a".repeat(43)}`, restore)).toBe(`/audit/${"a".repeat(43)}?restore=payload.signature`);
  });

  it("leaves ordinary persistent-database links unchanged", () => {
    expect(withAuditRestore("/api/audits/token", undefined)).toBe("/api/audits/token");
    expect(withAuditRestore("/api/audits/token", "")).toBe("/api/audits/token");
  });
});
