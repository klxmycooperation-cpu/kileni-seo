import Link from "next/link";

export const submissionStatuses = [
  { value: "new", label: "Новая" },
  { value: "contacted", label: "Связались" },
  { value: "clarification", label: "Уточнение задачи" },
  { value: "proposal_sent", label: "Отправлено предложение" },
  { value: "in_work", label: "В работе" },
  { value: "won", label: "Закрыта успешно" },
  { value: "lost", label: "Закрыта без сделки" },
];

export function AdminStatus({ value }: { value: unknown }) {
  const status = String(value ?? "unknown");
  return <span className={`admin-status admin-status--${status.replace(/[^a-z_]/gu, "")}`}>{status}</span>;
}

export function AdminDate({ value }: { value: unknown }) {
  const date = typeof value === "number" ? new Date(value) : new Date(String(value));
  return <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Moscow" }).format(date)}</time>;
}

export function AdminJson({ value }: { value: unknown }) {
  return <pre className="admin-json">{JSON.stringify(value, null, 2)}</pre>;
}

export function AdminEmpty({ children = "Данных пока нет" }: { children?: React.ReactNode }) {
  return <p className="admin-empty">{children}</p>;
}

export function AdminBack({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="admin-back" href={href}>← {children}</Link>;
}
