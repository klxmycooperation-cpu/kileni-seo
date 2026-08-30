import { legalDocumentsAreComplete, publicAuditIsEnabled, publicFormsAreEnabled } from "@/src/config/site";
import { noStoreJson } from "../../_lib/http";
import { auditRestoreIsConfigured } from "../../_lib/audit-restore";
import { database, databaseMode } from "@/src/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational status for the public audit chain. The response deliberately
 * exposes states only: no database URL, secret, token, applicant or audit data.
 */
type DatabaseHealth = "reachable" | "unreachable";
type QueueHealth = "not_required" | "idle" | "pending" | "unavailable";
type WorkerHealth = "not_required" | "healthy" | "unavailable";

export async function GET() {
  const vercel = process.env.VERCEL === "1";
  const submissions = publicFormsAreEnabled() ? "enabled" : "disabled";
  const audit = publicAuditIsEnabled() ? "enabled" : "disabled";
  const legal = legalDocumentsAreComplete() ? "complete" : "missing";
  const persistence = databaseMode;
  const restore = auditRestoreIsConfigured() ? "configured" : "missing";
  const storage = await auditStorageHealth(vercel);
  const runnerReady = vercel ? restore === "configured" : storage.worker === "healthy";
  const ready = submissions === "enabled" && audit === "enabled" && storage.database === "reachable" && persistence !== "ephemeral" && runnerReady;

  return noStoreJson({
    status: ready ? "ready" : "blocked",
    auditRunner: vercel ? "vercel_inline" : "worker",
    submissions,
    audit,
    legal,
    persistence,
    restore,
    ...storage,
  }, { status: ready ? 200 : 503 });
}

async function auditStorageHealth(vercel: boolean): Promise<{
  database: DatabaseHealth;
  queue: QueueHealth;
  worker: WorkerHealth;
  lastCompletedAt: number | null;
}> {
  try {
    const { queueStats } = await import("@/src/db/queries");
    await database.execute("SELECT 1");
    const latestResult = await database.execute("SELECT MAX(completed_at) AS completedAt FROM audits WHERE status IN ('completed', 'partial')");
    const latest = latestResult.rows[0] as { completedAt?: number | null } | undefined;
    if (vercel) {
      return { database: "reachable", queue: "not_required", worker: "not_required", lastCompletedAt: latest?.completedAt ?? null };
    }

    const stats = await queueStats();
    const pending = stats.counts.some(({ status, count }) => count > 0 && !["completed", "partial", "failed"].includes(status));
    const heartbeatAt = stats.heartbeat?.heartbeatAt ?? null;
    const worker = heartbeatAt !== null && Date.now() - heartbeatAt <= 120_000 ? "healthy" : "unavailable";
    return { database: "reachable", queue: pending ? "pending" : "idle", worker, lastCompletedAt: latest?.completedAt ?? null };
  } catch {
    return { database: "unreachable", queue: "unavailable", worker: vercel ? "not_required" : "unavailable", lastCompletedAt: null };
  }
}
