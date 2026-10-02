import { NextResponse } from "next/server";

import { adminNotificationSnapshot } from "@/app/admin/_lib/data";
import { apiError } from "../../_lib/http";
import { adminGuard } from "../_lib/guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = adminGuard(request);
  if (guard) return guard;
  try {
    return NextResponse.json(await adminNotificationSnapshot(), { headers: { "cache-control": "private, no-store" } });
  } catch {
    return apiError(503, "NOTIFICATIONS_UNAVAILABLE", "Не удалось обновить обращения");
  }
}
