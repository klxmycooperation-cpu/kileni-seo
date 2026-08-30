/** Increment whenever persisted audit results or their scoring semantics change. */
export const AUDIT_RESULT_VERSION = 2 as const;

export function hasCurrentAuditResultVersion(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    (value as Record<string, unknown>).resultVersion === AUDIT_RESULT_VERSION;
}
