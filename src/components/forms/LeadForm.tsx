"use client";

import { useState } from "react";
import type { Locale } from "../../config/site";
import { collectBrowserAttribution } from "../../lib/attribution";
import { useCsrf } from "./useCsrf";
import { TurnstileField } from "./TurnstileField";
import { useSelectedServiceOfferId, useSelectedServiceTier } from "../pages/ServiceTierSelection";
import { ConsentNotice } from "./ConsentNotice";

export function LeadForm({ locale, service, title }: { locale: Locale; service: string; title?: string }) {
  const ru = locale === "ru"; const { token, refresh } = useCsrf();
  const selectedTier = useSelectedServiceTier();
  const offerId = useSelectedServiceOfferId();
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileReset, setTurnstileReset] = useState(0);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;
    setStatus("pending"); setMessage("");
    try {
    const form = new FormData(event.currentTarget); const csrf = token || await refresh();
    const payload = Object.fromEntries(form.entries());
    const attribution = collectBrowserAttribution();
    const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf }, body: JSON.stringify({ ...payload, ...attribution, turnstileToken, locale, service, consent: form.get("consent") === "on", source: "service-form" }) });
    const result = await response.json() as { message?: string };
    if (response.ok) { setStatus("success"); setMessage(ru ? "Заявка сохранена. " + "Свяжемся в течение одного рабочего часа с 10:00 до 20:00 по Москве." : "Your request is saved. We will respond during the first working hour between 10:00 and 20:00 Moscow time."); }
    else { setStatus("error"); setMessage(result.message ?? (ru ? "Проверьте поля и попробуйте ещё раз." : "Review the fields and try again.")); setTurnstileReset((value) => value + 1); }
    } catch {
      setStatus("error");
      setMessage(ru
        ? "Не удалось получить ответ от сервера. Введённые данные сохранены в форме. Проверьте подключение и попробуйте ещё раз."
        : "The server did not respond. Your entries are still in the form. Check your connection and try again.");
      setTurnstileReset((value) => value + 1);
    }
  }
  return <form className="lead-form" method="post" onSubmit={submit}><div className="form-heading"><span className="status-dot"/><h2>{title ?? (ru ? "Обсудить задачу" : "Discuss the project")}</h2></div>{selectedTier && <p className="lead-form-selected-tier"><span>{ru ? "Выбранный уровень" : "Selected tier"}</span><strong>{selectedTier}</strong></p>}<input type="hidden" name="offerId" value={offerId}/><div className="form-row"><label><span>{ru ? "Имя" : "Name"}</span><input name="name" required minLength={2} maxLength={80} autoComplete="name"/></label><label><span>{ru ? "E-mail" : "Email"}</span><input name="contact" type="email" inputMode="email" autoComplete="email" required maxLength={160} placeholder={ru ? "name@example.ru" : "name@example.com"}/></label></div><label><span>{ru ? "Сайт, карточка или проект" : "Website, card or project"}</span><input name="target" maxLength={2048}/></label><label><span>{ru ? "Комментарий" : "Comment"}</span><textarea name="comment" rows={4} maxLength={3000}/></label><label className="honeypot" aria-hidden="true">Company<input name="honeypot" tabIndex={-1} autoComplete="off"/></label><label className="check-field"><input name="consent" type="checkbox" required/><ConsentNotice locale={locale}/></label><TurnstileField onToken={setTurnstileToken} resetKey={turnstileReset}/>{message && <p className={status === "success" ? "form-success" : "form-error"} role="status">{message}</p>}<button className="button button-primary" type="submit" disabled={status === "pending" || !token || !turnstileToken}>{status === "pending" ? (ru ? "Отправляем…" : "Sending…") : (ru ? "Отправить заявку" : "Send request")}<span>↗</span></button></form>;
}
