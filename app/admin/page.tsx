import Link from "next/link";

import { AdminDate, AdminEmpty } from "@/src/components/admin/AdminUi";
import { SubmissionStatus } from "./_components/EntityUi";
import { requireAdmin } from "./_lib/auth";
import { adminDashboardData } from "./_lib/data";
import { auditStatusLabel } from "./_lib/audit-view";

export default async function AdminPage() {
  await requireAdmin();
  const data = await adminDashboardData();

  return (
    <>
      <div className="admin-title">
        <div>
          <p className="admin-kicker">Рабочий стол</p>
          <h1>Обзор обращений</h1>
          <p className="admin-title__description">Новые заявки, заполненные брифы и проверки сайта — без перехода между разными системами.</p>
        </div>
      </div>

      <section className="admin-dashboard-grid" aria-label="Сводка">
        <DashboardCard href="/admin/leads" title="Заявки" total={data.leads.total} active={data.leads.active} newCount={data.leads.newCount}/>
        <DashboardCard href="/admin/briefs" title="Брифы" total={data.briefs.total} active={data.briefs.active} newCount={data.briefs.newCount}/>
        <DashboardCard href="/admin/audits" title="Аудиты" total={data.audits.total} active={data.audits.active} newCount={data.audits.newCount}/>
      </section>

      <div className="admin-grid admin-grid--dashboard">
        <section className="admin-card">
          <header className="admin-card__heading"><div><p className="admin-kicker">Последние</p><h2>Заявки</h2></div><Link href="/admin/leads">Все заявки →</Link></header>
          {data.recentLeads.length ? (
            <div className="admin-record-list">{data.recentLeads.map((lead) => <Link href={`/admin/leads/${lead.id}`} key={lead.id}><span><b>{lead.name}</b><small>{lead.contact}</small></span><span><SubmissionStatus value={lead.status}/><AdminDate value={lead.createdAt}/></span></Link>)}</div>
          ) : <AdminEmpty>Новых заявок пока нет.</AdminEmpty>}
        </section>
        <section className="admin-card">
          <header className="admin-card__heading"><div><p className="admin-kicker">Последние</p><h2>Брифы</h2></div><Link href="/admin/briefs">Все брифы →</Link></header>
          {data.recentBriefs.length ? (
            <div className="admin-record-list">{data.recentBriefs.map((brief) => <Link href={`/admin/briefs/${brief.id}`} key={brief.id}><span><b>{brief.name}</b><small>{brief.contact}</small></span><span><SubmissionStatus value={brief.status}/><AdminDate value={brief.createdAt}/></span></Link>)}</div>
          ) : <AdminEmpty>Заполненных брифов пока нет.</AdminEmpty>}
        </section>
        <section className="admin-card admin-card--dashboard-wide">
          <header className="admin-card__heading"><div><p className="admin-kicker">Последние</p><h2>SEO-аудиты</h2></div><Link href="/admin/audits">Все аудиты →</Link></header>
          {data.recentAudits.length ? (
            <div className="admin-record-list">{data.recentAudits.map((audit) => <Link href={`/admin/audits/${audit.id}`} key={audit.id}><span><b>{audit.normalizedDomain}</b><small>{auditStatusLabel(audit.status)}</small></span><AdminDate value={audit.createdAt}/></Link>)}</div>
          ) : <AdminEmpty>Запусков аудита пока нет.</AdminEmpty>}
        </section>
      </div>
    </>
  );
}

function DashboardCard({ href, title, total, active, newCount }: { href: string; title: string; total: number; active: number; newCount: number }) {
  return (
    <Link className="admin-dashboard-card" href={href}>
      <span>{title}</span>
      <strong>{total}</strong>
      <small>{newCount} новых · {active} требуют внимания</small>
      <b>Открыть раздел →</b>
    </Link>
  );
}
