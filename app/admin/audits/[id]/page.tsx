import { notFound } from "next/navigation";

import { AdminEntityControls } from "@/src/components/admin/AdminEntityControls";
import { AdminCopyButton } from "@/src/components/admin/AdminCopyButton";
import { AdminBack, AdminDate, AdminEmpty, AdminJson, AdminStatus } from "@/src/components/admin/AdminUi";
import { validUuid } from "@/app/api/_lib/http";
import { requireAdmin } from "../../_lib/auth";
import { adminAuditDetail } from "../../_lib/data";

export default async function AdminAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const detail = adminAuditDetail(id);
  if (!detail) notFound();
  const { audit } = detail;
  const auditStatusOptions = audit.status === "failed"
    ? [{ value: "queued", label: "Повторно поставить в очередь" }]
    : audit.status === "queued"
      ? [{ value: "failed", label: "Отменить до запуска" }]
      : [];
  return <>
    <AdminBack href="/admin/audits">Все аудиты</AdminBack>
    <div className="admin-title"><div><p className="admin-kicker">Аудит</p><h1>{audit.normalizedDomain}</h1></div><AdminStatus value={audit.status}/></div>
    <div className="admin-action-links"><a href={`/api/admin/audits/${id}/export`}>Скачать полный JSON</a><a href={`/api/admin/audits/${id}/export?format=pdf`}>Скачать полный PDF</a><a href={`${audit.locale === "en" ? "/en" : ""}/audit/${audit.publicToken}`} target="_blank" rel="noreferrer">Публичная ссылка ↗</a><AdminCopyButton value={`${audit.locale === "en" ? "/en" : ""}/audit/${audit.publicToken}`}/><a href={audit.originalUrl} target="_blank" rel="noreferrer">Открыть сайт ↗</a></div>
    <section className="admin-grid admin-grid--summary">
      <article className="admin-card"><h2>Заявка</h2><dl className="admin-dl"><div><dt>Имя</dt><dd>{audit.name}</dd></div><div><dt>Контакт</dt><dd>{audit.contact}</dd></div><div><dt>Локаль</dt><dd>{audit.locale}</dd></div><div><dt>Создан</dt><dd><AdminDate value={audit.createdAt}/></dd></div><div><dt>Запущен</dt><dd>{audit.startedAt ? <AdminDate value={audit.startedAt}/> : "—"}</dd></div><div><dt>Завершён</dt><dd>{audit.completedAt ? <AdminDate value={audit.completedAt}/> : "—"}</dd></div></dl></article>
      <article className="admin-card"><h2>Результат</h2><dl className="admin-dl"><div><dt>Оценка</dt><dd>{audit.overallScore ?? "—"}</dd></div><div><dt>Грейд</dt><dd>{audit.grade ?? "—"}</dd></div><div><dt>Страницы</dt><dd>{audit.pagesChecked}/{audit.pagesDiscovered}</dd></div><div><dt>Лимит</dt><dd>{audit.pageLimit}</dd></div><div><dt>Partial</dt><dd>{audit.partial ? "да" : "нет"}</dd></div><div><dt>Ошибка</dt><dd>{audit.errorSummary ?? "—"}</dd></div></dl></article>
      <article className="admin-card"><h2>Очередь и worker</h2><AdminJson value={detail.queue}/></article>
    </section>
    <section className="admin-card"><h2>Управление</h2><AdminEntityControls endpoint={`/api/admin/audits/${id}`} id={id} currentStatus={audit.status} statusOptions={auditStatusOptions}/></section>
    <section className="admin-card"><h2>Проблемы · {detail.issues.length}</h2>{detail.issues.length === 0 ? <AdminEmpty/> : <div className="admin-table-wrap"><table><thead><tr><th>Важность</th><th>Код</th><th>URL</th><th>Доказательство</th><th>Рекомендация</th></tr></thead><tbody>{detail.issues.map((issue) => <tr key={String(issue.id)}><td><AdminStatus value={issue.severity}/></td><td>{String(issue.code)}</td><td className="admin-break">{String(issue.url ?? "—")}</td><td>{String(issue.evidence ?? "—")}</td><td>{String(issue.recommendation ?? "—")}</td></tr>)}</tbody></table></div>}</section>
    <section className="admin-card"><h2>События · {detail.events.length}</h2>{detail.events.length === 0 ? <AdminEmpty/> : <div className="admin-events">{detail.events.map((event) => <article key={event.id}><header><b>#{event.id} · {event.event}</b><AdminDate value={event.createdAt}/></header><AdminJson value={event.payload}/></article>)}</div>}</section>
    <section className="admin-card"><h2>Уведомления</h2>{detail.notifications.length === 0 ? <AdminEmpty/> : <AdminJson value={detail.notifications}/>}</section>
    <section className="admin-card"><h2>Заметки</h2>{detail.notes.length === 0 ? <AdminEmpty/> : <div className="admin-notes">{detail.notes.map((note) => <article key={String(note.id)}><AdminDate value={note.createdAt}/><p>{String(note.note)}</p></article>)}</div>}</section>
    <section className="admin-card"><h2>Публичный результат</h2><AdminJson value={detail.publicResult}/></section>
    <section className="admin-card"><h2>Полный результат</h2><AdminJson value={detail.fullResult}/></section>
    <section className="admin-card"><h2>Сохранённые страницы · {detail.pages.length}</h2>{detail.pages.length === 0 ? <AdminEmpty/> : <AdminJson value={detail.pages}/>}</section>
  </>;
}
