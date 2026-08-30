import { NextResponse } from "next/server";

import { getFreeAuditUsageCount } from "../../../../src/db/public-metrics";
import { FREE_AUDIT_PAGE_BASELINE } from "../../../../src/config/public-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { count: FREE_AUDIT_PAGE_BASELINE + await getFreeAuditUsageCount() },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
