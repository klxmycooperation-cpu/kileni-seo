import { notFound } from "next/navigation";

import { validUuid } from "@/app/api/_lib/http";
import { AdminCopyButton } from "@/src/components/admin/AdminCopyButton";
import { AdminEntityControls } from "@/src/components/admin/AdminEntityControls";
import { AdminBack, AdminDate, AdminEmpty, AdminJson } from "@/src/components/admin/AdminUi";
import { AdminContactActions } from "../../_components/EntityUi";
import { AuditOverview } from "../_components/AuditOverview";
import { AuditStatusBadge, EmailDeliveryBadge, SeverityBadge } from "../_components/AuditBadges";
import {
  buildAuditIssueViews,
  buildAuditPageViews,
  buildIndexingView,
  buildPerformanceView,
  emailDeliveryView,
} from "../../_lib/audit-view";
import { requireAdmin } from "../../_lib/auth";
import { adminAuditDetail, auditEmailProviderConfigured } from "../../_lib/data";

export default async function AdminAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();

  const detail = await adminAuditDetail(id);
  if (!detail) notFound();

  const { audit } = detail;
  const issues = buildAuditIssueViews(detail.issues, detail.fullResult);
  const pages = buildAuditPageViews(detail.pages, detail.fullResult);
  const indexing = buildIndexingView(detail.fullResult, pages);
  const performance = buildPerformanceView(detail.fullResult, pages);
  const emailNotification = detail.notifications.find((notification) => notification.channel === "email");
  const emailDelivery = emailDeliveryView({
    contactType: audit.contactType,
    auditStatus: audit.status,
    notificationStatus: emailNotification?.status,
    notificationError: emailNotification?.error,
    providerConfigured: auditEmailProviderConfigured(),
  });
  const auditStatusOptions = audit.status === "failed"
    ? [{ value: "queued", label: "Повторно поставить в очередь" }]
    : audit.status === "queued"
      ? [{ value: "failed", label: "Отменить до запуска" }]
      : [];
  const publicPath = `${audit.locale === "en" ? "/en" : ""}/audit/${audit.publicToken}`;

  return <>
    <AdminBack href="/admin/audits">Все аудиты</AdminBack>
    <div className="admin-title">
      <div>
        <p className="admin-kicker">Проверка с доказательствами</p>
        <h1>{audit.normalizedDomain}</h1>
        <p className="admin-title__description">Здесь видны охват, найденные проблемы, проверенные URL и доставка результата пользователю.</p>
      </div>
      <AuditStatusBadge status={audit.status}/>
    </div>

    {audit.contact && <section className="admin-contact-card" aria-labelledby="audit-contact-heading"><div><p className="admin-kicker">Контакт из проверки</p><h2 id="audit-contact-heading">Отправить результат</h2></div><AdminContactActions contact={audit.contact} contactType={audit.contactType}/></section>}

    <section className="admin-section" aria-labelledby="audit-actions-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Быстрые действия</p><h2 id="audit-actions-heading">Открыть и передать результат</h2></div><p>Публичная ссылка показывает только безопасную часть отчёта: без контакта, IP и служебных данных.</p></header>
      <div className="admin-action-links">
        <a href={`/api/admin/audits/${id}/export?format=pdf`}>Скачать PDF</a>
        <a href={`/api/admin/audits/${id}/export`}>Скачать JSON</a>
        <a href={publicPath} target="_blank" rel="noreferrer">Открыть публичный отчёт ↗</a>
        <AdminCopyButton value={publicPath}/>
        <a href={audit.originalUrl} target="_blank" rel="noreferrer">Открыть сайт ↗</a>
      </div>
    </section>

    <AuditOverview audit={audit} issues={issues} queue={detail.queue}/>

    <section className="admin-section" aria-labelledby="audit-signals-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Факты проверки</p><h2 id="audit-signals-heading">Что именно проверила система</h2></div><p>Это наблюдения по сохранённым страницам, а не предположения о всём сайте.</p></header>
      <div className="admin-grid admin-grid--summary">
        <article className="admin-card"><h3>Правила для поисковых систем (robots.txt)</h3><dl className="admin-dl"><div><dt>Статус</dt><dd><span className={`admin-badge admin-badge--${indexing.robotsTone}`}>{indexing.robotsLabel}</span></dd></div><div><dt>Ответ сервера</dt><dd>{indexing.robotsHttpStatus ?? "—"}</dd></div><div><dt>Указанных файлов со страницами</dt><dd>{indexing.declaredSitemaps || "—"}</dd></div></dl></article>
        <article className="admin-card"><h3>Файл со списком страниц (sitemap.xml)</h3><dl className="admin-dl"><div><dt>Статус</dt><dd><span className={`admin-badge admin-badge--${indexing.sitemapTone}`}>{indexing.sitemapLabel}</span></dd></div><div><dt>Адресов в файле</dt><dd>{indexing.sitemapUrls || "—"}</dd></div><div><dt>Ошибок чтения</dt><dd>{indexing.sitemapErrors}</dd></div></dl></article>
        <article className="admin-card"><h3>Проверенные страницы</h3><dl className="admin-dl"><div><dt>Можно обрабатывать для поиска</dt><dd>{indexing.indexablePages} из {pages.length}</dd></div><div><dt>Закрыты от поиска</dt><dd>{indexing.noindexPages}</dd></div><div><dt>Проблемы с основным адресом</dt><dd>{indexing.canonicalProblems}</dd></div></dl></article>
        <article className="admin-card"><h3>Скорость ответа</h3><dl className="admin-dl"><div><dt>Измерено страниц</dt><dd>{performance.measuredPages}</dd></div><div><dt>Средний ответ</dt><dd>{performance.averageResponseMs === null ? "Нет данных" : `${performance.averageResponseMs} мс`}</dd></div><div><dt>Автоматический тест скорости</dt><dd>{performance.available ? "Есть в результате" : "Не запускался"}</dd></div></dl></article>
        <article className="admin-card"><h3>Доставка отчёта</h3><dl className="admin-dl"><div><dt>Email</dt><dd><EmailDeliveryBadge delivery={emailDelivery}/></dd></div><div><dt>Получатель</dt><dd>{audit.contact || "Не запрашивалась"}</dd></div><div><dt>Согласие</dt><dd>{audit.consentVersion || "—"}</dd></div></dl></article>
        <article className="admin-card"><h3>Статус обработки</h3><dl className="admin-dl"><div><dt>Создан</dt><dd><AdminDate value={audit.createdAt}/></dd></div><div><dt>Завершён</dt><dd>{audit.completedAt ? <AdminDate value={audit.completedAt}/> : "Ещё выполняется"}</dd></div><div><dt>Ошибка</dt><dd>{audit.errorSummary ?? "Нет"}</dd></div></dl></article>
      </div>
    </section>

    <section className="admin-section" aria-labelledby="audit-issues-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Очередь исправлений</p><h2 id="audit-issues-heading">Проблемы и доказательства · {issues.length}</h2></div><p>Для каждой проблемы показаны страница, найденный факт и нужное действие.</p></header>
      {issues.length === 0 ? <AdminEmpty>В этой выборке проблем не сохранено.</AdminEmpty> : <div className="admin-table-wrap"><table><thead><tr><th>Приоритет</th><th>Проблема</th><th>Страница</th><th>Факт</th><th>Что сделать</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue.id}><td><SeverityBadge severity={issue.severity}/></td><td><b>{issue.title}</b><small>{issue.categoryLabel} · {issue.code}</small></td><td className="admin-break">{issue.url ?? "Вся выборка"}</td><td>{issue.evidence}</td><td>{issue.recommendation}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="admin-section" aria-labelledby="audit-pages-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Проверенные страницы</p><h2 id="audit-pages-heading">Факты по страницам · {pages.length}</h2></div><p>Здесь только страницы, которые действительно были загружены и разобраны.</p></header>
      {pages.length === 0 ? <AdminEmpty>Сохранённых страниц нет.</AdminEmpty> : <div className="admin-table-wrap"><table><thead><tr><th>Адрес</th><th>Ответ сервера</th><th>Доступна для поиска</th><th>Название страницы</th><th>Главный заголовок</th><th>Основной адрес</th><th>Проблем</th></tr></thead><tbody>{pages.map((page) => <tr key={page.id}><td className="admin-break">{safeExternalUrl(page.url) ? <a href={page.url} target="_blank" rel="noreferrer">{page.url}</a> : page.url}</td><td>{page.statusCode ?? "—"}</td><td>{page.indexability}</td><td>{page.title}</td><td>{page.h1Count ?? "—"}</td><td className="admin-break">{page.canonical}</td><td>{page.issueCount}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="admin-card"><h2>Управление и заметки</h2><AdminEntityControls endpoint={`/api/admin/audits/${id}`} id={id} currentStatus={audit.status} statusOptions={auditStatusOptions}/></section>
    <section className="admin-card"><h2>События · {detail.events.length}</h2>{detail.events.length === 0 ? <AdminEmpty/> : <div className="admin-events">{detail.events.map((event) => <article key={event.id}><header><b>{String(event.event)}</b><AdminDate value={event.createdAt}/></header><AdminJson value={event.payload}/></article>)}</div>}</section>
    <section className="admin-card"><h2>Заметки · {detail.notes.length}</h2>{detail.notes.length === 0 ? <AdminEmpty/> : <div className="admin-notes">{detail.notes.map((note) => <article key={String(note.id)}><AdminDate value={note.createdAt}/><p>{String(note.note)}</p></article>)}</div>}</section>
    <details className="admin-card"><summary>Служебные данные и полный JSON</summary><div className="admin-grid"><section><h2>Уведомления</h2><AdminJson value={detail.notifications}/></section><section><h2>Публичный результат</h2><AdminJson value={detail.publicResult}/></section><section><h2>Полный результат</h2><AdminJson value={detail.fullResult}/></section></div></details>
  </>;
}

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
