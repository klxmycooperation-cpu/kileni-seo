import { sqlite } from "@/src/db/client";
import { getAuditById, listAudits, queueStats } from "@/src/db/queries";
import { safeJsonParse } from "@/app/api/_lib/http";

export function adminAuditList(search?: string, status?: string, from?: string, to?: string) {
  return listAudits({
    search: cleanSearch(search),
    status: cleanStatus(status),
    from: parseDateBoundary(from, false),
    to: parseDateBoundary(to, true),
    limit: 200,
  });
}

function parseDateBoundary(value: string | undefined, endOfDay: boolean): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;
  const timestamp = Date.parse(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+03:00`);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function adminAuditDetail(id: string) {
  const audit = getAuditById(id);
  if (!audit) return null;
  const pages = sqlite.prepare(`SELECT id,url,status_code AS statusCode,depth,data_json AS dataJson,created_at AS createdAt
    FROM audit_pages WHERE audit_id=? ORDER BY created_at,id`).all(id) as Array<{
      id: string; url: string; statusCode: number | null; depth: number | null; dataJson: string | null; createdAt: number;
    }>;
  const issues = sqlite.prepare(`SELECT id,code,category,severity,url,evidence,recommendation,created_at AS createdAt
    FROM audit_issues WHERE audit_id=? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at`)
    .all(id) as Array<Record<string, unknown>>;
  const events = sqlite.prepare(`SELECT id,event,payload_json AS payloadJson,created_at AS createdAt
    FROM audit_events WHERE audit_id=? ORDER BY id DESC LIMIT 500`).all(id) as Array<{
      id: number; event: string; payloadJson: string | null; createdAt: number;
    }>;
  return {
    audit,
    publicResult: safeJsonParse(audit.publicResultJson),
    fullResult: safeJsonParse(audit.fullResultJson),
    pages: pages.map(({ dataJson, ...page }) => ({ ...page, data: safeJsonParse(dataJson) })),
    issues,
    events: events.map(({ payloadJson, ...event }) => ({ ...event, payload: safeJsonParse(payloadJson) })),
    notes: notesFor("audit", id),
    notifications: notificationsFor("audit", id),
    queue: queueStats(),
  };
}

export function adminLeadList(search?: string, status?: string) {
  const clauses: string[] = [];
  const parameters: unknown[] = [];
  const query = cleanSearch(search);
  const selectedStatus = cleanStatus(status);
  if (query) {
    clauses.push("(name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\' OR target LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(query)}%`;
    parameters.push(like, like, like);
  }
  if (selectedStatus) { clauses.push("status=?"); parameters.push(selectedStatus); }
  return sqlite.prepare(`SELECT id,name,contact,contact_type AS contactType,target,service,status,locale,source,created_at AS createdAt
    FROM leads${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`)
    .all(...parameters) as Array<Record<string, unknown> & { id: string; createdAt: number }>;
}

export function adminLeadDetail(id: string) {
  const lead = sqlite.prepare(`SELECT id,name,contact,contact_type AS contactType,target,service,comment,status,locale,source,
    page_url AS pageUrl,utm_json AS utmJson,consent_version AS consentVersion,created_at AS createdAt
    FROM leads WHERE id=? LIMIT 1`).get(id) as AdminLeadRow | undefined;
  if (!lead) return null;
  const calculations = sqlite.prepare(`SELECT id,kind,answers_json AS answersJson,min_price AS minPrice,max_price AS maxPrice,created_at AS createdAt
    FROM calculator_requests WHERE lead_id=? ORDER BY created_at DESC`).all(id) as Array<Record<string, unknown> & { answersJson: string }>;
  const { utmJson, ...leadFields } = lead;
  return {
    lead: { ...leadFields, utm: safeJsonParse(utmJson) },
    calculations: calculations.map(({ answersJson, ...item }) => ({ ...item, answers: safeJsonParse(answersJson) })),
    notes: notesFor("lead", id),
    notifications: notificationsFor("lead", id),
  };
}

export function adminBriefList(search?: string, status?: string) {
  const clauses: string[] = [];
  const parameters: unknown[] = [];
  const query = cleanSearch(search);
  const selectedStatus = cleanStatus(status);
  if (query) {
    clauses.push("(name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\' OR service LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(query)}%`;
    parameters.push(like, like, like);
  }
  if (selectedStatus) { clauses.push("status=?"); parameters.push(selectedStatus); }
  return sqlite.prepare(`SELECT id,name,contact,locale,service,status,created_at AS createdAt,
    (SELECT COUNT(*) FROM attachments WHERE brief_id=brief_submissions.id) AS attachmentCount
    FROM brief_submissions${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`)
    .all(...parameters) as Array<Record<string, unknown> & { id: string; createdAt: number }>;
}

export function adminBriefDetail(id: string) {
  const brief = sqlite.prepare(`SELECT id,name,contact,locale,service,answers_json AS answersJson,status,
    consent_version AS consentVersion,created_at AS createdAt FROM brief_submissions WHERE id=? LIMIT 1`)
    .get(id) as AdminBriefRow | undefined;
  if (!brief) return null;
  const attachments = sqlite.prepare(`SELECT id,original_name AS originalName,mime,size,created_at AS createdAt
    FROM attachments WHERE brief_id=? ORDER BY created_at,id`).all(id) as Array<Record<string, unknown> & { id: string }>;
  const { answersJson, ...briefFields } = brief;
  return {
    brief: { ...briefFields, answers: safeJsonParse(answersJson) },
    attachments,
    notes: notesFor("brief", id),
    notifications: notificationsFor("brief", id),
  };
}

function notesFor(entityType: string, entityId: string) {
  return sqlite.prepare(`SELECT id,note,created_at AS createdAt FROM admin_notes
    WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC`).all(entityType, entityId) as Array<Record<string, unknown>>;
}

function notificationsFor(entityType: string, entityId: string) {
  return sqlite.prepare(`SELECT id,channel,status,error,created_at AS createdAt,updated_at AS updatedAt
    FROM notification_events WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC`).all(entityType, entityId) as Array<Record<string, unknown>>;
}

function cleanSearch(value?: string): string | undefined {
  const cleaned = value?.trim().slice(0, 120);
  return cleaned || undefined;
}

function cleanStatus(value?: string): string | undefined {
  return value && /^[a-z_]{2,40}$/u.test(value) ? value : undefined;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/gu, (match) => `\\${match}`);
}

type AdminLeadRow = {
  id: string;
  name: string;
  contact: string;
  contactType: string;
  target: string | null;
  service: string | null;
  comment: string | null;
  status: string;
  locale: string;
  source: string;
  pageUrl: string | null;
  utmJson: string | null;
  consentVersion: string;
  createdAt: number;
};

type AdminBriefRow = {
  id: string;
  name: string;
  contact: string;
  locale: string;
  service: string;
  answersJson: string;
  status: string;
  consentVersion: string;
  createdAt: number;
};
