import Link from "next/link";

import { AdminDate, AdminEmpty } from "@/src/components/admin/AdminUi";
import {
  auditStatusOptions,
  emailDeliveryView,
  formatAuditDuration,
  maskAuditContact,
} from "../_lib/audit-view";
import { adminAuditList, auditEmailProviderConfigured } from "../_lib/data";
import { requireAdmin } from "../_lib/auth";
import { AuditStatusBadge, EmailDeliveryBadge } from "./_components/AuditBadges";

type FilterValue = string | string[] | undefined;
type AuditFilters = {
  q?: FilterValue;
  status?: FilterValue;
  priority?: FilterValue;
  email?: FilterValue;
  records?: FilterValue;
  qa?: FilterValue;
  from?: FilterValue;
  to?: FilterValue;
};

export default async function AdminAuditsPage({ searchParams }: { searchParams: Promise<AuditFilters> }) {
  await requireAdmin();
  const rawFilters = await searchParams;
  const filters = {
    q: singleFilter(rawFilters.q),
    status: singleFilter(rawFilters.status),
    priority: singleFilter(rawFilters.priority),
    email: singleFilter(rawFilters.email),
    records: archiveFilter(rawFilters.records),
    qa: qaFilter(rawFilters.qa),
    from: singleFilter(rawFilters.from),
    to: singleFilter(rawFilters.to),
  };
  const emailProviderConfigured = auditEmailProviderConfigured();
  const loadedAudits = await adminAuditList(filters.q, filters.status, filters.from, filters.to, filters.records, filters.qa);
  const audits = loadedAudits
    .map((audit) => ({
      ...audit,
      emailDelivery: emailDeliveryView({
        contactType: audit.contactType,
        auditStatus: audit.status,
        notificationStatus: audit.emailNotificationStatus,
        notificationError: audit.emailNotificationError,
        providerConfigured: emailProviderConfigured,
      }),
    }))
    .filter((audit) => matchesPriority(audit, filters.priority))
    .filter((audit) => !filters.email || audit.emailDelivery.key === filters.email);
  const hasFilters = Object.values(rawFilters).some((value) => Array.isArray(value) ? value.some(Boolean) : Boolean(value));

  return (
    <>
      <div className="admin-title admin-title--audits">
        <div>
          <p className="admin-kicker">Очередь и результаты</p>
          <h1>Аудиты</h1>
          <p className="admin-title__description">Проверки доменов, покрытие страниц и доставка результата — в одном списке.</p>
        </div>
        <span>{audits.length} из {loadedAudits.length}</span>
      </div>

      <form className="admin-filters admin-filters--audit" aria-label="Фильтры аудитов">
        <label className="admin-field admin-field--search"><span>Поиск</span><input name="q" defaultValue={filters.q} placeholder="Домен или email" maxLength={120}/></label>
        <label className="admin-field"><span>Статус</span><select name="status" defaultValue={filters.status ?? ""}><option value="">Все статусы</option>{auditStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="admin-field"><span>Приоритет</span><select name="priority" defaultValue={filters.priority ?? ""}><option value="">Любой</option><option value="critical">Есть критические</option><option value="high">Есть высокие</option><option value="clear">Без критических и высоких</option></select></label>
        <label className="admin-field"><span>Email</span><select name="email" defaultValue={filters.email ?? ""}><option value="">Любой статус</option><option value="sent">Передано почтовому серверу</option><option value="failed">Ошибка / не отправлено</option><option value="not_connected">Не подключён</option><option value="waiting">После завершения</option><option value="not_required">Не требуется</option></select></label>
        <label className="admin-field"><span>Записи</span><select name="records" defaultValue={filters.records}><option value="active">Рабочие</option><option value="archived">Архив</option><option value="all">Рабочие и архив</option></select></label>
        <label className="admin-field"><span>QA</span><select name="qa" defaultValue={filters.qa}><option value="all">Все</option><option value="real">Без тестовых</option><option value="qa">Только тестовые</option></select></label>
        <label className="admin-field"><span>Дата от</span><input name="from" type="date" defaultValue={filters.from}/></label>
        <label className="admin-field"><span>Дата до</span><input name="to" type="date" defaultValue={filters.to}/></label>
        <div className="admin-filter-actions"><button type="submit">Применить</button>{hasFilters && <Link href="/admin/audits">Сбросить</Link>}</div>
      </form>

      {audits.length === 0 ? (
        <section className="admin-card admin-empty-state"><AdminEmpty>По выбранным фильтрам аудитов нет.</AdminEmpty>{hasFilters && <Link href="/admin/audits">Показать все аудиты</Link>}</section>
      ) : (
        <div className="admin-table-wrap admin-table-wrap--audits">
          <table className="admin-audit-table">
            <thead><tr><th>Создан</th><th>Домен и контакт</th><th>Статус</th><th>Страницы</th><th>Крит. / высок.</th><th>Длительность</th><th>Email</th><th></th></tr></thead>
            <tbody>{audits.map((audit) => (
              <tr key={audit.id}>
                <td data-label="Создан"><AdminDate value={audit.createdAt}/></td>
                <td data-label="Домен и контакт" className="admin-audit-target"><Link href={`/admin/audits/${audit.id}`}>{audit.normalizedDomain}<span aria-hidden="true">↗</span></Link><small>{audit.name} · {maskAuditContact(audit.contact, audit.contactType)}</small><RecordFlags qaLabel={audit.qaLabel} archived={Boolean(audit.archivedAt)}/></td>
                <td data-label="Статус"><AuditStatusBadge status={audit.status}/></td>
                <td data-label="Страницы"><b>{audit.pagesDiscovered || "—"}</b><small>найдено · {audit.pagesChecked} подробно</small></td>
                <td data-label="Крит. / высок.">{audit.criticalCount || audit.highCount ? <><b>{audit.criticalCount}</b> / <b>{audit.highCount}</b></> : <span className="admin-muted">0 / 0</span>}</td>
                <td data-label="Длительность">{formatAuditDuration(audit)}</td>
                <td data-label="Email"><EmailDeliveryBadge delivery={audit.emailDelivery}/></td>
                <td data-label="Действие"><Link className="admin-open-link" href={`/admin/audits/${audit.id}`}>Открыть →</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function singleFilter(value: FilterValue): string | undefined {
  const selected = Array.isArray(value) ? value[0] : value;
  const cleaned = selected?.trim().slice(0, 120);
  return cleaned || undefined;
}

function archiveFilter(value: FilterValue): "active" | "archived" | "all" {
  const selected = singleFilter(value);
  return selected === "archived" || selected === "all" ? selected : "active";
}

function qaFilter(value: FilterValue): "all" | "qa" | "real" {
  const selected = singleFilter(value);
  return selected === "qa" || selected === "real" ? selected : "all";
}

function RecordFlags({ qaLabel, archived }: { qaLabel: string | null; archived: boolean }) {
  if (!qaLabel && !archived) return null;
  return <span className="admin-record-badges">{qaLabel && <span className="admin-badge admin-badge--qa">QA · {qaLabel}</span>}{archived && <span className="admin-badge admin-badge--muted">Архив</span>}</span>;
}

function matchesPriority(audit: { criticalCount: number; highCount: number }, priority: string | undefined): boolean {
  if (priority === "critical") return audit.criticalCount > 0;
  if (priority === "high") return audit.highCount > 0;
  if (priority === "clear") return audit.criticalCount === 0 && audit.highCount === 0;
  return true;
}
