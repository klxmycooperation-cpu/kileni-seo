import Link from "next/link";

import { AdminDate, AdminEmpty, AdminStatus, submissionStatuses } from "@/src/components/admin/AdminUi";
import { requireAdmin } from "../_lib/auth";
import { adminBriefList } from "../_lib/data";

export default async function AdminBriefsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const briefs = adminBriefList(filters.q, filters.status);
  return <><div className="admin-title"><div><p className="admin-kicker">Развёрнутые запросы</p><h1>Брифы</h1></div><span>{briefs.length} записей</span></div>
    <form className="admin-filters"><input name="q" defaultValue={filters.q} placeholder="Имя, контакт или направление" maxLength={120}/><select name="status" defaultValue={filters.status ?? ""}><option value="">Все статусы</option>{submissionStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button>Найти</button></form>
    {briefs.length === 0 ? <AdminEmpty/> : <div className="admin-table-wrap"><table><thead><tr><th>Создан</th><th>Имя</th><th>Контакт</th><th>Направление</th><th>Файлы</th><th>Статус</th></tr></thead><tbody>{briefs.map((brief) => <tr key={brief.id}><td><AdminDate value={brief.createdAt}/></td><td><Link href={`/admin/briefs/${brief.id}`}>{String(brief.name)}</Link></td><td>{String(brief.contact)}</td><td>{String(brief.service)}</td><td>{String(brief.attachmentCount)}</td><td><AdminStatus value={brief.status}/></td></tr>)}</tbody></table></div>}
  </>;
}
