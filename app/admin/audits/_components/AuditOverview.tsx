import type { AuditRow } from "@/src/db/queries";
import { AdminDate } from "@/src/components/admin/AdminUi";

import { auditStatusLabel, formatAuditDuration, type AuditIssueView } from "../../_lib/audit-view";
import { AdminContactActions } from "../../_components/EntityUi";

export function AuditOverview({ audit, issues, queue }: { audit: AuditRow; issues: readonly AuditIssueView[]; queue: unknown }) {
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const worker = queueView(queue);

  return (
    <section className="admin-section" id="overview">
      <header className="admin-section__heading"><div><p className="admin-kicker">Обзор</p><h2>Состояние проверки</h2></div><p>Основные показатели, заявка и состояние обработчика.</p></header>
      <div className="admin-metric-grid">
        <article className="admin-metric"><span>Оценка</span><strong>{audit.overallScore ?? "—"}</strong><small>{audit.grade ? `Уровень ${audit.grade}` : "Пока не рассчитана"}</small></article>
        <article className="admin-metric"><span>Найдено / подробно</span><strong>{audit.pagesDiscovered || "—"} / {audit.pagesChecked}</strong><small>Лимит подробной проверки: {audit.pageLimit}</small></article>
        <article className="admin-metric"><span>Критические / высокие</span><strong>{criticalCount} / {highCount}</strong><small>{issues.length} проблем всего</small></article>
        <article className="admin-metric"><span>Длительность</span><strong>{formatAuditDuration(audit)}</strong><small>{audit.partial ? "Частичная проверка" : "Полная в рамках лимита"}</small></article>
      </div>
      <div className="admin-grid admin-grid--summary">
        <article className="admin-card"><h3>Заявка</h3><dl className="admin-dl"><div><dt>Имя</dt><dd>{audit.name}</dd></div><div><dt>Контакт</dt><dd><AdminContactActions contact={audit.contact} contactType={audit.contactType}/></dd></div><div><dt>Тип контакта</dt><dd>{contactTypeLabel(audit.contactType)}</dd></div><div><dt>Язык отчёта</dt><dd>{audit.locale === "en" ? "Английский" : "Русский"}</dd></div></dl></article>
        <article className="admin-card"><h3>Время</h3><dl className="admin-dl"><div><dt>Создан</dt><dd><AdminDate value={audit.createdAt}/></dd></div><div><dt>Запущен</dt><dd>{audit.startedAt ? <AdminDate value={audit.startedAt}/> : "Не запускался"}</dd></div><div><dt>Завершён</dt><dd>{audit.completedAt ? <AdminDate value={audit.completedAt}/> : "Ещё не завершён"}</dd></div><div><dt>Ошибка</dt><dd>{audit.errorSummary ?? "Нет"}</dd></div></dl></article>
        <article className="admin-card"><h3>Обработчик и очередь</h3><dl className="admin-dl"><div><dt>Активных</dt><dd>{worker.activeCount}</dd></div><div><dt>В очереди</dt><dd>{worker.queuedCount}</dd></div><div><dt>Последняя активность</dt><dd>{worker.heartbeatAt ? <AdminDate value={worker.heartbeatAt}/> : "Нет данных"}</dd></div><div><dt>Текущий этап</dt><dd>{auditStatusLabel(audit.status)}</dd></div></dl></article>
      </div>
    </section>
  );
}

function contactTypeLabel(value: string): string {
  if (value === "email") return "Email";
  if (value === "telegram") return "Telegram";
  if (value === "phone") return "Телефон";
  return value || "Не определён";
}

function queueView(value: unknown): { activeCount: number; queuedCount: number; heartbeatAt: number | null } {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const counts = Array.isArray(record.counts) ? record.counts : [];
  let activeCount = 0;
  let queuedCount = 0;
  for (const item of counts) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    const count = typeof row.count === "number" ? row.count : Number(row.count) || 0;
    if (row.status === "queued") queuedCount = count;
    if (!["completed", "partial", "failed"].includes(String(row.status))) activeCount += count;
  }
  const heartbeat = typeof record.heartbeat === "object" && record.heartbeat !== null ? record.heartbeat as Record<string, unknown> : null;
  return { activeCount, queuedCount, heartbeatAt: typeof heartbeat?.heartbeatAt === "number" ? heartbeat.heartbeatAt : null };
}
