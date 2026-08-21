import { publicFormsAreEnabled } from "@/src/config/site";
import { noStoreJson } from "../../_lib/http";
import { auditRestoreIsConfigured } from "../../_lib/audit-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational status for the public audit chain. The response deliberately
 * exposes states only: no database URL, secret, token, applicant or audit data.
 */
export function GET() {
  const vercel = process.env.VERCEL === "1";
  const submissions = publicFormsAreEnabled() ? "enabled" : "disabled";
  const persistence = vercel ? "ephemeral" : "local";
  const restore = auditRestoreIsConfigured() ? "configured" : "missing";
  const ready = submissions === "enabled" && persistence !== "ephemeral" && restore === "configured";

  return noStoreJson({
    status: ready ? "ready" : "blocked",
    auditRunner: vercel ? "vercel_inline" : "worker",
    submissions,
    persistence,
    restore,
  }, { status: ready ? 200 : 503 });
}
