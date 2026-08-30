import { notFound } from "next/navigation";

import { validUuid } from "@/app/api/_lib/http";
import { AdminEntityControls } from "@/src/components/admin/AdminEntityControls";
import { AdminBack, AdminDate, AdminEmpty, submissionStatuses } from "@/src/components/admin/AdminUi";
import {
  AdminContactActions,
  AdminEntryList,
  AdminNoteList,
  AdminNotificationList,
  SubmissionStatus,
} from "../../_components/EntityUi";
import { briefAnswerEntries, localeLabel, serviceLabel } from "../../_lib/presentation";
import { requireAdmin } from "../../_lib/auth";
import { adminBriefDetail } from "../../_lib/data";

export default async function AdminBriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const detail = await adminBriefDetail(id);
  if (!detail) notFound();
  const brief = detail.brief;
  const answers = briefAnswerEntries(brief.answers, brief.service, brief.locale);

  return (
    <>
      <AdminBack href="/admin/briefs">Все брифы</AdminBack>
      <div className="admin-title">
        <div>
          <p className="admin-kicker">Бриф</p>
          <h1>{String(brief.name)}</h1>
          <p className="admin-title__description">Ответы собраны в том же порядке, в котором клиент описывал задачу.</p>
        </div>
        <SubmissionStatus value={brief.status}/>
      </div>

      <section className="admin-contact-card" aria-labelledby="brief-contact-heading">
        <div><p className="admin-kicker">Основное действие</p><h2 id="brief-contact-heading">Ответить клиенту</h2></div>
        <AdminContactActions contact={brief.contact}/>
      </section>

      <section className="admin-grid admin-grid--summary">
        <article className="admin-card">
          <h2>Кратко о запросе</h2>
          <dl className="admin-dl">
            <div><dt>Направление</dt><dd>{serviceLabel(brief.service)}</dd></div>
            <div><dt>Создан</dt><dd><AdminDate value={brief.createdAt}/></dd></div>
            <div><dt>Язык</dt><dd>{localeLabel(brief.locale)}</dd></div>
            <div><dt>Согласие</dt><dd>{String(brief.consentVersion ?? "Не сохранено")}</dd></div>
          </dl>
        </article>
        <article className="admin-card admin-card--wide">
          <h2>Ответы клиента · {answers.length}</h2>
          <AdminEntryList entries={answers}/>
        </article>
      </section>

      <section className="admin-card">
        <h2>Управление брифом</h2>
        <p className="admin-card__intro">После ответа клиенту обновите статус и запишите договорённости — заметка останется в истории.</p>
        <AdminEntityControls endpoint={`/api/admin/briefs/${id}`} id={id} currentStatus={String(brief.status)} statusOptions={submissionStatuses}/>
      </section>

      <section className="admin-card">
        <h2>Вложения · {detail.attachments.length}</h2>
        {detail.attachments.length === 0 ? <AdminEmpty>Клиент не приложил файлы.</AdminEmpty> : (
          <ul className="admin-attachments">{detail.attachments.map((file) => <li key={file.id}><a href={`/api/admin/attachments/${file.id}`}>{String(file.originalName)}</a><span>{String(file.mime)} · {formatBytes(Number(file.size))}</span></li>)}</ul>
        )}
      </section>

      <section className="admin-card"><h2>Уведомления · {detail.notifications.length}</h2><AdminNotificationList notifications={detail.notifications}/></section>
      <section className="admin-card"><h2>История заметок · {detail.notes.length}</h2><AdminNoteList notes={detail.notes}/></section>
    </>
  );
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
