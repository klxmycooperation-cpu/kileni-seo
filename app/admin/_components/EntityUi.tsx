import { AdminDate, AdminEmpty } from "@/src/components/admin/AdminUi";
import {
  channelLabel,
  contactAction,
  notificationLabel,
  submissionStatusLabel,
} from "../_lib/presentation";

type UnknownRecord = Record<string, unknown>;

export function SubmissionStatus({ value }: { value: unknown }) {
  const status = String(value ?? "unknown");
  return <span className={`admin-status admin-status--${status.replace(/[^a-z_]/gu, "")}`}>{submissionStatusLabel(status)}</span>;
}

export function AdminContactActions({ contact, contactType }: { contact: unknown; contactType?: unknown }) {
  const action = contactAction(contact, contactType);
  return (
    <div className="admin-contact">
      <span className="admin-contact__value">{action.display}</span>
      {action.href && <a className="admin-contact__action" href={action.href}>{action.actionLabel}</a>}
      {!action.href && <small>Контакт сохранён как текст — проверьте его перед ответом.</small>}
    </div>
  );
}

export function AdminEntryList({ entries }: { entries: Array<{ key: string; label: string; value: string }> }) {
  if (!entries.length) return <AdminEmpty>Пользователь не заполнил дополнительные поля.</AdminEmpty>;
  return (
    <dl className="admin-answer-list">
      {entries.map((entry) => <div key={entry.key}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}
    </dl>
  );
}

export function AdminNotificationList({ notifications }: { notifications: UnknownRecord[] }) {
  if (!notifications.length) return <AdminEmpty>Уведомления ещё не отправлялись.</AdminEmpty>;
  return (
    <div className="admin-timeline">
      {notifications.map((notification, index) => (
        <article key={String(notification.id ?? `${notification.channel}-${index}`)}>
          <header>
            <div><b>{channelLabel(notification.channel)}</b><span className={`admin-status admin-status--${String(notification.status ?? "unknown").replace(/[^a-z_]/gu, "")}`}>{notificationLabel(notification.status)}</span></div>
            <AdminDate value={notification.updatedAt ?? notification.createdAt}/>
          </header>
          {Boolean(notification.error) && <p className="admin-error">Причина: {humanNotificationError(notification.error)}</p>}
        </article>
      ))}
    </div>
  );
}

export function AdminNoteList({ notes }: { notes: UnknownRecord[] }) {
  if (!notes.length) return <AdminEmpty>Заметок пока нет.</AdminEmpty>;
  return (
    <div className="admin-timeline">
      {notes.map((note) => (
        <article key={String(note.id)}>
          <header><b>Заметка</b><AdminDate value={note.createdAt}/></header>
          <p>{String(note.note ?? "")}</p>
        </article>
      ))}
    </div>
  );
}

function humanNotificationError(value: unknown): string {
  const error = String(value ?? "").trim();
  const labels: Readonly<Record<string, string>> = {
    not_configured: "Отправка через этот канал не настроена",
    missing_recipient: "Не указан адрес получателя",
  };
  return labels[error] ?? (error || "Неизвестная ошибка");
}
