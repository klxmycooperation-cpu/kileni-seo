import { sqlite } from "@/src/db/client";
import { noStoreJson } from "../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    sqlite.prepare("SELECT 1").get();
    const inlineVercelAudit = process.env.VERCEL === "1";
    const worker = sqlite.prepare(
      "SELECT heartbeat_at AS heartbeatAt FROM worker_state WHERE name='audit-worker' LIMIT 1",
    ).get() as { heartbeatAt: number } | undefined;
    const ageMs = worker ? Math.max(0, Date.now() - worker.heartbeatAt) : null;
    const workerHealthy = ageMs !== null && ageMs <= 60_000;
    // The public Vercel route performs its bounded crawl inside the request;
    // a separate worker heartbeat is therefore neither expected nor useful.
    const requireWorker = process.env.HEALTH_REQUIRE_WORKER === "true" && !inlineVercelAudit;
    const ok = !requireWorker || workerHealthy;
    return noStoreJson({
      status: ok ? "ok" : "degraded",
      database: "ok",
      auditRunner: inlineVercelAudit ? "vercel_inline" : "worker",
      worker: inlineVercelAudit ? "not_required" : workerHealthy ? "ok" : worker ? "stale" : "not_started",
      checkedAt: new Date().toISOString(),
    }, { status: ok ? 200 : 503 });
  } catch {
    return noStoreJson({
      status: "unhealthy",
      database: "error",
      worker: "unknown",
      checkedAt: new Date().toISOString(),
    }, { status: 503 });
  }
}
