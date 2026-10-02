import { database } from "@/src/db/client";
import { getAuditById, listAudits, queueStats } from "@/src/db/queries";
import { safeJsonParse } from "@/app/api/_lib/http";
import {
  metadataArchiveClause,
  metadataQaClause,
  readAdminEntityMetadata,
  type AdminListArchive,
  type AdminListQa,
} from "@/src/db/admin-entity-metadata";
import { moscowDayKey } from "@/src/lib/analytics/page-views";
import { adminNotificationEmailConfigured } from "@/src/lib/notifications/submission";
import type { AdminFeedItem, AdminNotificationSnapshot } from "@/src/lib/notifications/admin-feed";

type SqlValue = string | number | null;

export type AdminRequestEntityType = "lead" | "brief" | "audit";
export type AdminRequestState = "new" | "active" | "closed" | "notification_failed";

export type AdminRequestCenterFilters = {
  query?: string;
  entityType?: string;
  state?: string;
  from?: string;
  to?: string;
};

export type AdminRequestCenterItem = {
  id: string;
  entityType: AdminRequestEntityType;
  name: string;
  contact: string;
  contactType: string;
  subject: string;
  status: string;
  createdAt: number;
  notificationChannel: string | null;
  notificationStatus: string | null;
  notificationError: string | null;
  notifications: Array<{ channel: string; status: string; error: string | null }>;
};

async function rows<T>(sql: string, args: SqlValue[] = []): Promise<T[]> {
  const result = await database.execute({ sql, args });
  return result.rows as unknown as T[];
}

const adminRequestsCte = `WITH request_records AS (
  SELECT leads.id AS id,'lead' AS entityType,leads.name AS name,leads.contact AS contact,
    leads.contact_type AS contactType,COALESCE(NULLIF(leads.target,''),NULLIF(leads.service,''),'Заявка') AS subject,
    leads.status AS status,leads.created_at AS createdAt
  FROM leads
  WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='lead' AND metadata.entity_id=leads.id AND (metadata.archived_at IS NOT NULL OR metadata.qa_label IS NOT NULL))
  UNION ALL
  SELECT brief_submissions.id,'brief',brief_submissions.name,brief_submissions.contact,'',
    COALESCE(NULLIF(brief_submissions.service,''),'Бриф'),brief_submissions.status,brief_submissions.created_at
  FROM brief_submissions
  WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='brief' AND metadata.entity_id=brief_submissions.id AND (metadata.archived_at IS NOT NULL OR metadata.qa_label IS NOT NULL))
  UNION ALL
  SELECT audits.id,'audit',audits.name,audits.contact,audits.contact_type,audits.normalized_domain,audits.status,audits.created_at
  FROM audits
  WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='audit' AND metadata.entity_id=audits.id AND (metadata.archived_at IS NOT NULL OR metadata.qa_label IS NOT NULL))
), mapped_notifications AS (
  SELECT notification.*,
    CASE WHEN notification.entity_type='calculator' THEN 'lead' ELSE notification.entity_type END AS requestType,
    CASE WHEN notification.entity_type='calculator' THEN calculator.lead_id ELSE notification.entity_id END AS requestId
  FROM notification_events notification
  LEFT JOIN calculator_requests calculator ON notification.entity_type='calculator' AND calculator.id=notification.entity_id
), ranked_notifications AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY requestType,requestId,channel ORDER BY updated_at DESC,created_at DESC,id DESC) AS channelRank
  FROM mapped_notifications
), requests_with_notifications AS (
  SELECT request_records.*,
    (SELECT notification.channel FROM ranked_notifications notification
      WHERE notification.requestType=request_records.entityType AND notification.requestId=request_records.id
      ORDER BY notification.updated_at DESC,notification.created_at DESC,notification.id DESC LIMIT 1) AS notificationChannel,
    (SELECT notification.status FROM ranked_notifications notification
      WHERE notification.requestType=request_records.entityType AND notification.requestId=request_records.id
      ORDER BY notification.updated_at DESC,notification.created_at DESC,notification.id DESC LIMIT 1) AS notificationStatus,
    (SELECT notification.error FROM ranked_notifications notification
      WHERE notification.requestType=request_records.entityType AND notification.requestId=request_records.id
      ORDER BY notification.updated_at DESC,notification.created_at DESC,notification.id DESC LIMIT 1) AS notificationError,
    EXISTS (SELECT 1 FROM ranked_notifications notification
      WHERE notification.requestType=request_records.entityType AND notification.requestId=request_records.id AND notification.channelRank=1 AND notification.status='failed') AS hasNotificationFailure,
    (SELECT json_group_array(json_object('channel',notification.channel,'status',notification.status,'error',notification.error))
      FROM ranked_notifications notification
      WHERE notification.requestType=request_records.entityType AND notification.requestId=request_records.id AND notification.channelRank=1) AS notificationsJson
  FROM request_records
)`;

export async function adminRequestCenter(filters: AdminRequestCenterFilters): Promise<AdminRequestCenterItem[]> {
  const clauses: string[] = [];
  const parameters: SqlValue[] = [];
  const query = cleanSearch(filters.query);
  const entityType = cleanRequestEntityType(filters.entityType);
  const state = cleanRequestState(filters.state);
  const from = parseDateBoundary(filters.from, false);
  const to = parseDateBoundary(filters.to, true);

  if (query) {
    const like = `%${escapeLike(query)}%`;
    clauses.push("(name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\')");
    parameters.push(like, like, like);
  }
  if (entityType) {
    clauses.push("entityType=?");
    parameters.push(entityType);
  }
  if (state === "new") {
    clauses.push("((entityType IN ('lead','brief') AND status='new') OR (entityType='audit' AND status='queued'))");
  } else if (state === "active") {
    clauses.push("((entityType IN ('lead','brief') AND status NOT IN ('new','won','lost')) OR (entityType='audit' AND status NOT IN ('queued','completed','partial','failed')))");
  } else if (state === "closed") {
    clauses.push("((entityType IN ('lead','brief') AND status IN ('won','lost')) OR (entityType='audit' AND status IN ('completed','partial','failed')))");
  } else if (state === "notification_failed") {
    clauses.push("hasNotificationFailure=1");
  }
  if (from !== undefined) {
    clauses.push("createdAt>=?");
    parameters.push(from);
  }
  if (to !== undefined) {
    clauses.push("createdAt<=?");
    parameters.push(to);
  }

  const result = await rows<Omit<AdminRequestCenterItem, "notifications"> & { notificationsJson: string }>(`${adminRequestsCte}
    SELECT id,entityType,name,contact,contactType,subject,status,createdAt,notificationChannel,notificationStatus,notificationError,notificationsJson
    FROM requests_with_notifications${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY createdAt DESC,id DESC LIMIT 200`, parameters);
  return result.map(({ notificationsJson, ...item }) => ({ ...item, createdAt: Number(item.createdAt), notifications: JSON.parse(notificationsJson) as AdminRequestCenterItem["notifications"] }));
}

export async function adminAttentionSummary(): Promise<{ newCount: number; failedNotificationCount: number; attentionCount: number }> {
  const summary = (await rows<{ newCount: number; failedNotificationCount: number; attentionCount: number }>(`${adminRequestsCte}
    SELECT
      SUM(CASE WHEN (entityType IN ('lead','brief') AND status='new') OR (entityType='audit' AND status='queued') THEN 1 ELSE 0 END) AS newCount,
      SUM(hasNotificationFailure) AS failedNotificationCount,
      SUM(CASE WHEN ((entityType IN ('lead','brief') AND status='new') OR (entityType='audit' AND status='queued')) OR hasNotificationFailure=1 THEN 1 ELSE 0 END) AS attentionCount
    FROM requests_with_notifications`))[0];
  const newCount = Number(summary?.newCount) || 0;
  const failedNotificationCount = Number(summary?.failedNotificationCount) || 0;
  return { newCount, failedNotificationCount, attentionCount: Number(summary?.attentionCount) || 0 };
}

export async function adminNotificationSnapshot(): Promise<AdminNotificationSnapshot> {
  const [summary, latest] = await Promise.all([
    adminAttentionSummary(),
    rows<AdminFeedItem>(`${adminRequestsCte} SELECT id,entityType,createdAt FROM request_records ORDER BY createdAt DESC,id DESC LIMIT 20`),
  ]);
  return { ...summary, latest: latest.map((item) => ({ ...item, createdAt: Number(item.createdAt) })), emailConfigured: adminNotificationEmailConfigured(), checkedAt: Date.now() };
}

export async function adminAuditList(
  search?: string,
  status?: string,
  from?: string,
  to?: string,
  archive: AdminListArchive = "active",
  qa: AdminListQa = "all",
) {
  const audits = await listAudits({
    search: cleanSearch(search),
    status: cleanStatus(status),
    from: parseDateBoundary(from, false),
    to: parseDateBoundary(to, true),
    limit: 200,
    archive,
    qa,
  });
  if (!audits.length) return [];

  const placeholders = audits.map(() => "?").join(",");
  const auditIds = audits.map((audit) => audit.id);
  const [issueCounts, emailNotifications, metadataRows] = await Promise.all([
    rows<{ auditId: string; severity: string; count: number }>(`SELECT audit_id AS auditId,severity,COUNT(*) AS count
      FROM audit_issues WHERE audit_id IN (${placeholders}) AND severity IN ('critical','high')
      GROUP BY audit_id,severity`, auditIds),
    rows<{ entityId: string; status: string; error: string | null; createdAt: number }>(`SELECT entity_id AS entityId,status,error,created_at AS createdAt
      FROM notification_events WHERE entity_type='audit' AND channel='email' AND entity_id IN (${placeholders})
      ORDER BY created_at DESC`, auditIds),
    rows<{ entityId: string; qaLabel: string | null; offerSnapshotJson: string | null; archivedAt: number | null; updatedAt: number }>(`SELECT entity_id AS entityId,qa_label AS qaLabel,offer_snapshot_json AS offerSnapshotJson,archived_at AS archivedAt,updated_at AS updatedAt
      FROM admin_entity_metadata WHERE entity_type='audit' AND entity_id IN (${placeholders})`, auditIds),
  ]);
  const priorityByAudit = new Map<string, { critical: number; high: number }>();
  for (const count of issueCounts) {
    const current = priorityByAudit.get(count.auditId) ?? { critical: 0, high: 0 };
    if (count.severity === "critical") current.critical = Number(count.count) || 0;
    if (count.severity === "high") current.high = Number(count.count) || 0;
    priorityByAudit.set(count.auditId, current);
  }
  const emailByAudit = new Map<string, { status: string; error: string | null }>();
  for (const notification of emailNotifications) {
    if (!emailByAudit.has(notification.entityId)) {
      emailByAudit.set(notification.entityId, { status: notification.status, error: notification.error });
    }
  }
  const metadataByAudit = new Map(metadataRows.map((metadata) => [metadata.entityId, metadata]));

  return audits.map((audit) => ({
    ...audit,
    criticalCount: priorityByAudit.get(audit.id)?.critical ?? 0,
    highCount: priorityByAudit.get(audit.id)?.high ?? 0,
    emailNotificationStatus: emailByAudit.get(audit.id)?.status ?? null,
    emailNotificationError: emailByAudit.get(audit.id)?.error ?? null,
    qaLabel: metadataByAudit.get(audit.id)?.qaLabel ?? null,
    archivedAt: metadataByAudit.get(audit.id)?.archivedAt ?? null,
  }));
}

export function auditEmailProviderConfigured(): boolean {
  return [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASSWORD, process.env.SMTP_FROM]
    .every((value) => Boolean(value?.trim()));
}

export async function adminDashboardData() {
  const now = Date.now();
  const activitySince = now - 8 * 24 * 60 * 60 * 1_000;
  const startDay = buildDashboardDailySeries([], 7, now)[0]?.day ?? moscowDayKey(now);
  const [auditCounts, leadCounts, briefCounts, recentAudits, recentLeads, recentBriefs, activityRows, pageViewRows, pageViewSummaryRows, topPathRows] = await Promise.all([
    rows<{ status: string; count: number }>(`SELECT status,COUNT(*) AS count FROM audits
      WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='audit' AND metadata.entity_id=audits.id AND metadata.archived_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='audit' AND metadata.entity_id=audits.id AND metadata.qa_label IS NOT NULL)
      GROUP BY status`),
    rows<{ status: string; count: number }>(`SELECT status,COUNT(*) AS count FROM leads
      WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='lead' AND metadata.entity_id=leads.id AND metadata.archived_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='lead' AND metadata.entity_id=leads.id AND metadata.qa_label IS NOT NULL)
      GROUP BY status`),
    rows<{ status: string; count: number }>(`SELECT status,COUNT(*) AS count FROM brief_submissions
      WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='brief' AND metadata.entity_id=brief_submissions.id AND metadata.archived_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='brief' AND metadata.entity_id=brief_submissions.id AND metadata.qa_label IS NOT NULL)
      GROUP BY status`),
    rows<{ id: string; normalizedDomain: string; status: string; createdAt: number }>(`SELECT id,normalized_domain AS normalizedDomain,status,created_at AS createdAt
      FROM audits WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='audit' AND metadata.entity_id=audits.id AND metadata.archived_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='audit' AND metadata.entity_id=audits.id AND metadata.qa_label IS NOT NULL)
      ORDER BY created_at DESC LIMIT 5`),
    rows<{ id: string; name: string; contact: string; status: string; createdAt: number }>(`SELECT id,name,contact,status,created_at AS createdAt
      FROM leads WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='lead' AND metadata.entity_id=leads.id AND metadata.archived_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='lead' AND metadata.entity_id=leads.id AND metadata.qa_label IS NOT NULL)
      ORDER BY created_at DESC LIMIT 5`),
    rows<{ id: string; name: string; contact: string; status: string; createdAt: number }>(`SELECT id,name,contact,status,created_at AS createdAt
      FROM brief_submissions WHERE NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='brief' AND metadata.entity_id=brief_submissions.id AND metadata.archived_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='brief' AND metadata.entity_id=brief_submissions.id AND metadata.qa_label IS NOT NULL)
      ORDER BY created_at DESC LIMIT 5`),
    rows<{ day: string; count: number }>(`SELECT day,SUM(count) AS count FROM (
      SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch','+3 hours') AS day,COUNT(*) AS count FROM leads
      WHERE created_at>=?
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='lead' AND metadata.entity_id=leads.id AND (metadata.archived_at IS NOT NULL OR metadata.qa_label IS NOT NULL)) GROUP BY day
      UNION ALL
      SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch','+3 hours') AS day,COUNT(*) AS count FROM brief_submissions
      WHERE created_at>=?
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='brief' AND metadata.entity_id=brief_submissions.id AND (metadata.archived_at IS NOT NULL OR metadata.qa_label IS NOT NULL)) GROUP BY day
      UNION ALL
      SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch','+3 hours') AS day,COUNT(*) AS count FROM audits
      WHERE created_at>=?
      AND NOT EXISTS (SELECT 1 FROM admin_entity_metadata metadata WHERE metadata.entity_type='audit' AND metadata.entity_id=audits.id AND (metadata.archived_at IS NOT NULL OR metadata.qa_label IS NOT NULL)) GROUP BY day
    ) activity GROUP BY day ORDER BY day`, [activitySince, activitySince, activitySince]),
    rows<{ day: string; count: number }>(`SELECT day,SUM(views) AS count FROM page_view_daily WHERE day>=? GROUP BY day ORDER BY day`, [startDay]),
    rows<{ total: number; startedAt: number | null }>(`SELECT COALESCE(SUM(views),0) AS total,MIN(updated_at) AS startedAt FROM page_view_daily`),
    rows<{ path: string; views: number }>(`SELECT path,SUM(views) AS views FROM page_view_daily WHERE day>=? GROUP BY path ORDER BY views DESC,path LIMIT 5`, [startDay]),
  ]);

  const activity = buildDashboardDailySeries(activityRows, 7, now);
  const pageViews = buildDashboardDailySeries(pageViewRows, 7, now);
  const pageViewSummary = pageViewSummaryRows[0];

  return {
    audits: dashboardCounts(auditCounts),
    leads: dashboardCounts(leadCounts),
    briefs: dashboardCounts(briefCounts),
    recentAudits,
    recentLeads,
    recentBriefs,
    activity: { daily: activity, total: activity.reduce((sum, point) => sum + point.count, 0) },
    pageViews: {
      daily: pageViews,
      total: Number(pageViewSummary?.total) || 0,
      startedAt: pageViewSummary?.startedAt ? Number(pageViewSummary.startedAt) : null,
      topPaths: topPathRows.map((row) => ({ path: row.path, views: Number(row.views) || 0 })),
    },
  };
}

export function buildDashboardDailySeries(
  source: Array<{ day: string; count: number }>,
  days = 7,
  now = Date.now(),
): Array<{ day: string; label: string; count: number }> {
  const countByDay = new Map(source.map((row) => [row.day, Number(row.count) || 0]));
  const points: Array<{ day: string; label: string; count: number }> = [];
  for (let offset = Math.max(1, Math.floor(days)) - 1; offset >= 0; offset -= 1) {
    const timestamp = now - offset * 24 * 60 * 60 * 1_000;
    const day = moscowDayKey(timestamp);
    points.push({
      day,
      label: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow" }).format(new Date(timestamp)),
      count: countByDay.get(day) ?? 0,
    });
  }
  return points;
}

function parseDateBoundary(value: string | undefined, endOfDay: boolean): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;
  const timestamp = Date.parse(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+03:00`);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export async function adminAuditDetail(id: string) {
  const audit = await getAuditById(id);
  if (!audit) return null;
  const [pages, issues, events, notes, notifications, queue, metadata] = await Promise.all([
    rows<{ id: string; url: string; statusCode: number | null; depth: number | null; dataJson: string | null; createdAt: number }>(`SELECT id,url,status_code AS statusCode,depth,data_json AS dataJson,created_at AS createdAt
      FROM audit_pages WHERE audit_id=? ORDER BY created_at,id`, [id]),
    rows<Record<string, unknown>>(`SELECT id,code,category,severity,url,evidence,recommendation,created_at AS createdAt
      FROM audit_issues WHERE audit_id=? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at`, [id]),
    rows<{ id: number; event: string; payloadJson: string | null; createdAt: number }>(`SELECT id,event,payload_json AS payloadJson,created_at AS createdAt
      FROM audit_events WHERE audit_id=? ORDER BY id DESC LIMIT 500`, [id]),
    notesFor("audit", id),
    notificationsFor("audit", id),
    queueStats(),
    readAdminEntityMetadata("audit", id),
  ]);
  return {
    audit,
    publicResult: safeJsonParse(audit.publicResultJson),
    fullResult: safeJsonParse(audit.fullResultJson),
    pages: pages.map(({ dataJson, ...page }) => ({ ...page, data: safeJsonParse(dataJson) })),
    issues,
    events: events.map(({ payloadJson, ...event }) => ({ ...event, payload: safeJsonParse(payloadJson) })),
    notes,
    notifications,
    queue,
    metadata,
  };
}

export async function adminLeadList(search?: string, status?: string, archive: AdminListArchive = "active", qa: AdminListQa = "all") {
  const clauses: string[] = [];
  const parameters: SqlValue[] = [];
  const query = cleanSearch(search);
  const selectedStatus = cleanStatus(status);
  if (query) {
    clauses.push("(name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\' OR target LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(query)}%`;
    parameters.push(like, like, like);
  }
  if (selectedStatus) { clauses.push("status=?"); parameters.push(selectedStatus); }
  const archiveClause = metadataArchiveClause(archive);
  const qaClause = metadataQaClause(qa);
  if (archiveClause) clauses.push(archiveClause);
  if (qaClause) clauses.push(qaClause);
  return rows<Record<string, unknown> & { id: string; createdAt: number }>(`SELECT leads.id,name,contact,contact_type AS contactType,target,service,status,locale,source,created_at AS createdAt,
    metadata.qa_label AS qaLabel,metadata.archived_at AS archivedAt
    FROM leads LEFT JOIN admin_entity_metadata metadata ON metadata.entity_type='lead' AND metadata.entity_id=leads.id
    ${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`, parameters);
}

export async function adminLeadDetail(id: string) {
  const lead = (await rows<AdminLeadRow>(`SELECT id,name,contact,contact_type AS contactType,target,service,comment,status,locale,source,
    page_url AS pageUrl,utm_json AS utmJson,consent_version AS consentVersion,created_at AS createdAt
    FROM leads WHERE id=? LIMIT 1`, [id]))[0];
  if (!lead) return null;
  const [calculations, notes, notifications, metadata] = await Promise.all([
    rows<AdminCalculationRow>(`SELECT id,kind,answers_json AS answersJson,min_price AS minPrice,max_price AS maxPrice,created_at AS createdAt
      FROM calculator_requests WHERE lead_id=? ORDER BY created_at DESC`, [id]),
    notesFor("lead", id),
    notificationsFor("lead", id),
    readAdminEntityMetadata("lead", id),
  ]);
  const { utmJson, ...leadFields } = lead;
  return {
    lead: { ...leadFields, utm: safeJsonParse(utmJson) },
    calculations: calculations.map(({ answersJson, ...item }) => ({ ...item, answers: safeJsonParse(answersJson) })),
    notes,
    notifications,
    metadata,
  };
}

export async function adminBriefList(search?: string, status?: string, archive: AdminListArchive = "active", qa: AdminListQa = "all") {
  const clauses: string[] = [];
  const parameters: SqlValue[] = [];
  const query = cleanSearch(search);
  const selectedStatus = cleanStatus(status);
  if (query) {
    clauses.push("(name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\' OR service LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(query)}%`;
    parameters.push(like, like, like);
  }
  if (selectedStatus) { clauses.push("status=?"); parameters.push(selectedStatus); }
  const archiveClause = metadataArchiveClause(archive);
  const qaClause = metadataQaClause(qa);
  if (archiveClause) clauses.push(archiveClause);
  if (qaClause) clauses.push(qaClause);
  return rows<Record<string, unknown> & { id: string; createdAt: number }>(`SELECT brief_submissions.id,name,contact,locale,service,status,created_at AS createdAt,
    metadata.qa_label AS qaLabel,metadata.archived_at AS archivedAt,
    (SELECT COUNT(*) FROM attachments WHERE brief_id=brief_submissions.id) AS attachmentCount
    FROM brief_submissions LEFT JOIN admin_entity_metadata metadata ON metadata.entity_type='brief' AND metadata.entity_id=brief_submissions.id
    ${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`, parameters);
}

export async function adminBriefDetail(id: string) {
  const brief = (await rows<AdminBriefRow>(`SELECT id,name,contact,locale,service,answers_json AS answersJson,status,
    consent_version AS consentVersion,created_at AS createdAt FROM brief_submissions WHERE id=? LIMIT 1`, [id]))[0];
  if (!brief) return null;
  const [attachments, notes, notifications, metadata] = await Promise.all([
    rows<Record<string, unknown> & { id: string }>(`SELECT id,original_name AS originalName,mime,size,created_at AS createdAt
      FROM attachments WHERE brief_id=? ORDER BY created_at,id`, [id]),
    notesFor("brief", id),
    notificationsFor("brief", id),
    readAdminEntityMetadata("brief", id),
  ]);
  const { answersJson, ...briefFields } = brief;
  return {
    brief: { ...briefFields, answers: safeJsonParse(answersJson) },
    attachments,
    notes,
    notifications,
    metadata,
  };
}

function notesFor(entityType: string, entityId: string) {
  return rows<Record<string, unknown>>(`SELECT id,note,created_at AS createdAt FROM admin_notes
    WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC`, [entityType, entityId]);
}

function notificationsFor(entityType: string, entityId: string) {
  return rows<Record<string, unknown>>(`SELECT id,channel,status,error,created_at AS createdAt,updated_at AS updatedAt
    FROM notification_events WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC`, [entityType, entityId]);
}

function cleanSearch(value?: string): string | undefined {
  const cleaned = value?.trim().slice(0, 120);
  return cleaned || undefined;
}

function cleanStatus(value?: string): string | undefined {
  return value && /^[a-z_]{2,40}$/u.test(value) ? value : undefined;
}

function cleanRequestEntityType(value?: string): AdminRequestEntityType | undefined {
  return value === "lead" || value === "brief" || value === "audit" ? value : undefined;
}

function cleanRequestState(value?: string): AdminRequestState | undefined {
  return value === "new" || value === "active" || value === "closed" || value === "notification_failed" ? value : undefined;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/gu, (match) => `\\${match}`);
}

function dashboardCounts(counts: Array<{ status: string; count: number }>) {
  const byStatus = Object.fromEntries(counts.map((item) => [item.status, Number(item.count) || 0]));
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const active = Object.entries(byStatus)
    .filter(([status]) => !["completed", "partial", "failed", "won", "lost"].includes(status))
    .reduce((sum, [, count]) => sum + count, 0);
  const newCount = byStatus.new ?? byStatus.queued ?? 0;
  return { total, active, newCount, byStatus };
}

type AdminLeadRow = {
  id: string; name: string; contact: string; contactType: string; target: string | null; service: string | null; comment: string | null;
  status: string; locale: string; source: string; pageUrl: string | null; utmJson: string | null; consentVersion: string; createdAt: number;
};

type AdminBriefRow = {
  id: string; name: string; contact: string; locale: string; service: string; answersJson: string; status: string; consentVersion: string; createdAt: number;
};

type AdminCalculationRow = {
  id: string;
  kind: string;
  answersJson: string;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: number;
};
