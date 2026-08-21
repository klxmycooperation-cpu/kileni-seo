import { notFound } from "next/navigation";

import { validUuid } from "@/app/api/_lib/http";
import { AdminEntityControls } from "@/src/components/admin/AdminEntityControls";
import { AdminBack, AdminDate, AdminEmpty, AdminJson, AdminStatus, submissionStatuses } from "@/src/components/admin/AdminUi";
import { requireAdmin } from "../../_lib/auth";
import { adminLeadDetail } from "../../_lib/data";

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const detail = adminLeadDetail(id);
  if (!detail) notFound();
  const lead = detail.lead;
  return <>
    <AdminBack href="/admin/leads">Все заявки</AdminBack>
    <div className="admin-title"><div><p className="admin-kicker">Заявка</p><h1>{String(lead.name)}</h1></div><AdminStatus value={lead.status}/></div>
    <section className="admin-grid admin-grid--summary"><article className="admin-card"><h2>Контакт</h2><dl className="admin-dl"><div><dt>Контакт</dt><dd>{String(lead.contact)}</dd></div><div><dt>Тип</dt><dd>{String(lead.contactType)}</dd></div><div><dt>Услуга</dt><dd>{String(lead.service ?? "—")}</dd></div><div><dt>Создана</dt><dd><AdminDate value={lead.createdAt}/></dd></div><div><dt>Источник</dt><dd>{String(lead.source)}</dd></div><div><dt>Локаль</dt><dd>{String(lead.locale)}</dd></div></dl></article><article className="admin-card"><h2>Задача</h2><p className="admin-break">{String(lead.target ?? "—")}</p><p>{String(lead.comment ?? "—")}</p></article><article className="admin-card"><h2>Атрибуция</h2><AdminJson value={{ pageUrl: lead.pageUrl, utm: lead.utm, consentVersion: lead.consentVersion }}/></article></section>
    <section className="admin-card"><h2>Управление</h2><AdminEntityControls endpoint={`/api/admin/leads/${id}`} id={id} currentStatus={String(lead.status)} statusOptions={submissionStatuses}/></section>
    <section className="admin-card"><h2>Расчёты · {detail.calculations.length}</h2>{detail.calculations.length === 0 ? <AdminEmpty/> : <AdminJson value={detail.calculations}/>}</section>
    <section className="admin-card"><h2>Уведомления</h2>{detail.notifications.length === 0 ? <AdminEmpty/> : <AdminJson value={detail.notifications}/>}</section>
    <section className="admin-card"><h2>Заметки</h2>{detail.notes.length === 0 ? <AdminEmpty/> : <div className="admin-notes">{detail.notes.map((note) => <article key={String(note.id)}><AdminDate value={note.createdAt}/><p>{String(note.note)}</p></article>)}</div>}</section>
  </>;
}
