import type { Metadata } from "next";
import { AuditProgressPage } from "@/src/components/pages/AuditProgressPage";
export const metadata: Metadata = { title: "Audit result", robots: { index: false, follow: false, nocache: true } };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<{ restore?: string | string[] }>;
}) {
  const { publicToken } = await params;
  const candidate = (await searchParams).restore;
  const restore = typeof candidate === "string" && candidate.length <= 20_000 ? candidate : undefined;
  return <AuditProgressPage locale="en" token={publicToken} restore={restore}/>;
}
