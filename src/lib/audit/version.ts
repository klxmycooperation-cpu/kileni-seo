/** Increment whenever persisted audit results or their scoring semantics change. */
export const AUDIT_RESULT_VERSION = 2 as const;
export const CURRENT_AUDIT_RESULT_VERSION = 4 as const;

export function hasCurrentAuditResultVersion(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    (value as Record<string, unknown>).resultVersion === CURRENT_AUDIT_RESULT_VERSION &&
    (value as Record<string, unknown>).contractVersion === 3;
}

/**
 * Cache reuse is stricter than snapshot readability. A stored result can still
 * be rendered after the sampling semantics change, but it must not be cloned
 * as the answer to a new audit request.
 */
export function hasCurrentAuditCacheSemantics(value: unknown, engineVersion: string): boolean {
  return hasCurrentAuditResultVersion(value) &&
    (value as Record<string, unknown>).engineVersion === engineVersion;
}

export function hasAuditResultVersion3(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    (value as Record<string, unknown>).resultVersion === 3 &&
    (value as Record<string, unknown>).contractVersion === 2;
}

export function hasAuditResultVersion4(value: unknown): boolean {
  return hasCurrentAuditResultVersion(value);
}
