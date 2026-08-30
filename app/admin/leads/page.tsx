import Link from "next/link";

import { AdminDate, AdminEmpty, submissionStatuses } from "@/src/components/admin/AdminUi";
import { SubmissionStatus } from "../_components/EntityUi";
import { contactAction, serviceLabel } from "../_lib/presentation";
import { requireAdmin } from "../_lib/auth";
import { adminLeadList } from "../_lib/data";

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const leads = await adminLeadList(filters.q, filters.status);
  const hasFilters = Boolean(filters.q || filters.status);

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
      <form className="admin-filters" aria-label="Фильтры заявок">
        <label className="admin-field"><span>Поиск</span><input name="q" defaultValue={filters.q} placeholder="Имя, контакт или проект" maxLength={120}/></label>
        <label className="admin-field"><span>Статус</span><select name="status" defaultValue={filters.status ?? ""}><option value="">Все статусы</option>{submissionStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
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
                  <td data-label="Клиент"><Link className="admin-record-link" href={`/admin/leads/${lead.id}`}>{String(lead.name)}</Link></td>
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
