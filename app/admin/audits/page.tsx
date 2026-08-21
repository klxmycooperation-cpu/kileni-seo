import Link from "next/link";

import { AdminDate, AdminEmpty, AdminStatus } from "@/src/components/admin/AdminUi";
import { adminAuditList } from "../_lib/data";
import { requireAdmin } from "../_lib/auth";

export default async function AdminAuditsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const audits = adminAuditList(filters.q, filters.status, filters.from, filters.to);
  return (
    <>
      <div className="admin-title"><div><p className="admin-kicker">Очередь и результаты</p><h1>Аудиты</h1></div><span>{audits.length} записей</span></div>
      <form className="admin-filters admin-filters--audit">
        <input name="q" defaultValue={filters.q} placeholder="Домен или контакт" maxLength={120}/>
        <select name="status" defaultValue={filters.status ?? ""}>
          <option value="">Все статусы</option><option value="queued">queued</option><option value="crawling_pages">crawling_pages</option>
          <option value="completed">completed</option><option value="partial">partial</option><option value="failed">failed</option>
        </select>
        <input aria-label="Дата от" name="from" type="date" defaultValue={filters.from}/>
        <input aria-label="Дата до" name="to" type="date" defaultValue={filters.to}/>
        <button>Найти</button>
      </form>
      {audits.length === 0 ? <AdminEmpty/> : <div className="admin-table-wrap"><table><thead><tr><th>Создан</th><th>Домен</th><th>Контакт</th><th>Статус</th><th>Прогресс</th><th>Оценка</th></tr></thead><tbody>
        {audits.map((audit) => <tr key={audit.id}><td><AdminDate value={audit.createdAt}/></td><td><Link href={`/admin/audits/${audit.id}`}>{audit.normalizedDomain}</Link></td><td>{audit.name}<small>{audit.contact}</small></td><td><AdminStatus value={audit.status}/></td><td>{audit.pagesChecked}/{audit.pagesDiscovered || "—"}</td><td>{audit.overallScore ?? "—"}{audit.grade ? ` · ${audit.grade}` : ""}</td></tr>)}
      </tbody></table></div>}
    </>
  );
}
