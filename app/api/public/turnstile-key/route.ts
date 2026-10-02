import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  const incomplete = Boolean(siteKey) !== Boolean(secretKey);
  return NextResponse.json(
    { siteKey: !incomplete && siteKey ? siteKey : null },
    { status: incomplete ? 503 : 200, headers: { "cache-control": "no-store, max-age=0" } },
  );
}
