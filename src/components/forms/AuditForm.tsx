"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";
import { getDictionary } from "../../content/dictionary";
import { collectBrowserAttribution } from "../../lib/attribution";
import { normalizeAuditDomain, saveAuditLeadHandoff } from "../../lib/audit/lead-handoff";
import {
  consumePublicAuditStream,
  isPublicAuditStreamResponse,
  PublicAuditStreamError,
  type PublicAuditStreamEvent,
} from "../../lib/audit/public-stream";
import { withAuditRestore } from "../../lib/audit/restore-url";
import { TurnstileField } from "./TurnstileField";
import { FreeAuditUsageCounter } from "./FreeAuditUsageCounter";
import { AuditLiveOverlay, type AuditLiveSnapshot } from "./AuditLiveProgress";
import { useCsrf } from "./useCsrf";

const ACTIVE_AUDIT_KEY = "kileni:active-audit:v1";

type ActiveAudit = AuditLiveSnapshot & {
  locale: Locale;
  domain: string;
  restore?: string;
};

function getDomain(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./u, "");
  } catch {
    return value;
  }
}

function readActiveAudit(): ActiveAudit | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(ACTIVE_AUDIT_KEY) ?? "null") as Partial<ActiveAudit>;
    return typeof value?.token === "string" && typeof value.domain === "string" && typeof value.locale === "string" ? value as ActiveAudit : null;
  } catch {
    return null;
  }
}

function storeActiveAudit(value: ActiveAudit | null) {
  try {
    if (value) window.sessionStorage.setItem(ACTIVE_AUDIT_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(ACTIVE_AUDIT_KEY);
  } catch {
    // The audit itself does not depend on browser storage.
  }
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function AuditForm({
  locale,
  compact = false,
  onAuditStart,
  onAuditError,
}: {
  locale: Locale;
  compact?: boolean;
  onAuditStart?: () => void;
  onAuditError?: () => void;
}) {
  const d = getDictionary(locale).auditForm;
  const ru = locale === "ru";
  const router = useRouter();
  const { token, refresh } = useCsrf();
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [activeAudit, setActiveAudit] = useState<ActiveAudit | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileReset, setTurnstileReset] = useState(0);
  const onAuditStartRef = useRef(onAuditStart);

  useEffect(() => {
    onAuditStartRef.current = onAuditStart;
  }, [onAuditStart]);

  function updateActiveAudit(update: Partial<ActiveAudit> | null) {
    setActiveAudit((current) => {
      const next = update === null ? null : { ...(current ?? {}), ...update } as ActiveAudit;
      storeActiveAudit(next);
      return next;
    });
  }

  useEffect(() => {
    const saved = readActiveAudit();
    if (!saved || saved.locale !== locale || !saved.token) return;
    updateActiveAudit(saved);
    onAuditStartRef.current?.();
    let cancelled = false;
    const endpoint = withAuditRestore(`/api/audits/${encodeURIComponent(saved.token)}`, saved.restore);
    void fetch(endpoint, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<AuditLiveSnapshot> : null)
      .then(async (snapshot) => {
        if (cancelled || !snapshot) return;
        updateActiveAudit({ ...snapshot, token: saved.token });
        if (["completed", "partial", "failed"].includes(snapshot.status ?? "")) {
          await pause(500);
          if (cancelled) return;
          updateActiveAudit(null);
          router.push(withAuditRestore(localizedPath(locale, `audit/${saved.token}`), saved.restore));
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [locale, router]);

  function advance(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const url = form?.elements.namedItem("url");
    if (!(url instanceof HTMLInputElement) || !url.reportValidity()) return;
    setServerError("");
    setStep(2);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fields = new FormData(form);
    const domain = getDomain(String(fields.get("url") ?? ""));
    updateActiveAudit({
      locale,
      domain,
      status: "validating_target",
      pagesChecked: 0,
      pagesDiscovered: 0,
      pageLimit: PUBLIC_AUDIT_PAGE_LIMIT,
      createdAt: Date.now(),
    });
    onAuditStart?.();
    setPending(true);
    setServerError("");
    try {
      const csrf = token || await refresh();
      const { utm } = collectBrowserAttribution();
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({
          url: fields.get("url"),
          name: fields.get("name"),
          contact: fields.get("contact"),
          consent: fields.get("consent") === "on",
          authority: fields.get("authority") === "on",
          honeypot: fields.get("honeypot"),
          utm,
          turnstileToken,
          locale,
          source: compact ? "free-audit-page" : "home-hero",
        }),
      });
      let data: { token?: string; restore?: string; message?: string };
      if (response.ok && isPublicAuditStreamResponse(response)) {
        const completed = await consumePublicAuditStream(response, (streamEvent: PublicAuditStreamEvent) => {
          if (streamEvent.type === "accepted") {
            updateActiveAudit({ token: streamEvent.token, status: "connecting", pageLimit: streamEvent.pageLimit });
          } else if (streamEvent.type === "progress") {
            updateActiveAudit({
              token: streamEvent.token,
              status: streamEvent.status,
              pagesChecked: streamEvent.pagesChecked,
              pagesDiscovered: streamEvent.pagesDiscovered,
              pageLimit: streamEvent.pageLimit,
            });
          } else if (streamEvent.type === "completed") {
            updateActiveAudit({ token: streamEvent.token, status: streamEvent.status, restore: streamEvent.restore, completedAt: Date.now() });
          }
        });
        data = { token: completed.token, restore: completed.restore };
      } else {
        data = await response.json() as { token?: string; restore?: string; message?: string };
      }
      if (!response.ok || !data.token) {
        updateActiveAudit(null);
        setServerError(data.message ?? (ru ? "Не удалось создать проверку. Попробуйте ещё раз." : "Could not create the audit. Please try again."));
        setTurnstileReset((value) => value + 1);
        onAuditError?.();
        return;
      }
      saveAuditLeadHandoff(window.sessionStorage, {
        token: data.token,
        name: String(fields.get("name") ?? ""),
        contact: String(fields.get("contact") ?? ""),
        domain: normalizeAuditDomain(String(fields.get("url") ?? "")),
      });
      updateActiveAudit({ token: data.token, status: "completed", restore: data.restore, completedAt: Date.now() });
      await pause(500);
      updateActiveAudit(null);
      router.push(withAuditRestore(localizedPath(locale, `audit/${data.token}`), data.restore));
    } catch (error) {
      updateActiveAudit(null);
      setServerError(error instanceof PublicAuditStreamError
        ? error.message
        : ru ? "Не удалось связаться с сервером. Попробуйте ещё раз." : "Could not reach the server. Please try again.");
      setTurnstileReset((value) => value + 1);
      onAuditError?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {activeAudit && <AuditLiveOverlay locale={locale} domain={activeAudit.domain} snapshot={activeAudit}/>} 
    <form className={`audit-form audit-form--two-step${compact ? " audit-form-compact" : ""}`} onSubmit={submit}>
      <div className="form-heading">
        <span className="status-dot"/>
        <h2>{d.title}</h2>
        <span className="form-limit">{ru ? "до 10 страниц" : "up to 10 pages"}</span>
      </div>
      <p className="audit-form-step-status" aria-live="polite">
        {ru ? `Шаг ${step} из 2` : `Step ${step} of 2`}
      </p>
      <FreeAuditUsageCounter locale={locale}/>

      <label>
        <span>{d.url}</span>
        <input name="url" type="url" inputMode="url" autoComplete="url" placeholder="https://example.ru" required maxLength={2048}/>
      </label>

      {step === 1 ? (
        <div className="form-actions form-actions--first-step">
          <button className="button button-primary" type="button" onClick={advance}>
            <span>{d.submit}</span><span aria-hidden="true">→</span>
          </button>
          <Link className="text-link" href={localizedPath(locale, "free-audit")}>{d.details}</Link>
        </div>
      ) : (
        <div className="audit-form-second-step">
          <p className="audit-form-explanation">
            {ru
              ? "Оставьте удобный контакт. На e-mail дополнительно отправим ссылку на результат."
              : "Leave a convenient contact. We will also email the result link when you provide an email address."}
          </p>
          <div className="form-row">
            <label><span>{d.name}</span><input name="name" autoComplete="name" autoFocus required minLength={2} maxLength={80}/></label>
            <label><span>{d.contact}</span><input name="contact" type="text" autoComplete="off" required minLength={4} maxLength={160}/></label>
          </div>
          <label className="honeypot" aria-hidden="true">Company website<input name="honeypot" tabIndex={-1} autoComplete="off" maxLength={0}/></label>
          <label className="check-field"><input name="consent" type="checkbox" required/><span>{d.consent} <Link href={localizedPath(locale, "consent")}>{ru ? "Условия" : "Terms"}</Link></span></label>
          <label className="check-field"><input name="authority" type="checkbox" required/><span>{d.authority}</span></label>
          <TurnstileField onToken={setTurnstileToken} resetKey={turnstileReset}/>
          {serverError && <p className="form-error" role="alert">{serverError}</p>}
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={pending || !token || !turnstileToken}>
              <span>{pending ? d.pending : (ru ? "Запустить проверку" : "Start the check")}</span><span aria-hidden="true">↗</span>
            </button>
            <button className="text-link audit-form-edit-url" type="button" onClick={() => setStep(1)}>
              {ru ? "Изменить адрес" : "Change address"}
            </button>
          </div>
        </div>
      )}
    </form>
    </>
  );
}
