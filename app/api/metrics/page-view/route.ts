import { NextResponse } from "next/server";

import { recordAnonymousPageView } from "@/src/lib/analytics/page-views";
import { clientIp, privateHash, requestOriginIsAllowed } from "@/src/lib/security/request";
import { declaredBodyTooLarge, jsonReadError, readJson } from "../../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!requestOriginIsAllowed(request)) return new NextResponse(null, { status: 403 });
  if (declaredBodyTooLarge(request, 1_024)) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try {
    body = await readJson(request, 1_024);
  } catch (error) {
    return jsonReadError(error);
  }
  const path = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).path
    : undefined;
  if (typeof path !== "string") return new NextResponse(null, { status: 422 });
  await recordAnonymousPageView(path, { visitorKey: privateHash(clientIp(request)) }).catch(() => undefined);
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}
