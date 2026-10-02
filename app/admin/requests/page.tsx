import Link from "next/link";

import { AdminDate, AdminEmpty } from "@/src/components/admin/AdminUi";
import { auditStatusLabel } from "../_lib/audit-view";
import { requireAdmin } from "../_lib/auth";
import {
  adminRequestCenter,
  type AdminRequestCenterItem,
  type AdminRequestEntityType,
} from "../_lib/data";
import {
  channelLabel,
  contactAction,
  submissionStatusLabel,
} from "../_lib/presentation";

type FilterValue = string | string[] | undefined;
type RequestFilters = {
  q?: FilterValue;
  type?: FilterValue;
  state?: FilterValue;
  from?: FilterValue;
  to?: FilterValue;
};

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<RequestFilters> }) {
  await requireAdmin();
  const rawFilters = await searchParams;
  const filters = {
    query: singleFilter(rawFilters.q),
    entityType: singleFilter(rawFilters.type),
    state: singleFilter(rawFilters.state),
    from: dateFilter(rawFilters.from),
    to: dateFilter(rawFilters.to),
  };
  const requests = await adminRequestCenter(filters);
  const hasFilters = Object.values(rawFilters).some(Boolean);

  return (
    <>
      <div className="admin-title">
        <div>
          <p className="admin-kicker">Единая рабочая лента</p>
          <h1>Все обращения</h1>
          <p className="admin-title__description">Заявки, заполненные брифы и запуски SEO-аудита в порядке поступления. Ошибка отправки уведомления отмечена отдельно.</p>
        </div>
        <span>{requests.length} записей</span>
      </div>

      <form className="admin-filters admin-filters--requests" aria-label="Фильтры обращений">
        <label className="admin-field admin-field--search"><span>Поиск</span><input name="q" defaultValue={filters.query} placeholder="Клиент, контакт или сайт" maxLength={120}/></label>
        <label className="admin-field"><span>Тип</span><select name="type" defaultValue={filters.entityType ?? ""}>
          <option value="">Все обращения</option>
          <option value="lead">Заявки</option>
          <option value="brief">Брифы</option>
          <option value="audit">SEO-аудиты</option>
        </select></label>
        <label className="admin-field"><span>Состояние</span><select name="state" defaultValue={filters.state ?? ""}>
          <option value="">Все состояния</option>
          <option value="new">Новые</option>
          <option value="active">В работе</option>
          <option value="closed">Завершённые</option>
          <option value="notification_failed">Ошибка уведомления</option>
        </select></label>
        <label className="admin-field"><span>С даты</span><input type="date" name="from" defaultValue={filters.from}/></label>
        <label className="admin-field"><span>По дату</span><input type="date" name="to" defaultValue={filters.to}/></label>
        <div className="admin-filter-actions"><button type="submit">Применить</button>{hasFilters && <Link href="/admin/requests">Сбросить</Link>}</div>
      </form>

      {requests.length === 0 ? (
        <section className="admin-card admin-empty-state"><AdminEmpty>По выбранным условиям обращений нет.</AdminEmpty>{hasFilters && <Link href="/admin/requests">Показать все обращения</Link>}</section>
      ) : (
        <div className="admin-table-wrap admin-table-wrap--requests">
          <table>
            <thead><tr><th>Поступило</th><th>Тип</th><th>Клиент</th><th>Задача</th><th>Статус</th><th>Уведомление</th><th></th></tr></thead>
            <tbody>{requests.map((request) => <RequestRow key={`${request.entityType}:${request.id}`} request={request}/>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function RequestRow({ request }: { request: AdminRequestCenterItem }) {
  const contact = contactAction(request.contact, request.contactType);
  const href = requestHref(request.entityType, request.id);
  return (
    <tr>
      <td data-label="Поступило"><AdminDate value={request.createdAt}/></td>
      <td data-label="Тип"><span className={`admin-request-type admin-request-type--${request.entityType}`}>{requestTypeLabel(request.entityType)}</span></td>
      <td data-label="Клиент"><Link className="admin-record-link" href={href}>{request.name || "Имя не указано"}</Link><small className="admin-break">{contact.display}</small>{contact.href && <a className="admin-request-contact" href={contact.href}>{contact.actionLabel}</a>}</td>
      <td data-label="Задача"><b className="admin-break">{request.subject}</b></td>
      <td data-label="Статус"><RequestStatus request={request}/></td>
      <td data-label="Уведомления">{request.notifications.length ? request.notifications.map((notification) => <div className="admin-request-notification" key={notification.channel}><span className={`admin-notification-state${notification.status === "failed" ? " admin-notification-state--failed" : ""}`}>{notificationText(notification)}</span>{notification.error && <small>{notificationErrorText(notification.error)}</small>}</div>) : <span className="admin-notification-state">Уведомления ещё не зарегистрированы</span>}</td>
      <td data-label="Действие"><Link className="admin-open-link" href={href}>Открыть →</Link></td>
    </tr>
  );
}

function RequestStatus({ request }: { request: AdminRequestCenterItem }) {
  const label = request.entityType === "audit" ? auditStatusLabel(request.status) : submissionStatusLabel(request.status);
  return <span className={`admin-status admin-status--${request.status.replace(/[^a-z_]/gu, "")}`}>{label}</span>;
}

function requestTypeLabel(entityType: AdminRequestEntityType): string {
  if (entityType === "lead") return "Заявка";
  if (entityType === "brief") return "Бриф";
  return "SEO-аудит";
}

function requestHref(entityType: AdminRequestEntityType, id: string): string {
  return `/admin/${entityType === "lead" ? "leads" : entityType === "brief" ? "briefs" : "audits"}/${encodeURIComponent(id)}`;
}

function notificationText(notification: AdminRequestCenterItem["notifications"][number]): string {
  const channel = channelLabel(notification.channel);
  if (notification.status === "sent") return notification.channel === "telegram" ? `${channel}: отправлено` : `${channel}: передано серверу`;
  if (notification.status === "failed") return `${channel}: не отправлено`;
  if (notification.status === "skipped") return `${channel}: не настроен`;
  return `${channel}: ожидает отправки`;
}

function notificationErrorText(value: string): string {
  if (value === "not_configured") return "Канал не настроен";
  if (value === "missing_recipient") return "Не указан адрес получателя";
  return "Проверьте настройки канала отправки";
}

function singleFilter(value: FilterValue): string | undefined {
  const selected = Array.isArray(value) ? value[0] : value;
  const cleaned = selected?.trim().slice(0, 120);
  return cleaned || undefined;
}

function dateFilter(value: FilterValue): string | undefined {
  const selected = singleFilter(value);
  return selected && /^\d{4}-\d{2}-\d{2}$/u.test(selected) ? selected : undefined;
}
