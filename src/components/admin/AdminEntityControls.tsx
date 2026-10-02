"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCsrf } from "@/src/components/forms/useCsrf";

type StatusOption = { value: string; label: string };

export function AdminEntityControls({
  endpoint,
  id,
  currentStatus,
  statusOptions = [],
  currentArchived = false,
  currentQaLabel = null,
}: {
  endpoint: string;
  id: string;
  currentStatus: string;
  statusOptions?: StatusOption[];
  currentArchived?: boolean;
  currentQaLabel?: string | null;
}) {
  const router = useRouter();
  const { token, refresh } = useCsrf();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [archived, setArchived] = useState(currentArchived);
  const [qaEnabled, setQaEnabled] = useState(Boolean(currentQaLabel));
  const [qaLabel, setQaLabel] = useState(currentQaLabel ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const changes: Record<string, unknown> = {};
    if (statusOptions.length && status !== currentStatus) changes.status = status;
    if (note.trim()) changes.note = note.trim();
    if (archived !== currentArchived) changes.archived = archived;
    const cleanedQaLabel = qaLabel.trim();
    if (qaEnabled && cleanedQaLabel.length < 2) {
      setMessage("Добавьте понятную метку QA");
      return;
    }
    if (qaEnabled !== Boolean(currentQaLabel) || (qaEnabled && cleanedQaLabel !== currentQaLabel)) {
      changes.qaLabel = qaEnabled ? cleanedQaLabel : null;
    }
    if (!Object.keys(changes).length) { setMessage("Нет изменений"); return; }
    setPending(true);
    setMessage("");
    try {
      const response = await mutate("PATCH", changes);
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) { setMessage(result.message ?? "Не удалось сохранить"); return; }
      setNote("");
      setMessage("Сохранено");
      router.refresh();
    } catch {
      setMessage("Сервис временно недоступен");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    const confirmation = window.prompt("Удаление необратимо. Введите DELETE, чтобы подтвердить.");
    if (confirmation !== "DELETE") return;
    setPending(true);
    setMessage("");
    try {
      const response = await mutate("DELETE", { id, confirmation });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) { setMessage(result.message ?? "Не удалось удалить"); return; }
      router.replace(endpoint.replace(/\/api\/admin\/(audits|leads|briefs)\/[^/]+$/u, "/admin/$1"));
      router.refresh();
    } catch {
      setMessage("Сервис временно недоступен");
    } finally {
      setPending(false);
    }
  }

  async function mutate(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
    const csrf = token || await refresh();
    const response = await fetch(endpoint, {
      method,
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify(body),
    });
    if (response.status === 401) router.replace("/admin/login");
    return response;
  }

  return (
    <form className="admin-controls" onSubmit={save}>
      {statusOptions.length > 0 && <label><span>Статус</span><select value={status} onChange={(event) => setStatus(event.target.value)}>
        {!statusOptions.some((option) => option.value === currentStatus) && <option value={currentStatus}>{currentStatus}</option>}
        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>}
      <fieldset className="admin-record-flags">
        <legend>Служебные отметки</legend>
        <label className="admin-check"><input type="checkbox" checked={qaEnabled} onChange={(event) => setQaEnabled(event.target.checked)}/><span>Тестовая запись (QA)</span></label>
        {qaEnabled && <label><span>Метка QA</span><input value={qaLabel} onChange={(event) => setQaLabel(event.target.value)} maxLength={80} placeholder="Например: Playwright · путь брифа"/></label>}
        <label className="admin-check"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)}/><span>Запись в архиве</span></label>
        <small>Архив скрывает запись из рабочего списка, но сохраняет историю и экспорт.</small>
      </fieldset>
      <label><span>Новая заметка</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={3000}/></label>
      {message && <p className={message === "Сохранено" ? "admin-success" : "admin-error"} role="status">{message}</p>}
      <div className="admin-control-actions">
        <button type="submit" disabled={pending || !token}>{pending ? "Сохраняем…" : "Сохранить"}</button>
        <button className="admin-danger" type="button" onClick={() => void remove()} disabled={pending || !token}>Удалить</button>
      </div>
    </form>
  );
}
