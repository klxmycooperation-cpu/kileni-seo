import Link from "next/link";

import { AdminDate, AdminEmpty, AdminStatus, submissionStatuses } from "@/src/components/admin/AdminUi";
import { requireAdmin } from "../_lib/auth";
import { adminLeadList } from "../_lib/data";

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const leads = adminLeadList(filters.q, filters.status);
  return <><div className="admin-title"><div><p className="admin-kicker">Обращения</p><h1>Заявки</h1></div><span>{leads.length} записей</span></div>
    <form className="admin-filters"><input name="q" defaultValue={filters.q} placeholder="Имя, контакт или проект" maxLength={120}/><select name="status" defaultValue={filters.status ?? ""}><option value="">Все статусы</option>{submissionStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button>Найти</button></form>
    {leads.length === 0 ? <AdminEmpty/> : <div className="admin-table-wrap"><table><thead><tr><th>Создана</th><th>Имя</th><th>Контакт</th><th>Услуга</th><th>Проект</th><th>Статус</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><AdminDate value={lead.createdAt}/></td><td><Link href={`/admin/leads/${lead.id}`}>{String(lead.name)}</Link></td><td>{String(lead.contact)}</td><td>{String(lead.service ?? "—")}</td><td>{String(lead.target ?? "—")}</td><td><AdminStatus value={lead.status}/></td></tr>)}</tbody></table></div>}
  </>;
}
