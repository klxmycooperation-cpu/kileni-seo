import { describe, expect, it } from "vitest";

import { auditNeedsResult, mergeAuditSnapshot, type AuditProgressSnapshot } from "../../src/lib/audit/progress-state";

describe("audit progress state", () => {
  it("does not let an older running snapshot replace a terminal result", () => {
    const completed: AuditProgressSnapshot = { status: "completed", result: { score: 91 } };
    expect(mergeAuditSnapshot<AuditProgressSnapshot>(completed, { status: "queued", result: null })).toBe(completed);
  });

  it("keeps refreshing a completed snapshot until public result details arrive", () => {
    expect(auditNeedsResult({ status: "completed", result: null })).toBe(true);
    expect(auditNeedsResult({ status: "partial", result: undefined })).toBe(true);
    expect(auditNeedsResult({ status: "completed", result: { score: 91 } })).toBe(false);
    expect(auditNeedsResult({ status: "failed", result: null })).toBe(false);
  });
});
