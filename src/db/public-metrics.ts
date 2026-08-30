import { database } from "./client";

export async function getFreeAuditUsageCount(): Promise<number> {
  try {
    const result = await database.execute("SELECT value FROM public_metrics WHERE name='free_audit_pages'");
    const row = result.rows[0] as { value?: unknown } | undefined;
    const value = Number(row?.value);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}
