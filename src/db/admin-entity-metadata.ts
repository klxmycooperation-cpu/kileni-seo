import type { Transaction } from "@libsql/client";

import { database } from "./client";

export type AdminEntityType = "audit" | "lead" | "brief";
export type AdminListArchive = "active" | "archived" | "all";
export type AdminListQa = "all" | "qa" | "real";

export type AdminOfferSnapshot = {
  id: string;
  title: string;
  price?: string;
};

export type AdminEntityMetadata = {
  qaLabel: string | null;
  offerSnapshot: AdminOfferSnapshot | null;
  archivedAt: number | null;
  updatedAt: number | null;
};

type MetadataUpdate = {
  qaLabel?: string | null;
  offerSnapshot?: AdminOfferSnapshot | null;
  archived?: boolean;
};

type QueryConnection = Pick<Transaction, "execute"> | Pick<typeof database, "execute">;

const emptyMetadata: AdminEntityMetadata = {
  qaLabel: null,
  offerSnapshot: null,
  archivedAt: null,
  updatedAt: null,
};

export async function readAdminEntityMetadata(entityType: AdminEntityType, entityId: string): Promise<AdminEntityMetadata> {
  const result = await database.execute({
    sql: `SELECT qa_label AS qaLabel,offer_snapshot_json AS offerSnapshotJson,archived_at AS archivedAt,updated_at AS updatedAt
      FROM admin_entity_metadata WHERE entity_type=? AND entity_id=? LIMIT 1`,
    args: [entityType, entityId],
  });
  return metadataFromRow(result.rows[0] as Record<string, unknown> | undefined);
}

export async function updateAdminEntityMetadata(
  entityType: AdminEntityType,
  entityId: string,
  update: MetadataUpdate,
): Promise<AdminEntityMetadata | null> {
  return database.transaction((transaction) => updateAdminEntityMetadataOn(transaction, entityType, entityId, update));
}

export async function updateAdminEntityMetadataOn(
  transaction: Pick<Transaction, "execute">,
  entityType: AdminEntityType,
  entityId: string,
  update: MetadataUpdate,
): Promise<AdminEntityMetadata | null> {
  const table = entityTable(entityType);
  const entityResult = await transaction.execute({ sql: `SELECT * FROM ${table} WHERE id=? LIMIT 1`, args: [entityId] });
  const entity = entityResult.rows[0] as Record<string, unknown> | undefined;
  if (!entity) return null;

  const previousResult = await transaction.execute({
    sql: `SELECT qa_label AS qaLabel,offer_snapshot_json AS offerSnapshotJson,archived_at AS archivedAt,updated_at AS updatedAt
      FROM admin_entity_metadata WHERE entity_type=? AND entity_id=? LIMIT 1`,
    args: [entityType, entityId],
  });
  const previous = metadataFromRow(previousResult.rows[0] as Record<string, unknown> | undefined);
  const qaLabel = update.qaLabel === undefined ? previous.qaLabel : normalizeQaLabel(update.qaLabel);
  const offerSnapshot = update.offerSnapshot === undefined ? previous.offerSnapshot : normalizeOfferSnapshot(update.offerSnapshot);
  const archivedAt = update.archived === undefined ? previous.archivedAt : update.archived ? Date.now() : null;
  const updatedAt = Date.now();

  await upsertMetadata(transaction, entityType, entityId, { qaLabel, offerSnapshot, archivedAt, updatedAt });
  if (entityType === "audit" && Boolean(previous.qaLabel) !== Boolean(qaLabel)) {
    await reconcileAuditPublicMetrics(transaction, entityId, entity, Boolean(qaLabel));
  }
  return { qaLabel, offerSnapshot, archivedAt, updatedAt };
}

export async function writeAuditCreationMetadata(
  connection: QueryConnection,
  auditId: string,
  input: { qaLabel?: string; offerSnapshot?: AdminOfferSnapshot },
): Promise<void> {
  const qaLabel = normalizeQaLabel(input.qaLabel ?? null);
  const offerSnapshot = normalizeOfferSnapshot(input.offerSnapshot ?? null);
  if (!qaLabel && !offerSnapshot) return;
  await upsertMetadata(connection, "audit", auditId, {
    qaLabel,
    offerSnapshot,
    archivedAt: null,
    updatedAt: Date.now(),
  });
}

export function metadataArchiveClause(scope: AdminListArchive, alias = "metadata"): string | null {
  if (scope === "archived") return `${alias}.archived_at IS NOT NULL`;
  if (scope === "active") return `${alias}.archived_at IS NULL`;
  return null;
}

export function metadataQaClause(scope: AdminListQa, alias = "metadata"): string | null {
  if (scope === "qa") return `${alias}.qa_label IS NOT NULL`;
  if (scope === "real") return `${alias}.qa_label IS NULL`;
  return null;
}

function entityTable(entityType: AdminEntityType): "audits" | "leads" | "brief_submissions" {
  if (entityType === "audit") return "audits";
  if (entityType === "lead") return "leads";
  return "brief_submissions";
}

async function upsertMetadata(
  connection: QueryConnection,
  entityType: AdminEntityType,
  entityId: string,
  metadata: Exclude<AdminEntityMetadata, { updatedAt: null }>,
): Promise<void> {
  await connection.execute({
    sql: `INSERT INTO admin_entity_metadata(entity_type,entity_id,qa_label,offer_snapshot_json,archived_at,updated_at)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(entity_type,entity_id) DO UPDATE SET qa_label=excluded.qa_label,
      offer_snapshot_json=excluded.offer_snapshot_json,archived_at=excluded.archived_at,updated_at=excluded.updated_at`,
    args: [
      entityType,
      entityId,
      metadata.qaLabel,
      metadata.offerSnapshot ? JSON.stringify(metadata.offerSnapshot) : null,
      metadata.archivedAt,
      metadata.updatedAt,
    ],
  });
}

function normalizeQaLabel(value: string | null): string | null {
  const label = value?.trim().replace(/\s+/gu, " ").slice(0, 80) ?? "";
  return label || null;
}

function normalizeOfferSnapshot(value: AdminOfferSnapshot | null): AdminOfferSnapshot | null {
  if (!value) return null;
  const id = value.id.trim().slice(0, 120);
  const title = value.title.trim().slice(0, 200);
  const price = value.price?.trim().slice(0, 120);
  if (!id || !title) return null;
  return { id, title, ...(price ? { price } : {}) };
}

function metadataFromRow(row: Record<string, unknown> | undefined): AdminEntityMetadata {
  if (!row) return { ...emptyMetadata };
  return {
    qaLabel: typeof row.qaLabel === "string" && row.qaLabel.trim() ? row.qaLabel : null,
    offerSnapshot: parseOfferSnapshot(row.offerSnapshotJson),
    archivedAt: finiteNumber(row.archivedAt),
    updatedAt: finiteNumber(row.updatedAt),
  };
}

function parseOfferSnapshot(value: unknown): AdminOfferSnapshot | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AdminOfferSnapshot>;
    if (typeof parsed.id !== "string" || typeof parsed.title !== "string") return null;
    return normalizeOfferSnapshot({ id: parsed.id, title: parsed.title, ...(typeof parsed.price === "string" ? { price: parsed.price } : {}) });
  } catch {
    return null;
  }
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function reconcileAuditPublicMetrics(
  transaction: Pick<Transaction, "execute">,
  auditId: string,
  audit: Record<string, unknown>,
  isQa: boolean,
): Promise<void> {
  const status = String(audit.status ?? "");
  const domain = String(audit.normalized_domain ?? "").trim().toLowerCase();
  const source = String(audit.source ?? "").toLowerCase();
  const pagesChecked = Math.max(0, Math.min(10, Math.floor(Number(audit.pages_checked) || 0)));
  const completedAt = finiteNumber(audit.completed_at);
  if (!completedAt || pagesChecked <= 0 || !domain || !qualifyingSource(source, domain)) return;

  if (isQa) {
    const usage = await transaction.execute({ sql: "DELETE FROM audit_usage WHERE audit_id=?", args: [auditId] });
    if (usage.rowsAffected) {
      await transaction.execute({
        sql: "UPDATE public_metrics SET value=MAX(0,value-?),updated_at=? WHERE name='free_audit_pages'",
        args: [pagesChecked, Date.now()],
      });
    }
    if (status === "completed") {
      await transaction.execute({
        sql: `DELETE FROM completed_audit_domains WHERE normalized_domain=? AND NOT EXISTS (
          SELECT 1 FROM audits candidate
          LEFT JOIN admin_entity_metadata candidate_metadata ON candidate_metadata.entity_type='audit' AND candidate_metadata.entity_id=candidate.id
          WHERE lower(trim(candidate.normalized_domain))=? AND candidate.status='completed' AND candidate.completed_at IS NOT NULL
          AND candidate.pages_checked>0 AND candidate_metadata.qa_label IS NULL
          AND lower(candidate.source) NOT LIKE 'playwright%' AND lower(candidate.source) NOT LIKE 'integration-test%'
          AND lower(candidate.source) NOT IN ('test','fixture')
        )`,
        args: [domain, domain],
      });
    }
    return;
  }

  if ((status === "completed" || status === "partial") && !source.endsWith(":cached")) {
    const usage = await transaction.execute({ sql: "INSERT OR IGNORE INTO audit_usage(audit_id,created_at) VALUES (?,?)", args: [auditId, completedAt] });
    if (usage.rowsAffected) {
      await transaction.execute({
        sql: "UPDATE public_metrics SET value=value+?,updated_at=? WHERE name='free_audit_pages'",
        args: [pagesChecked, Date.now()],
      });
    }
  }
  if (status === "completed") {
    await transaction.execute({
      sql: "INSERT OR IGNORE INTO completed_audit_domains(normalized_domain,first_completed_at) VALUES (?,?)",
      args: [domain, completedAt],
    });
  }
}

function qualifyingSource(source: string, domain: string): boolean {
  return domain !== "test"
    && !domain.endsWith(".test")
    && !source.startsWith("playwright")
    && !source.startsWith("integration-test")
    && source !== "test"
    && source !== "fixture";
}
