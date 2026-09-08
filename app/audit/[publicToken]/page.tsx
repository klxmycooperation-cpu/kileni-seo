import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyAuditRestoreEnvelope } from "@/app/api/_lib/audit-restore";
import { buildRestoredPublicAuditSnapshot, buildStoredPublicAuditSnapshot } from "@/app/api/_lib/audit-snapshot";
import { validOpaqueToken } from "@/app/api/_lib/http";
import { AuditProgressPage } from "@/src/components/pages/AuditProgressPage";
import { GlossaryLinkEnhancer } from "@/src/components/glossary/GlossaryLinkEnhancer";
import { getAuditByToken } from "@/src/db/queries";
import { getGlossaryLinkEntries } from "@/src/lib/glossary/linking";
export const metadata: Metadata = { title: "Результат проверки", robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
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
  if (!validOpaqueToken(publicToken)) notFound();
  let lookupFailed = false;
  let audit: Awaited<ReturnType<typeof getAuditByToken>> = null;
  try { audit = await getAuditByToken(publicToken); } catch { lookupFailed = true; }
  const restored = audit ? null : verifyAuditRestoreEnvelope(restore ?? null, publicToken);
  if (!lookupFailed && !audit && !restored) notFound();
  const initialAudit = audit
    ? buildStoredPublicAuditSnapshot(audit)
    : restored ? buildRestoredPublicAuditSnapshot(restored) : undefined;
  return <><AuditProgressPage locale="ru" token={publicToken} restore={restore} initialAudit={initialAudit}/><GlossaryLinkEnhancer locale="ru" entries={getGlossaryLinkEntries("ru")}/></>;
}
