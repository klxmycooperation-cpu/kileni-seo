import type Database from "better-sqlite3";

import { sqlite } from "./client";

export function getFreeAuditUsageCount(connection: Database.Database = sqlite): number {
  try {
    const row = connection.prepare(
      "SELECT COUNT(*) AS value FROM completed_audit_domains",
    ).get() as { value?: unknown } | undefined;
    const value = Number(row?.value);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}
