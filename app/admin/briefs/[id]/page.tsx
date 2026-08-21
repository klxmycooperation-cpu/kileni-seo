import { notFound } from "next/navigation";

import { validUuid } from "@/app/api/_lib/http";
import { AdminEntityControls } from "@/src/components/admin/AdminEntityControls";
import { AdminBack, AdminDate, AdminEmpty, AdminJson, AdminStatus, submissionStatuses } from "@/src/components/admin/AdminUi";
import { requireAdmin } from "../../_lib/auth";
import { adminBriefDetail } from "../../_lib/data";

export default async function AdminBriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const detail = adminBriefDetail(id);
  if (!detail) notFound();
  const brief = detail.brief;
  return <>
    <AdminBack href="/admin/briefs">Все брифы</AdminBack>
    <div className="admin-title"><div><p className="admin-kicker">Бриф</p><h1>{String(brief.name)}</h1></div><AdminStatus value={brief.status}/></div>
    <section className="admin-grid admin-grid--summary"><article className="admin-card"><h2>Контакт</h2><dl className="admin-dl"><div><dt>Контакт</dt><dd>{String(brief.contact)}</dd></div><div><dt>Услуга</dt><dd>{String(brief.service)}</dd></div><div><dt>Локаль</dt><dd>{String(brief.locale)}</dd></div><div><dt>Создан</dt><dd><AdminDate value={brief.createdAt}/></dd></div><div><dt>Согласие</dt><dd>{String(brief.consentVersion)}</dd></div></dl></article><article className="admin-card admin-card--wide"><h2>Ответы</h2><AdminJson value={brief.answers}/></article></section>
    <section className="admin-card"><h2>Управление</h2><AdminEntityControls endpoint={`/api/admin/briefs/${id}`} id={id} currentStatus={String(brief.status)} statusOptions={submissionStatuses}/></section>
    <section className="admin-card"><h2>Вложения · {detail.attachments.length}</h2>{detail.attachments.length === 0 ? <AdminEmpty/> : <ul className="admin-attachments">{detail.attachments.map((file) => <li key={file.id}><a href={`/api/admin/attachments/${file.id}`}>{String(file.originalName)}</a><span>{String(file.mime)} · {formatBytes(Number(file.size))}</span></li>)}</ul>}</section>
    <section className="admin-card"><h2>Уведомления</h2>{detail.notifications.length === 0 ? <AdminEmpty/> : <AdminJson value={detail.notifications}/>}</section>
    <section className="admin-card"><h2>Заметки</h2>{detail.notes.length === 0 ? <AdminEmpty/> : <div className="admin-notes">{detail.notes.map((note) => <article key={String(note.id)}><AdminDate value={note.createdAt}/><p>{String(note.note)}</p></article>)}</div>}</section>
  </>;
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
