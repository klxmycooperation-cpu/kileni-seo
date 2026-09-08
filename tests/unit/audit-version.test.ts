import { describe, expect, it } from "vitest";

import {
  CURRENT_AUDIT_RESULT_VERSION,
  hasAuditResultVersion3,
  hasAuditResultVersion4,
  hasCurrentAuditCacheSemantics,
  hasCurrentAuditResultVersion,
} from "../../src/lib/audit/version";

describe("audit result version guards", () => {
  it("treats the score-free contract v4 as current", () => {
    const current = { resultVersion: 4, contractVersion: 3 };

    expect(CURRENT_AUDIT_RESULT_VERSION).toBe(4);
    expect(hasCurrentAuditResultVersion(current)).toBe(true);
    expect(hasAuditResultVersion4(current)).toBe(true);
  });

  it("keeps the v3 reader for stored legacy snapshots", () => {
    expect(hasAuditResultVersion3({ resultVersion: 3, contractVersion: 2 })).toBe(true);
    expect(hasCurrentAuditResultVersion({ resultVersion: 3, contractVersion: 2 })).toBe(false);
  });

  it("does not reuse a structurally current snapshot from older sampling semantics", () => {
    const currentEngine = "audit-pipeline-v3.1.0";

    expect(hasCurrentAuditCacheSemantics({
      resultVersion: 4,
      contractVersion: 3,
      engineVersion: currentEngine,
    }, currentEngine)).toBe(true);
    expect(hasCurrentAuditCacheSemantics({
      resultVersion: 4,
      contractVersion: 3,
      engineVersion: "audit-pipeline-v3.0.0",
    }, currentEngine)).toBe(false);
  });
});
