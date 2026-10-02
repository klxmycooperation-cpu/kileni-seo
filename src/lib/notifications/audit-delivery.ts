import { database } from "../../db/client";
import { getAuditById } from "../../db/queries";
import { siteConfig } from "../../config/site";
import { buildAuditResultEmail } from "./audit-email";
import { sendEmail } from "./email";

const retryDelayMs = 5 * 60_000;

// The completed audit itself is durable work: a restart between completion and
// SMTP must not discard delivery. A shared DB lease prevents web/worker races.
export async function deliverAuditResultEmail(auditId: string, options: { now?: number; publicUrl?: string } = {}): Promise<void> {
  const audit = await getAuditById(auditId);
  if (!audit || !["completed", "partial"].includes(audit.status)
    || audit.contactType !== "email" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(audit.contact)) return;
  const now = options.now ?? Date.now();
  const id = `audit-email:${audit.id}`;
  const claimed = await database.transaction(async (transaction) => {
    const events = await transaction.execute({
      sql: "SELECT status,error,updated_at AS updatedAt FROM notification_events WHERE entity_type='audit' AND entity_id=? AND channel='email'",
      args: [audit.id],
    });
    if (events.rows.some((event) => event.status === "sent"
      || event.error === "smtp_permanent"
      || Number(event.updatedAt) > now - retryDelayMs)) return false;
    await transaction.execute({
      sql: `INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at)
        VALUES (?,'audit',?,'email','pending',NULL,?,?)
        ON CONFLICT(id) DO UPDATE SET status='pending',error=NULL,updated_at=excluded.updated_at`,
      args: [id, audit.id, now, now],
    });
    return true;
  });
  if (!claimed) return;

  const publicPath = `/audit/${encodeURIComponent(audit.publicToken)}`;
  const publicUrl = options.publicUrl ?? new URL(publicPath, process.env.APP_BASE_URL || siteConfig.baseUrl).toString();
  const email = buildAuditResultEmail({
    locale: audit.locale, publicUrl, domain: audit.normalizedDomain,
    completedAt: audit.completedAt, pagesChecked: audit.pagesChecked,
    partial: audit.status === "partial" || Boolean(audit.partial),
  });
  const result = await sendEmail({
    to: audit.contact, ...email,
    // Stable across retries; SMTP cannot guarantee exactly-once delivery after
    // a connection loss following DATA or a process crash after acceptance.
    messageId: `<audit-${audit.id}@${new URL(publicUrl).hostname}>`,
  });
  await database.execute({
    sql: "UPDATE notification_events SET status=?,error=?,updated_at=? WHERE id=?",
    args: [result.sent ? "sent" : result.reason === "not_configured" ? "skipped" : "failed",
      result.sent ? null : result.retryable === false ? "smtp_permanent" : result.reason ?? "smtp_failed", now, id],
  });
}

export async function retryPendingAuditEmails(now = Date.now()): Promise<void> {
  const pending = await database.execute({
    sql: `SELECT a.id FROM audits a
      WHERE a.status IN ('completed','partial') AND a.contact_type='email' AND a.contact<>''
      AND NOT EXISTS (SELECT 1 FROM notification_events n WHERE n.entity_type='audit' AND n.entity_id=a.id AND n.channel='email'
        AND (n.status='sent' OR n.error='smtp_permanent' OR n.updated_at>?))
      ORDER BY a.completed_at ASC LIMIT 1`,
    args: [now - retryDelayMs],
  });
  for (const row of pending.rows) await deliverAuditResultEmail(String(row.id), { now });
}
