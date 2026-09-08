import type { AdminEntityMetadata, AdminOfferSnapshot } from "@/src/db/admin-entity-metadata";

type UnknownRecord = Record<string, unknown>;

type LeadDetail = {
  lead: UnknownRecord;
  calculations: UnknownRecord[];
  notes: UnknownRecord[];
  notifications: UnknownRecord[];
  metadata: AdminEntityMetadata;
};

type BriefDetail = {
  brief: UnknownRecord;
  attachments: UnknownRecord[];
  notes: UnknownRecord[];
  notifications: UnknownRecord[];
  metadata: AdminEntityMetadata;
};

export function buildLeadExport(detail: LeadDetail, exportedAt = new Date().toISOString()) {
  return {
    kind: "lead" as const,
    exportedAt,
    record: detail.lead,
    calculations: detail.calculations,
    notes: detail.notes,
    notifications: detail.notifications,
    metadata: detail.metadata,
  };
}

export function buildBriefExport(detail: BriefDetail, exportedAt = new Date().toISOString()) {
  return {
    kind: "brief" as const,
    exportedAt,
    record: detail.brief,
    offerSnapshot: briefOfferSnapshot(detail.brief.answers),
    attachments: detail.attachments.map((attachment) => Object.fromEntries(
      Object.entries(attachment).filter(([key]) => key !== "storageName"),
    )),
    notes: detail.notes,
    notifications: detail.notifications,
    metadata: detail.metadata,
  };
}

export function entityJsonDownload(body: unknown, filename: string): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function briefOfferSnapshot(value: unknown): AdminOfferSnapshot | null {
  if (!isRecord(value)) return null;
  const id = text(value.sourceOffer);
  const title = text(value.selectedOfferTitle);
  const price = text(value.selectedOfferPrice);
  if (!id || !title) return null;
  return { id, title, ...(price ? { price } : {}) };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
