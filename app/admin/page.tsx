import Link from "next/link";

import { AdminDate, AdminEmpty } from "@/src/components/admin/AdminUi";
import { SubmissionStatus } from "./_components/EntityUi";
import { requireAdmin } from "./_lib/auth";
import { adminAttentionSummary, adminDashboardData } from "./_lib/data";
import { auditStatusLabel } from "./_lib/audit-view";

export default async function AdminPage() {
  await requireAdmin();
  const [data, attention] = await Promise.all([adminDashboardData(), adminAttentionSummary()]);

  return (
    <>
      <div className="admin-title">
        <div>
          <p className="admin-kicker">Рабочий стол</p>
          <h1>Обзор обращений</h1>
          <p className="admin-title__description">Новые заявки, заполненные брифы и проверки сайта — без перехода между разными системами.</p>
        </div>
      </div>

      <Link className="admin-attention-summary" href="/admin/requests">
        <span><b>{attention.newCount}</b><small>{newRequestLabel(attention.newCount)}</small></span>
        <span className={attention.failedNotificationCount > 0 ? "admin-attention-summary__warning" : undefined}><b>{attention.failedNotificationCount}</b><small>{notificationErrorLabel(attention.failedNotificationCount)}</small></span>
        <strong>{attention.attentionCount > 0 ? "Открыть обращения, требующие внимания →" : "Открыть общую ленту обращений →"}</strong>
      </Link>

      <section className="admin-dashboard-grid" aria-label="Сводка">
        <DashboardCard href="/admin/leads" title="Заявки" total={data.leads.total} active={data.leads.active} newCount={data.leads.newCount}/>
        <DashboardCard href="/admin/briefs" title="Брифы" total={data.briefs.total} active={data.briefs.active} newCount={data.briefs.newCount}/>
        <DashboardCard href="/admin/audits" title="Аудиты" total={data.audits.total} active={data.audits.active} newCount={data.audits.newCount}/>
      </section>

      <section className="admin-dashboard-charts" aria-label="Статистика">
        <DashboardChart
          title="Обращения за 7 дней"
          description={`${data.activity.total} сохранено: заявки, брифы и запуски аудита без тестовых записей.`}
          points={data.activity.daily}
        />
        <div className="admin-card admin-dashboard-chart">
          <header className="admin-card__heading">
            <div><p className="admin-kicker">Реальные данные</p><h2>Просмотры за 7 дней</h2></div>
            <strong className="admin-dashboard-chart__total">{data.pageViews.daily.reduce((sum, point) => sum + point.count, 0)}</strong>
          </header>
          {data.pageViews.startedAt ? (
            <>
              <p className="admin-card__intro">Считаются только публичные страницы. Начало сбора: <AdminDate value={data.pageViews.startedAt}/>. Без cookies, IP, параметров ссылок и идентификаторов посетителя.</p>
              <DashboardBars points={data.pageViews.daily}/>
              {data.pageViews.topPaths.length > 0 && <ol className="admin-top-paths" aria-label="Самые просматриваемые страницы за 7 дней">
                {data.pageViews.topPaths.map((item) => <li key={item.path}><code>{item.path}</code><strong>{item.views}</strong></li>)}
              </ol>}
            </>
          ) : (
            <AdminEmpty>Просмотры ещё не собирались. Счётчик начнёт наполняться после публикации этой версии.</AdminEmpty>
          )}
        </div>
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

function notificationErrorLabel(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "ошибок уведомлений";
  if (mod10 === 1) return "ошибка уведомления";
  if (mod10 >= 2 && mod10 <= 4) return "ошибки уведомлений";
  return "ошибок уведомлений";
}

function newRequestLabel(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "новых обращений";
  if (mod10 === 1) return "новое обращение";
  if (mod10 >= 2 && mod10 <= 4) return "новых обращения";
  return "новых обращений";
}

function DashboardChart({ title, description, points }: { title: string; description: string; points: Array<{ day: string; label: string; count: number }> }) {
  return (
    <div className="admin-card admin-dashboard-chart">
      <header className="admin-card__heading">
        <div><p className="admin-kicker">Реальные данные</p><h2>{title}</h2></div>
        <strong className="admin-dashboard-chart__total">{points.reduce((sum, point) => sum + point.count, 0)}</strong>
      </header>
      <p className="admin-card__intro">{description}</p>
      <DashboardBars points={points}/>
    </div>
  );
}

function DashboardBars({ points }: { points: Array<{ day: string; label: string; count: number }> }) {
  const maximum = Math.max(1, ...points.map((point) => point.count));
  return <ol className="admin-dashboard-bars">{points.map((point) => <li key={point.day}>
    <time dateTime={point.day}>{point.label}</time>
    <progress max={maximum} value={point.count} aria-label={`${point.label}: ${point.count}`}/>
    <strong>{point.count}</strong>
  </li>)}</ol>;
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
