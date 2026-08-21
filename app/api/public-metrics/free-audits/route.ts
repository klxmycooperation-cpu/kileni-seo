import { NextResponse } from "next/server";

import { getFreeAuditUsageCount } from "../../../../src/db/public-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { count: getFreeAuditUsageCount() },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
