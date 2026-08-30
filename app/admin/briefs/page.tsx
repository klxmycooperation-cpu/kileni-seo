import Link from "next/link";

import { AdminDate, AdminEmpty, submissionStatuses } from "@/src/components/admin/AdminUi";
import { SubmissionStatus } from "../_components/EntityUi";
import { contactAction, serviceLabel } from "../_lib/presentation";
import { requireAdmin } from "../_lib/auth";
import { adminBriefList } from "../_lib/data";

export default async function AdminBriefsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const briefs = await adminBriefList(filters.q, filters.status);
  const hasFilters = Boolean(filters.q || filters.status);

  return (
    <>
      <div className="admin-title">
        <div>
          <p className="admin-kicker">Подробные обращения</p>
          <h1>Брифы</h1>
          <p className="admin-title__description">Внутри каждого брифа — ответы обычными словами, вложения, контакт и история работы.</p>
        </div>
        <span>{briefs.length} записей</span>
      </div>
      <form className="admin-filters" aria-label="Фильтры брифов">
        <label className="admin-field"><span>Поиск</span><input name="q" defaultValue={filters.q} placeholder="Имя, контакт или направление" maxLength={120}/></label>
        <label className="admin-field"><span>Статус</span><select name="status" defaultValue={filters.status ?? ""}><option value="">Все статусы</option>{submissionStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <div className="admin-filter-actions"><button type="submit">Применить</button>{hasFilters && <Link href="/admin/briefs">Сбросить</Link>}</div>
      </form>
      {briefs.length === 0 ? (
        <section className="admin-card admin-empty-state"><AdminEmpty>По выбранным фильтрам брифов нет.</AdminEmpty>{hasFilters && <Link href="/admin/briefs">Показать все брифы</Link>}</section>
      ) : (
        <div className="admin-table-wrap admin-table-wrap--records">
          <table>
            <thead><tr><th>Создан</th><th>Клиент</th><th>Контакт</th><th>Направление</th><th>Файлы</th><th>Статус</th><th></th></tr></thead>
            <tbody>{briefs.map((brief) => {
              const contact = contactAction(brief.contact);
              return (
                <tr key={brief.id}>
                  <td data-label="Создан"><AdminDate value={brief.createdAt}/></td>
                  <td data-label="Клиент"><Link className="admin-record-link" href={`/admin/briefs/${brief.id}`}>{String(brief.name)}</Link></td>
                  <td data-label="Контакт"><span className="admin-break">{contact.display}</span><small>{contact.kind === "unknown" ? "тип не определён" : contact.kind}</small></td>
                  <td data-label="Направление"><b>{serviceLabel(brief.service)}</b></td>
                  <td data-label="Файлы">{Number(brief.attachmentCount) ? `${brief.attachmentCount} шт.` : "Нет"}</td>
                  <td data-label="Статус"><SubmissionStatus value={brief.status}/></td>
                  <td data-label="Действие"><Link className="admin-open-link" href={`/admin/briefs/${brief.id}`}>Открыть →</Link></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
