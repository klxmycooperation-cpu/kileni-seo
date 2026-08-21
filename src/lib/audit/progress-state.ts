export type AuditProgressSnapshot = { status: string; result?: unknown | null };

const TERMINAL_STATUSES = new Set(["completed", "partial", "failed"]);

export function mergeAuditSnapshot<T extends AuditProgressSnapshot>(current: T | null, next: T): T {
  if (current && TERMINAL_STATUSES.has(current.status) && !TERMINAL_STATUSES.has(next.status)) return current;
  return next;
}

export function auditNeedsResult(snapshot: AuditProgressSnapshot | null): boolean {
  return Boolean(snapshot && (snapshot.status === "completed" || snapshot.status === "partial") && !snapshot.result);
}
