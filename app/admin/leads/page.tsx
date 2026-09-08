import Link from "next/link";

import { AdminDate, AdminEmpty, submissionStatuses } from "@/src/components/admin/AdminUi";
import { SubmissionStatus } from "../_components/EntityUi";
import { contactAction, serviceLabel } from "../_lib/presentation";
import { requireAdmin } from "../_lib/auth";
import { adminLeadList } from "../_lib/data";

type FilterValue = string | string[] | undefined;
type LeadFilters = { q?: FilterValue; status?: FilterValue; records?: FilterValue; qa?: FilterValue };

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<LeadFilters> }) {
  await requireAdmin();
  const rawFilters = await searchParams;
  const filters = {
    q: singleFilter(rawFilters.q),
    status: singleFilter(rawFilters.status),
    records: archiveFilter(rawFilters.records),
    qa: qaFilter(rawFilters.qa),
  };
  const leads = await adminLeadList(filters.q, filters.status, filters.records, filters.qa);
  const hasFilters = Boolean(rawFilters.q || rawFilters.status || rawFilters.records || rawFilters.qa);

  return (
    <>
      <div className="admin-title">
        <div>
          <p className="admin-kicker">Короткие обращения</p>
          <h1>Заявки</h1>
          <p className="admin-title__description">Откройте заявку, свяжитесь с человеком и сохраните результат разговора в статусе или заметке.</p>
        </div>
        <span>{leads.length} записей</span>
      </div>
      <form className="admin-filters admin-filters--records" aria-label="Фильтры заявок">
        <label className="admin-field"><span>Поиск</span><input name="q" defaultValue={filters.q} placeholder="Имя, контакт или проект" maxLength={120}/></label>
        <label className="admin-field"><span>Статус</span><select name="status" defaultValue={filters.status ?? ""}><option value="">Все статусы</option>{submissionStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="admin-field"><span>Записи</span><select name="records" defaultValue={filters.records}><option value="active">Рабочие</option><option value="archived">Архив</option><option value="all">Рабочие и архив</option></select></label>
        <label className="admin-field"><span>QA</span><select name="qa" defaultValue={filters.qa}><option value="all">Все</option><option value="real">Без тестовых</option><option value="qa">Только тестовые</option></select></label>
        <div className="admin-filter-actions"><button type="submit">Применить</button>{hasFilters && <Link href="/admin/leads">Сбросить</Link>}</div>
      </form>
      {leads.length === 0 ? (
        <section className="admin-card admin-empty-state"><AdminEmpty>По выбранным фильтрам заявок нет.</AdminEmpty>{hasFilters && <Link href="/admin/leads">Показать все заявки</Link>}</section>
      ) : (
        <div className="admin-table-wrap admin-table-wrap--records">
          <table>
            <thead><tr><th>Создана</th><th>Клиент</th><th>Контакт</th><th>Услуга и проект</th><th>Статус</th><th></th></tr></thead>
            <tbody>{leads.map((lead) => {
              const contact = contactAction(lead.contact, lead.contactType);
              return (
                <tr key={lead.id}>
                  <td data-label="Создана"><AdminDate value={lead.createdAt}/></td>
                  <td data-label="Клиент"><Link className="admin-record-link" href={`/admin/leads/${lead.id}`}>{String(lead.name)}</Link><RecordFlags qaLabel={typeof lead.qaLabel === "string" ? lead.qaLabel : null} archived={Boolean(lead.archivedAt)}/></td>
                  <td data-label="Контакт"><span className="admin-break">{contact.display}</span><small>{contact.kind === "unknown" ? "тип не определён" : contact.kind}</small></td>
                  <td data-label="Услуга и проект"><b>{serviceLabel(lead.service)}</b><small>{String(lead.target ?? "Проект не указан")}</small></td>
                  <td data-label="Статус"><SubmissionStatus value={lead.status}/></td>
                  <td data-label="Действие"><Link className="admin-open-link" href={`/admin/leads/${lead.id}`}>Открыть →</Link></td>
                </tr>
              );
            })}</tbody>
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
