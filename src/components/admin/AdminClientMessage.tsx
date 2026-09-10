"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCsrf } from "@/src/components/forms/useCsrf";

export function AdminClientMessage({ auditId }: { auditId: string }) {
  const router = useRouter();
  const { token, refresh } = useCsrf();
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [notice, setNotice] = useState("");

  async function generate(nextVariant = variant) {
    if (status === "pending") return;
    setStatus("pending");
    setNotice("");
    try {
      const csrf = await refresh();
      const response = await fetch(`/api/admin/audits/${auditId}/client-message`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ variant: nextVariant }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.message) {
        setStatus("error");
        setNotice(result.message ?? "Не удалось подготовить текст. Попробуйте ещё раз");
        return;
      }
      setMessage(result.message);
      setVariant(nextVariant);
      setStatus("success");
      setNotice("Текст подготовлен. Его можно отредактировать перед отправкой.");
    } catch {
      setStatus("error");
      setNotice("Сервис временно недоступен. Попробуйте ещё раз");
    }
  }

  async function copy() {
    if (!message.trim()) return;
    try {
      await navigator.clipboard.writeText(message);
      setStatus("success");
      setNotice("Текст скопирован");
    } catch {
      setStatus("error");
      setNotice("Не удалось скопировать автоматически. Выделите текст вручную");
    }
  }

  const pending = status === "pending";
  return (
    <div className="admin-client-message">
      {!message ? (
        <button type="button" onClick={() => void generate(0)} disabled={pending || !token}>
          {pending ? "Готовим текст…" : "Сгенерировать текст для заказчика"}
        </button>
      ) : (
        <>
          <label htmlFor="admin-client-message-text">Текст для заказчика</label>
          <textarea
            id="admin-client-message-text"
            value={message}
            rows={14}
            maxLength={12_000}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="admin-client-message__actions">
            <button type="button" onClick={() => void copy()} disabled={pending}>Копировать</button>
            <button type="button" onClick={() => void generate((variant + 1) % 3)} disabled={pending || !token}>
              {pending ? "Готовим текст…" : "Сгенерировать заново"}
            </button>
          </div>
        </>
      )}
      {notice && <p className={status === "error" ? "admin-error" : "admin-success"} role="status">{notice}</p>}
    </div>
  );
}
