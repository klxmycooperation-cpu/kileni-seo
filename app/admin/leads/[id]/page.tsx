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
import {
  localeLabel,
  readableEntries,
  serviceLabel,
  sourceLabel,
} from "../../_lib/presentation";
import { requireAdmin } from "../../_lib/auth";
import { adminLeadDetail } from "../../_lib/data";

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const detail = await adminLeadDetail(id);
  if (!detail) notFound();
  const lead = detail.lead;
  const sourceUrl = safeHttpUrl(lead.pageUrl);
  const utmEntries = readableEntries(lead.utm);

  return (
    <>
      <AdminBack href="/admin/leads">Все заявки</AdminBack>
      <div className="admin-title">
        <div>
          <p className="admin-kicker">Заявка</p>
          <h1>{String(lead.name)}</h1>
          <p className="admin-title__description">Сначала свяжитесь с клиентом, затем обновите статус и запишите итог разговора.</p>
        </div>
        <SubmissionStatus value={lead.status}/>
      </div>

      <section className="admin-contact-card" aria-labelledby="lead-contact-heading">
        <div><p className="admin-kicker">Основное действие</p><h2 id="lead-contact-heading">Связаться с клиентом</h2></div>
        <AdminContactActions contact={lead.contact} contactType={lead.contactType}/>
      </section>

      <section className="admin-grid admin-grid--summary">
        <article className="admin-card">
          <h2>Кратко о заявке</h2>
          <dl className="admin-dl">
            <div><dt>Услуга</dt><dd>{serviceLabel(lead.service)}</dd></div>
            <div><dt>Создана</dt><dd><AdminDate value={lead.createdAt}/></dd></div>
            <div><dt>Источник</dt><dd>{sourceLabel(lead.source)}</dd></div>
            <div><dt>Язык</dt><dd>{localeLabel(lead.locale)}</dd></div>
          </dl>
        </article>
        <article className="admin-card admin-card--wide">
          <h2>Что нужно клиенту</h2>
          <dl className="admin-answer-list">
            <div><dt>Проект или сайт</dt><dd>{String(lead.target ?? "Не указан")}</dd></div>
            <div><dt>Комментарий</dt><dd className="admin-pre-line">{String(lead.comment ?? "Комментария нет")}</dd></div>
          </dl>
        </article>
      </section>

      <section className="admin-card">
        <h2>Откуда пришла заявка</h2>
        <dl className="admin-answer-list">
          <div><dt>Страница</dt><dd>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">{sourceUrl} ↗</a> : String(lead.pageUrl ?? "Не сохранена")}</dd></div>
          <div><dt>Согласие</dt><dd>{String(lead.consentVersion ?? "Не сохранено")}</dd></div>
        </dl>
        {utmEntries.length > 0 && <details className="admin-inline-details"><summary>Показать рекламные метки</summary><AdminEntryList entries={utmEntries}/></details>}
      </section>

      <section className="admin-card">
        <h2>Управление заявкой</h2>
        <p className="admin-card__intro">Выберите текущий этап и добавьте заметку с результатом звонка или переписки.</p>
        <AdminEntityControls endpoint={`/api/admin/leads/${id}`} id={id} currentStatus={String(lead.status)} statusOptions={submissionStatuses}/>
      </section>

      <section className="admin-card">
        <h2>Расчёты · {detail.calculations.length}</h2>
        {detail.calculations.length === 0 ? <AdminEmpty>К этой заявке расчёты не привязаны.</AdminEmpty> : (
          <div className="admin-subrecords">{detail.calculations.map((calculation) => {
            const minPrice = Number(calculation.minPrice);
            const maxPrice = Number(calculation.maxPrice);
            return <article key={String(calculation.id)}><header><div><b>{calculationKindLabel(calculation.kind)}</b><span>{priceRange(minPrice, maxPrice)}</span></div><AdminDate value={calculation.createdAt}/></header><AdminEntryList entries={readableEntries(calculation.answers)}/></article>;
          })}</div>
        )}
      </section>

      <section className="admin-card"><h2>Уведомления · {detail.notifications.length}</h2><AdminNotificationList notifications={detail.notifications}/></section>
      <section className="admin-card"><h2>История заметок · {detail.notes.length}</h2><AdminNoteList notes={detail.notes}/></section>
    </>
  );
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function calculationKindLabel(value: unknown): string {
  const kind = String(value ?? "");
  if (kind === "audit") return "SEO-аудит";
  if (kind === "promotion") return "SEO-продвижение";
  if (kind === "development") return "Разработка";
  return kind || "Расчёт";
}

function priceRange(min: number, max: number): string {
  if (!Number.isFinite(min) && !Number.isFinite(max)) return "Стоимость не рассчитана";
  if (Number.isFinite(min) && Number.isFinite(max) && min !== max) return `${formatPrice(min)}–${formatPrice(max)}`;
  return formatPrice(Number.isFinite(min) ? min : max);
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
}
