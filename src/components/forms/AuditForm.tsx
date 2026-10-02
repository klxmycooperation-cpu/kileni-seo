"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { ConsentNotice } from "./ConsentNotice";

const ACTIVE_AUDIT_KEY = "kileni:active-audit:v1";

function normalizeAuditUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z\d+.-]*:/iu.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function auditUrlError(value: string, ru: boolean): string {
  const normalized = normalizeAuditUrl(value);
  if (!normalized) return ru ? "Укажите адрес сайта." : "Enter the website address.";
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/\.$/u, "");
    if (
      !["http:", "https:"].includes(url.protocol)
      || !hostname.includes(".")
      || /\s/u.test(hostname)
      || url.username
      || url.password
    ) {
      throw new Error("unsupported-url");
    }
    return "";
  } catch {
    return ru
      ? "Проверьте адрес — например, example.ru или https://example.ru."
      : "Check the address — for example, example.com or https://example.com.";
  }
}

type ActiveAudit = AuditLiveSnapshot & {
  locale: Locale;
  domain: string;
  restore?: string;
};

function getDomain(value: string): string {
  try {
    const normalized = /^[a-z][a-z\d+.-]*:/iu.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    return new URL(normalized).hostname.replace(/^www\./u, "");
  } catch {
    return value.trim();
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

type AuditSubmissionResponse = {
  error?: string;
  token?: string;
  restore?: string;
  status?: string;
  message?: string;
};

function auditServiceUnavailableMessage(ru: boolean): string {
  return ru
    ? "Сервис проверки временно недоступен. Повторите попытку через минуту."
    : "The audit service is temporarily unavailable. Please try again in a minute.";
}

async function readAuditSubmissionResponse(response: Response, ru: boolean): Promise<AuditSubmissionResponse> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("json")) return { message: auditServiceUnavailableMessage(ru) };
  try {
    const payload = await response.json() as unknown;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return { message: auditServiceUnavailableMessage(ru) };
    }
    return payload as AuditSubmissionResponse;
  } catch {
    return { message: auditServiceUnavailableMessage(ru) };
  }
}

function auditRequestErrorMessage(error: unknown, ru: boolean): string {
  if (error instanceof PublicAuditStreamError) return error.message;
  if (error instanceof Error && error.name === "AbortError") {
    return ru
      ? "Сервер проверки не успел ответить. Повторите попытку через минуту."
      : "The audit server did not respond in time. Please try again in a minute.";
  }
  return ru
    ? "Не удалось получить ответ от сервера. Проверьте подключение и попробуйте ещё раз."
    : "Could not get a response from the server. Check your connection and try again.";
}

export function AuditForm({
  locale,
  compact = false,
  submitLabel,
  onAuditStart,
  onAuditError,
}: {
  locale: Locale;
  compact?: boolean;
  submitLabel?: string;
  onAuditStart?: () => void;
  onAuditError?: () => void;
}) {
  const d = getDictionary(locale).auditForm;
  const ru = locale === "ru";
  const router = useRouter();
  const { token, refresh, error: csrfError, loading: csrfLoading } = useCsrf();
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [activeAudit, setActiveAudit] = useState<ActiveAudit | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [forceFresh, setForceFresh] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlFocusRequest, setUrlFocusRequest] = useState(0);
  const [emailValue, setEmailValue] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileReset, setTurnstileReset] = useState(0);
  const onAuditStartRef = useRef(onAuditStart);
  const formRef = useRef<HTMLFormElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const enteredBeforeHydration = urlInputRef.current?.value.trim();
    const value = enteredBeforeHydration || params.get("url")?.trim();
    setForceFresh(params.get("fresh") === "1");
    if (!value || value.length > 2048) return;
    setUrlValue(value);
    if (urlInputRef.current) urlInputRef.current.value = value;
  }, []);

  useEffect(() => {
    onAuditStartRef.current = onAuditStart;
  }, [onAuditStart]);

  useLayoutEffect(() => {
    if (urlFocusRequest === 0) return;
    urlInputRef.current?.focus({ preventScroll: true });
  }, [urlFocusRequest]);

  function updateActiveAudit(update: Partial<ActiveAudit> | null) {
    setActiveAudit((current) => {
      if (update === null) {
        storeActiveAudit(null);
        return null;
      }
      const recentEvents = [...(current?.recentEvents ?? [])];
      if (update.eventKind) {
        const path = update.currentUrl ? auditProgressPath(update.currentUrl) : undefined;
        const event = {
          kind: update.eventKind,
          ...(path ? { path } : {}),
          ...(update.currentPageType ? { pageType: update.currentPageType } : {}),
          ...(update.eventCreatedAt ? { createdAt: update.eventCreatedAt } : {}),
        };
        const existingIndex = recentEvents.findIndex((item) =>
          item.kind === event.kind
          && item.path === event.path
          && item.pageType === event.pageType
        );
        const previous = existingIndex >= 0 ? recentEvents.splice(existingIndex, 1)[0] : undefined;
        recentEvents.push({
          ...previous,
          ...event,
          ...(event.createdAt ?? previous?.createdAt ? { createdAt: event.createdAt ?? previous?.createdAt } : {}),
        });
      }
      const next = {
        ...(current ?? {}),
        ...update,
        ...(recentEvents.length > 0 ? { recentEvents: recentEvents.slice(-3) } : {}),
        ...(typeof current?.pagesChecked === "number" && typeof update.pagesChecked === "number" ? { pagesChecked: Math.max(current.pagesChecked, update.pagesChecked) } : {}),
        ...(typeof current?.pagesDiscovered === "number" && typeof update.pagesDiscovered === "number" ? { pagesDiscovered: Math.max(current.pagesDiscovered, update.pagesDiscovered) } : {}),
      } as ActiveAudit;
      const checkedUrls = mergeAuditProgressUrls(current?.checkedUrls, update.checkedUrls);
      const failedUrls = mergeAuditProgressUrls(current?.failedUrls, update.failedUrls)
        .filter((url) => !checkedUrls.includes(url));
      if (current?.checkedUrls !== undefined || update.checkedUrls !== undefined) next.checkedUrls = checkedUrls;
      if (current?.failedUrls !== undefined || update.failedUrls !== undefined) next.failedUrls = failedUrls;
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
        await pause(["completed", "partial", "failed"].includes(snapshot.status ?? "") ? 500 : 150);
        if (cancelled) return;
        updateActiveAudit(null);
        router.push(withAuditRestore(localizedPath(locale, `audit/${saved.token}`), saved.restore));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [locale, router]);

  function advanceFromUrl(value = urlInputRef.current?.value ?? urlValue) {
    const error = auditUrlError(value, ru);
    if (error) {
      setUrlError(error);
      setUrlFocusRequest((value) => value + 1);
      return;
    }
    const normalized = normalizeAuditUrl(value);
    setUrlValue(normalized);
    if (urlInputRef.current) urlInputRef.current.value = normalized;
    setUrlError("");
    setServerError("");
    setStep(2);
  }

  function advance() {
    advanceFromUrl();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const normalizedUrl = normalizeAuditUrl(urlInputRef.current?.value ?? urlValue);
    const nextUrlError = auditUrlError(normalizedUrl, ru);
    if (nextUrlError) {
      setUrlError(nextUrlError);
      setStep(1);
      setUrlFocusRequest((value) => value + 1);
      return;
    }
    if (step === 1) {
      setUrlValue(normalizedUrl);
      setUrlError("");
      setServerError("");
      setStep(2);
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fields = new FormData(form);
    const domain = getDomain(normalizedUrl);
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
    let requestTimeout: number | undefined;
    let acceptedToken: string | undefined;
    let acceptedRestore: string | undefined;
    try {
      let csrf = token || await refresh();
      const { utm } = collectBrowserAttribution();
      const requestController = new AbortController();
      requestTimeout = window.setTimeout(() => requestController.abort("audit-request-timeout"), 75_000);
      const body = JSON.stringify({
        url: normalizedUrl,
        email: fields.get("email"),
        consent: fields.get("consent") === "on",
        authority: fields.get("authority") === "on",
        honeypot: fields.get("honeypot"),
        utm,
        turnstileToken,
        locale,
        forceFresh,
        source: compact ? "free-audit-page" : "home-hero",
      });
      const sendAudit = (csrfToken: string) => fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        signal: requestController.signal,
        body,
      });
      let response = await sendAudit(csrf);
      let data: AuditSubmissionResponse | undefined;
      if (!response.ok) {
        data = await readAuditSubmissionResponse(response, ru);
        // A browser may retain a token from another tab or from an interrupted
        // initial load. Renew once and retry the idempotent audit creation.
        if (data.error === "CSRF_REJECTED") {
          csrf = await refresh(true);
          response = await sendAudit(csrf);
          data = undefined;
        }
      }
      if (response.ok && isPublicAuditStreamResponse(response)) {
        const completed = await consumePublicAuditStream(response, (streamEvent: PublicAuditStreamEvent) => {
          if (streamEvent.type === "accepted") {
            acceptedToken = streamEvent.token;
            updateActiveAudit({ token: streamEvent.token, status: "connecting", pageLimit: streamEvent.pageLimit });
          } else if (streamEvent.type === "progress") {
            const { type, ...progress } = streamEvent;
            if (type !== "progress") return;
            updateActiveAudit(progress);
          } else if (streamEvent.type === "completed") {
            acceptedToken = streamEvent.token;
            acceptedRestore = streamEvent.restore;
            updateActiveAudit({ token: streamEvent.token, status: streamEvent.status, restore: streamEvent.restore, completedAt: Date.now() });
          }
        });
        data = { token: completed.token, restore: completed.restore };
      } else if (!data) {
        data = await readAuditSubmissionResponse(response, ru);
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
        name: "",
        contact: String(fields.get("email") ?? ""),
        domain: normalizeAuditDomain(normalizedUrl),
      });
      updateActiveAudit({
        token: data.token,
        status: data.status ?? (data.restore ? "completed" : "queued"),
        restore: data.restore,
        ...(data.restore ? { completedAt: Date.now() } : {}),
      });
      await pause(data.restore ? 560 : 80);
      router.push(withAuditRestore(localizedPath(locale, `audit/${data.token}`), data.restore));
    } catch (error) {
      if (acceptedToken) {
        saveAuditLeadHandoff(window.sessionStorage, {
          token: acceptedToken,
          name: "",
          contact: String(fields.get("email") ?? ""),
          domain: normalizeAuditDomain(normalizedUrl),
        });
        updateActiveAudit({ token: acceptedToken, status: "connecting", restore: acceptedRestore });
        router.push(withAuditRestore(localizedPath(locale, `audit/${acceptedToken}`), acceptedRestore));
        return;
      }
      updateActiveAudit(null);
      setServerError(auditRequestErrorMessage(error, ru));
      setTurnstileReset((value) => value + 1);
      onAuditError?.();
    } finally {
      window.clearTimeout(requestTimeout);
      setPending(false);
    }
  }

  return (
    <>
      {activeAudit && <AuditLiveOverlay locale={locale} domain={activeAudit.domain} snapshot={activeAudit}/>} 
    <form ref={formRef} method="post" className={`audit-form audit-form--two-step${compact ? " audit-form-compact" : ""}`} onSubmit={submit}>
      <div className="form-heading">
        <span className="status-dot"/>
        <h2>{d.title}</h2>
        <span className="form-limit">{d.limit}</span>
      </div>
      <p className="audit-form-step-status" aria-live="polite">
        {ru ? `Шаг ${step} из 2` : `Step ${step} of 2`}
      </p>
      <FreeAuditUsageCounter locale={locale}/>

      <label htmlFor="audit-url">
        <span>{d.url}</span>
        <input
          id="audit-url"
          ref={urlInputRef}
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="example.ru"
          required
          maxLength={2048}
          aria-invalid={urlError ? "true" : undefined}
          aria-describedby={urlError ? "audit-url-error" : undefined}
          defaultValue=""
          onInput={(event) => {
            setUrlValue(event.currentTarget.value);
            if (urlError) setUrlError("");
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            advanceFromUrl(event.currentTarget.value);
          }}
          onBlur={(event) => {
            const value = event.currentTarget.value;
            if (!value.trim()) return;
            const error = auditUrlError(value, ru);
            setUrlError(error);
            if (!error) {
              const normalized = normalizeAuditUrl(value);
              setUrlValue(normalized);
              event.currentTarget.value = normalized;
            }
          }}
        />
      </label>
      {urlError && <p className="form-error audit-url-error" id="audit-url-error" role="alert">{urlError}</p>}

      {step === 1 ? (
        <div className="form-actions form-actions--first-step">
          <button
            className="button button-primary"
            type="button"
            onMouseDown={(event) => {
              if (auditUrlError(urlInputRef.current?.value ?? urlValue, ru)) event.preventDefault();
            }}
            onClick={advance}
          >
            <span>{submitLabel ?? d.submit}</span><span aria-hidden="true">→</span>
          </button>
          <Link className="text-link" href={localizedPath(locale, "free-audit")}>{d.details}</Link>
        </div>
      ) : (
        <div className="audit-form-second-step">
          <p className="audit-form-explanation">
            <strong>{ru ? "Результат откроется сразу. Email — по желанию" : "The result opens right away. Email is optional"}</strong>
          </p>
          <p className="audit-form-explanation" id="audit-email-purpose">
            <small>{ru ? "Оставьте email, если хотите сохранить отчёт в почте. Отправим только этот результат — без рассылок." : "Leave an email if you want to save the report in your inbox. We send this result only, with no marketing."}</small>
          </p>
          <label>
            <span>{ru ? "Email (необязательно)" : "Email (optional)"}</span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              maxLength={160}
              aria-describedby="audit-email-purpose"
              value={emailValue}
              onChange={(event) => setEmailValue(event.currentTarget.value)}
            />
          </label>
          <label className="honeypot" aria-hidden="true">Company website<input name="honeypot" tabIndex={-1} autoComplete="off" maxLength={0}/></label>
          {emailValue.trim() !== "" && (
            <label className="check-field"><input name="consent" type="checkbox" required/><ConsentNotice locale={locale} purpose="audit-report"/></label>
          )}
          <label className="check-field"><input name="authority" type="checkbox" required/><span>{d.authority}</span></label>
          <TurnstileField onToken={setTurnstileToken} resetKey={turnstileReset}/>
          {csrfError && (
            <p className="form-error" role="alert">
              {ru ? "Не удалось подготовить защищённую отправку." : "Could not prepare secure submission."}{" "}
              <button type="button" className="form-error__retry" onClick={() => void refresh().catch(() => undefined)}>
                {ru ? "Повторить" : "Retry"}
              </button>
            </p>
          )}
          {serverError && <p className="form-error" role="alert">{serverError}</p>}
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={pending || csrfLoading || !token || !turnstileToken}>
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

function mergeAuditProgressUrls(current: readonly string[] | undefined, next: readonly string[] | undefined): string[] {
  return [...new Set([...(current ?? []), ...(next ?? [])])];
}

function auditProgressPath(value: string): string | undefined {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return undefined;
  }
}
