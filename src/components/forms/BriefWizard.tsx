"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatOfferPrice, getOffer, localizedOffer, type LocalizedOffer } from "../../config/offers";
import type { Locale } from "../../config/site";
import { briefServices, commonBriefQuestions, qLabel, serviceQuestions, type BriefService } from "../../content/brief";
import { readAuditLeadHandoff } from "../../lib/audit/lead-handoff";
import { BRIEF_DRAFT_KEY, parseBriefDraft, resolveBriefOfferState, type BriefDraftV2 } from "../../lib/brief/offer-state";
import { briefPresentationEntries } from "../../lib/brief/presentation";
import { useCsrf } from "./useCsrf";
import { TurnstileField } from "./TurnstileField";
import { ConsentNotice } from "./ConsentNotice";

type Answers = Record<string, string>;
type Guide = { price: string; title?: string; scope?: string; duration?: string; included: string[]; prepare: string[] };

export function BriefWizard({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const { token, refresh } = useCsrf();
  const [step, setStep] = useState(0);
  const [service, setService] = useState<BriefService>("seo");
  const [offerId, setOfferId] = useState<string>();
  const [answers, setAnswers] = useState<Answers>({});
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [invalidField, setInvalidField] = useState<string>();
  const [pending, setPending] = useState(false);
  const [visualKeyboardOpen, setVisualKeyboardOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);
  const initialized = useRef(false);

  const routeLabels = ru
    ? ["Направление", "Цель", "Что уже есть", "Контакт", "Готово"]
    : ["Direction", "Goal", "What exists", "Contact", "Done"];

  useEffect(() => {
    const saved = parseBriefDraft(localStorage.getItem(BRIEF_DRAFT_KEY)) ?? readLegacyDraft(localStorage.getItem("kileni-brief"));
    const resolved = resolveBriefOfferState(searchKey ? `?${searchKey}` : "", saved);
    let nextService = resolved.service;
    let nextAnswers = resolved.answers;
    const query = new URLSearchParams(searchKey);
    const auditToken = query.get("audit");
    const handoff = auditToken ? readAuditLeadHandoff(window.sessionStorage, auditToken) : null;
    if (handoff) {
      const legacyOffer = query.get("offer");
      if (!resolved.offerId && (legacyOffer === "audit" || legacyOffer === "audit-fix")) nextService = "audit";
      if (!resolved.offerId && legacyOffer === "promotion") nextService = "seo";
      nextAnswers = {
        ...nextAnswers,
        sourceOffer: resolved.offerId ?? legacyOffer ?? "",
        name: nextAnswers.name || handoff.name,
        contact: nextAnswers.contact || handoff.contact,
        url: nextAnswers.url || `https://${handoff.domain}`,
      };
    }
    setService(nextService);
    setAnswers(nextAnswers);
    setOfferId(resolved.offerId);
    setStep(resolved.step);
    if (resolved.invalidOfferId && !handoff) {
      setStatus(ru ? "Выбранное предложение не найдено. Выберите подходящий вариант ещё раз." : "The selected offer was not found. Please choose an option again.");
    }
    setDraftReady(true);
    initialized.current = true;
  }, [ru, searchKey]);

  useEffect(() => {
    if (!draftReady || !initialized.current) return;
    const draft: BriefDraftV2 = { version: 2, service, offerId, answers, step };
    localStorage.setItem(BRIEF_DRAFT_KEY, JSON.stringify(draft));
    localStorage.removeItem("kileni-brief");
  }, [draftReady, service, offerId, answers, step]);

  useEffect(() => {
    if (!draftReady || previousStep.current === step) return;
    previousStep.current = step;
    const heading = headingRef.current;
    if (!heading) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      block: "start",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [draftReady, step]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let fullHeight = Math.max(window.innerHeight, viewport.height);
    let fullWidth = viewport.width;
    const editableSelector = "input, textarea, select, [contenteditable='true']";

    const updateKeyboardState = () => {
      const activeElement = document.activeElement;
      const editing = activeElement instanceof HTMLElement && activeElement.matches(editableSelector);
      const orientationChanged = Math.abs(viewport.width - fullWidth) > 40;

      if (orientationChanged || !editing) {
        fullWidth = viewport.width;
        fullHeight = Math.max(window.innerHeight, viewport.height);
      }

      setVisualKeyboardOpen(editing && fullHeight - viewport.height > 120);
    };
    const updateAfterFocus = () => window.requestAnimationFrame(updateKeyboardState);

    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);
    document.addEventListener("focusin", updateAfterFocus);
    document.addEventListener("focusout", updateAfterFocus);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
      document.removeEventListener("focusin", updateAfterFocus);
      document.removeEventListener("focusout", updateAfterFocus);
    };
  }, []);

  const questions = useMemo(
    () => step === 1 ? commonBriefQuestions : serviceQuestions[service],
    [service, step],
  );
  const selectedOffer = useMemo(() => getOffer(offerId), [offerId]);
  const localizedSelectedOffer = useMemo(() => selectedOffer ? localizedOffer(selectedOffer, locale) : undefined, [selectedOffer, locale]);
  const guide = useMemo(() => briefGuide(service, locale, localizedSelectedOffer), [service, locale, localizedSelectedOffer]);
  const requiredQuestionKeys = requiredKeysForStep(step, service);
  const primaryQuestions = questions.filter((question) => requiredQuestionKeys.includes(question.key));
  const optionalQuestions = questions.filter((question) => !primaryQuestions.includes(question));
  const update = (key: string, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    if (invalidField === key) setInvalidField(undefined);
    if (status) setStatus("");
  };

  function chooseService(nextService: BriefService) {
    // A direct link from pricing is an explicit choice. Keep it intact when a
    // visitor confirms the same direction, but discard it as soon as they
    // deliberately choose another one.
    if (nextService === service) return;

    setService(nextService);
    setOfferId(undefined);
    setAnswers((current) => {
      const nextAnswers = { ...current };
      delete nextAnswers.sourceOffer;
      delete nextAnswers.selectedTier;
      delete nextAnswers.sourceService;
      delete nextAnswers.platform;
      return nextAnswers;
    });
    setStatus("");

    const url = new URL(window.location.href);
    // These parameters either describe the previous offer or preselect a
    // service. Leaving them in the address would restore stale state after a
    // reload even though the visitor has made a new choice.
    url.searchParams.delete("offer");
    url.searchParams.delete("service");
    url.searchParams.delete("platform");
    url.searchParams.delete("tier");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function pickFiles(list: FileList | null) {
    const selected = Array.from(list ?? []);
    const allowed = /\.(?:pdf|docx|xlsx|png|jpe?g)$/iu;
    if (selected.some((file) => !allowed.test(file.name))) {
      setStatus(ru ? "Можно приложить PDF, DOCX, XLSX, PNG или JPG." : "You can attach PDF, DOCX, XLSX, PNG or JPG files.");
      return;
    }
    const next = [...files, ...selected].slice(0, 5);
    if (next.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024) {
      setStatus(ru ? "Файлы вместе не должны превышать 10 МБ." : "Files must not exceed 10 MB in total.");
      return;
    }
    setFiles(next);
    setStatus("");
  }

  function goNext() {
    const issue = briefStepIssue(step, service, answers, locale);
    if (issue) {
      setInvalidField(issue.key);
      setStatus(issue.message);
      focusBriefField(issue.key);
      return;
    }
    const normalized = normalizeBriefUrls(step, service, answers);
    if (normalized !== answers) setAnswers(normalized);
    setInvalidField(undefined);
    setStatus("");
    setStep((value) => value + 1);
  }

  async function submit() {
    const issue = briefStepIssue(3, service, answers, locale);
    if (issue) {
      setInvalidField(issue.key);
      setStatus(issue.message);
      focusBriefField(issue.key);
      return;
    }
    if (pending) return;
    setPending(true);
    setStatus(ru ? "Сохраняем бриф…" : "Saving brief…");
    try {
      const csrf = token || await refresh();
      const form = new FormData();
      form.set("payload", JSON.stringify({
        name: answers.name,
        contact: answers.contact,
        consent: answers.consent === "yes",
        honeypot: "",
        turnstileToken,
        locale,
        service,
        offerId,
        answers,
      }));
      files.forEach((file) => form.append("files", file));
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "x-csrf-token": csrf },
        body: form,
      });
      if (response.ok) {
        setStatus(ru ? "Бриф сохранён. Мы свяжемся в рабочее время." : "Brief saved. We will follow up during working hours.");
        setDraftReady(false);
        localStorage.removeItem(BRIEF_DRAFT_KEY);
        localStorage.removeItem("kileni-brief");
        setStep(4);
        return;
      }
      const data = await response.json().catch(() => ({})) as { message?: string };
      setStatus(data.message ?? (ru ? "Не удалось сохранить бриф. Проверьте поля и попробуйте ещё раз." : "Could not save the brief. Check the fields and try again."));
      setTurnstileReset((value) => value + 1);
    } catch {
      setStatus(ru ? "Нет связи с сервером. Ответы сохранены в браузере — попробуйте отправить ещё раз." : "The server is unavailable. Your answers remain saved in this browser; please try again.");
    } finally {
      setPending(false);
    }
  }

  const currentRouteStep = Math.min(step, 4);
  const heading = step === 0
    ? (ru ? "С чего начнём?" : "Where should we start?")
    : step === 1
      ? (ru ? "О задаче" : "About the project")
      : step === 2
        ? (ru ? "Детали по направлению" : "Service details")
        : step === 3
          ? (ru ? "Итог перед отправкой" : "Summary before sending")
          : (ru ? "Спасибо. Бриф уже в работе." : "Thank you. The brief is in our queue.");

  return (
    <div className="brief-wizard" data-visual-keyboard={visualKeyboardOpen ? "open" : undefined}>
      <aside
        className="brief-compass"
        aria-label={ru ? "Состав и стоимость выбранной услуги" : "Selected service scope and price"}
        tabIndex={0}
      >
        <nav className="brief-route" aria-label={ru ? "Путь брифа" : "Brief route"}>
          <p>{ru ? "От задачи к расчёту" : "From task to estimate"}</p>
          <ol>
            {routeLabels.map((label, index) => (
              <li
                className={index < currentRouteStep ? "complete" : ""}
                aria-current={index === currentRouteStep ? "step" : undefined}
                key={label}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{label}</b>
              </li>
            ))}
          </ol>
          <small>{ru ? "Черновик остаётся в этом браузере" : "Your draft stays in this browser"}</small>
        </nav>
        <ServiceGuide locale={locale} service={service} offer={localizedSelectedOffer} guide={guide} />
      </aside>

      <div className="brief-panel">
        <div
          className="brief-progress"
          role="progressbar"
          aria-label={ru ? "Заполнение брифа" : "Brief completion"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={currentRouteStep * 25}
        >
          <span style={{ width: `${currentRouteStep * 25}%` }} />
        </div>
        <div className="brief-step-label">
          <span className="mono">{String(currentRouteStep + 1).padStart(2, "0")} / 05</span>
          <p>{routeLabels[currentRouteStep]}</p>
        </div>

        <section aria-labelledby="brief-current-step">
          <h2 id="brief-current-step" ref={headingRef} tabIndex={-1}>{heading}</h2>
          {step === 0 && (
            <>
              <p className="brief-step-intro">{ru ? "Выберите ближайший вариант. Бриф займёт 5–7 минут; технические термины не нужны, а неясные пункты можно отметить «не уверен»." : "Choose the closest option. The brief takes 5–7 minutes; no technical terminology is required, and “Not sure” is a valid answer."}</p>
              <div className="service-choice" aria-labelledby="brief-current-step">
                {briefServices.map((item, index) => {
                  const label = ru ? item.ru : item.en;
                  return (
                    <button
                      type="button"
                      className={service === item.id ? "selected" : ""}
                      aria-label={label}
                      aria-pressed={service === item.id}
                      key={item.id}
                      onClick={() => chooseService(item.id)}
                    >
                      <span className="brief-choice-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <span className="brief-choice-title">{label}</span>
                      <span className="brief-choice-copy">{ru ? item.textRu : item.textEn}</span>
                      <strong className="brief-choice-price">{briefGuide(item.id, locale).price}</strong>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {(step === 1 || step === 2) && (
            <>
              <p className="brief-step-intro">{ru ? "Сначала — вопросы, которые влияют на состав и цену. Всё остальное можно раскрыть и дополнить при желании." : "Start with the answers that affect scope and price. Open the optional section only when it is useful."}</p>
              <QuestionFields questions={primaryQuestions} locale={locale} answers={answers} update={update} requiredKeys={requiredQuestionKeys} invalidField={invalidField} />
              {optionalQuestions.length > 0 && (
                <details className="brief-optional">
                  <summary>{ru ? `Дополнительные вопросы · ${optionalQuestions.length}` : `Optional questions · ${optionalQuestions.length}`}</summary>
                  <p>{ru ? "Помогут подготовить предложение точнее, но не обязательны для отправки." : "These make the proposal more precise but are not required to send the brief."}</p>
                  <QuestionFields questions={optionalQuestions} locale={locale} answers={answers} update={update} startIndex={primaryQuestions.length} invalidField={invalidField} />
                </details>
              )}
            </>
          )}

          {step === 3 && (
            <div className="brief-review">
              <p className="brief-contact-intro">{ru ? "Оставьте контакт для расчёта. Ответы можно проверить ниже — обзор свёрнут, чтобы форма оставалась короткой." : "Leave a contact for the estimate. You can review every answer below; the review stays collapsed to keep this step short."}</p>
              <div className="brief-fields brief-contact-fields">
                <label data-question-number="01" data-question-key="name">
                  <span>{ru ? "Имя" : "Name"}</span>
                  <input name="name" autoComplete="name" maxLength={100} required aria-invalid={invalidField === "name"} value={answers.name ?? ""} onChange={(event) => update("name", event.target.value)} />
                  {invalidField === "name" && <small className="brief-field-error">{ru ? "Напишите, как к вам обращаться." : "Tell us how to address you."}</small>}
                </label>
                <label data-question-number="02" data-question-key="contact">
                  <span>{ru ? "Телефон или e-mail" : "Phone or email"}</span>
                  <input name="contact" maxLength={254} type="text" placeholder={ru ? "+7 999 123-45-67 или name@example.ru" : "+1 555 123 4567 or name@example.com"} required aria-invalid={invalidField === "contact"} value={answers.contact ?? ""} onChange={(event) => update("contact", event.target.value)} />
                  <small>{ru ? "Нужен только для ответа по этому брифу." : "Used only to reply to this brief."}</small>
                  {invalidField === "contact" && <small className="brief-field-error">{ru ? "Укажите корректный телефон или e-mail." : "Enter a valid phone number or email."}</small>}
                </label>
                <label className="check-field" data-question-key="consent">
                  <input type="checkbox" checked={answers.consent === "yes"} onChange={(event) => update("consent", event.target.checked ? "yes" : "")} />
                  <ConsentNotice locale={locale}/>
                  {invalidField === "consent" && <small className="brief-field-error">{ru ? "Подтвердите согласие, чтобы отправить бриф." : "Confirm consent to send the brief."}</small>}
                </label>
                <label className="file-drop">
                  <span>{ru ? "Приложить до 5 файлов · PDF, DOCX, XLSX, PNG, JPG · всего до 10 МБ" : "Attach up to 5 files · PDF, DOCX, XLSX, PNG, JPG · 10 MB total"}</span>
                  <input type="file" multiple accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={(event) => pickFiles(event.target.files)} />
                </label>
                {files.length > 0 && (
                  <ul className="brief-file-list">
                    {files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}`}><span>{file.name} · {Math.ceil(file.size / 1024)} KB</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{ru ? "Убрать" : "Remove"}</button></li>)}
                  </ul>
                )}
                <TurnstileField onToken={setTurnstileToken} resetKey={turnstileReset} />
              </div>
              <section className="brief-response-promise" aria-labelledby="brief-response-title">
                <h3 id="brief-response-title">{ru ? "Что вы получите в ответ" : "What you receive in response"}</h3>
                <ul>
                  <li>{ru ? "Рекомендуемый состав работ без лишних пунктов" : "A recommended scope without unnecessary items"}</li>
                  <li>{ru ? "Срок и последовательность этапов" : "Timing and sequence of stages"}</li>
                  <li>{ru ? "Стоимость и границы, за которые доплата не появится внезапно" : "Price and boundaries, so additional costs do not appear unexpectedly"}</li>
                </ul>
              </section>
              <details className="brief-review-details">
                <summary>{ru ? "Проверить все ответы" : "Review all answers"}</summary>
                <div className="brief-review-content">
                  <div className="brief-review-head">
                    <p>{ru ? "Вы выбрали" : "Selected service"}</p>
                    <strong>{localizedSelectedOffer?.title ?? serviceLabel(service, locale)}</strong>
                    <span>{guide.price}</span>
                  </div>
                  {localizedSelectedOffer && (
                    <dl className="brief-offer-facts" aria-label={ru ? "Параметры выбранного предложения" : "Selected offer details"}>
                      <div><dt>{ru ? "Объём" : "Scope"}</dt><dd>{localizedSelectedOffer.scope}</dd></div>
                      <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{localizedSelectedOffer.duration}</dd></div>
                      <div><dt>{ru ? "Результат" : "Result"}</dt><dd>{localizedSelectedOffer.result}</dd></div>
                    </dl>
                  )}
                  <dl className="brief-answer-review">
                    {briefPresentationEntries(answers, service, locale, { offerDetails: "exclude" })
                      .map((entry) => (
                        <div key={entry.key}>
                          <dt>{entry.label}</dt>
                          <dd>{entry.value}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              </details>
            </div>
          )}

          {step === 4 && (
            <div className="brief-success" role="status">
              <span aria-hidden="true">✓</span>
              <p>{status}</p>
            </div>
          )}
        </section>

        {status && step < 4 && <p className="form-error" role="status">{status}</p>}
        {step < 4 && (
          <div className="wizard-actions">
            <button type="button" className="button button-secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
              {ru ? "Назад" : "Back"}
            </button>
            {step < 3 ? (
              <button type="button" className="button button-primary" onClick={goNext}>
                {ru ? "Далее" : "Next"}<span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary"
                disabled={pending || !token || !turnstileToken}
                onClick={() => void submit()}
              >
                {pending ? (ru ? "Отправляем…" : "Sending…") : (ru ? "Получить расчёт" : "Get the estimate")}<span aria-hidden="true">↗</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type BriefQuestion = (typeof commonBriefQuestions)[number];

function QuestionFields({
  questions,
  locale,
  answers,
  update,
  startIndex = 0,
  requiredKeys = [],
  invalidField,
}: {
  questions: BriefQuestion[];
  locale: Locale;
  answers: Answers;
  update: (key: string, value: string) => void;
  startIndex?: number;
  requiredKeys?: string[];
  invalidField?: string;
}) {
  const ru = locale === "ru";

  return (
    <div className="brief-fields">
      {questions.map((question, index) => {
        const options = (question.options ?? []).filter((option, optionIndex, items) => (
          items.findIndex((candidate) => candidate.value === option.value) === optionIndex
        ));
        const hasUnknownOption = options.some((option) => option.value === "unknown");
        return (
          <label key={question.key} data-question-key={question.key} data-question-number={String(index + startIndex + 1).padStart(2, "0")}>
            <span>{qLabel(question, locale)}{requiredKeys.includes(question.key) && <small className="brief-required">{ru ? "обязательно" : "required"}</small>}</span>
            {question.type === "textarea" ? (
              <textarea name={question.key} rows={4} maxLength={3000} required={requiredKeys.includes(question.key)} aria-invalid={invalidField === question.key} placeholder={ru ? "Можно коротко и своими словами" : "A short plain-language answer is enough"} value={answers[question.key] ?? ""} onChange={(event) => update(question.key, event.target.value)} />
            ) : question.type === "select" ? (
              <select name={question.key} required={requiredKeys.includes(question.key)} aria-invalid={invalidField === question.key} value={answers[question.key] ?? ""} onChange={(event) => update(question.key, event.target.value)}>
                <option value="" hidden={hasUnknownOption}>{ru ? "Нужна помощь с выбором" : "Not sure — help me choose"}</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>{ru ? option.ru : option.en}</option>
                ))}
              </select>
            ) : (
              <input name={question.key} maxLength={question.type === "url" ? 2048 : 500} required={requiredKeys.includes(question.key)} aria-invalid={invalidField === question.key} inputMode={question.type === "url" ? "url" : "text"} type="text" placeholder={question.type === "url" ? "https://example.ru" : undefined} value={answers[question.key] ?? ""} onChange={(event) => update(question.key, event.target.value)} />
            )}
            {invalidField === question.key && <small className="brief-field-error">{ru ? "Заполните это поле, чтобы продолжить." : "Complete this field to continue."}</small>}
          </label>
        );
      })}
    </div>
  );
}

function ServiceGuide({ locale, service, offer, guide }: { locale: Locale; service: BriefService; offer?: LocalizedOffer; guide: Guide }) {
  const ru = locale === "ru";
  const [expanded, setExpanded] = useState(true);
  const contract = offer?.priceType === "fixed"
    ? (ru ? "Цена фиксирована для указанного объёма. Оплата на странице не требуется." : "The price is fixed for the stated scope. No payment is taken on this page.")
    : offer?.priceType === "from"
      ? (ru ? "Указана стартовая цена. Итог согласуем до начала. Оплата на странице не требуется." : "This is a starting price. The final scope is agreed before work begins. No payment is taken on this page.")
      : (ru ? "Состав и цена появятся после ответов. Оплата на странице не требуется." : "Scope and price follow the brief. No payment is taken on this page.");

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 680px)");
    const syncDisclosure = () => setExpanded(!mobile.matches);
    syncDisclosure();
    mobile.addEventListener("change", syncDisclosure);
    return () => mobile.removeEventListener("change", syncDisclosure);
  }, []);

  return (
    <section className="brief-service-guide brief-mobile-summary" aria-live="polite" aria-label={ru ? "Условия выбранной услуги" : "Selected service details"}>
      <h2 className="visually-hidden">{ru ? "Условия выбранной услуги" : "Selected service details"}</h2>
      <div className="brief-service-summary">
        <strong>{offer?.title ?? serviceLabel(service, locale)}</strong>
        <span>{guide.price}</span>
      </div>
      <details
        className="brief-service-details"
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary>{ru ? "Что входит и что подготовить" : "Scope and what to prepare"}</summary>
        <div className="brief-service-details-body">
          {offer && <dl className="brief-service-facts"><div><dt>{ru ? "Объём" : "Scope"}</dt><dd>{offer.scope}</dd></div><div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{offer.duration}</dd></div></dl>}
          <div>
            <h3>{ru ? "За что вы платите" : "What you are paying for"}</h3>
            <ul>{guide.included.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>{ru ? "Что подготовить" : "Prepare"}</h3>
            <ul>{guide.prepare.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <small>{contract}</small>
          {offer ? (
            <Link href={`${locale === "en" ? "/en" : ""}/pricing?category=${encodeURIComponent(offer.category)}&offer=${encodeURIComponent(offer.id)}`}>
              {ru ? "Изменить тариф" : "Change offer"}
            </Link>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function serviceLabel(service: BriefService, locale: Locale) {
  const item = briefServices.find((candidate) => candidate.id === service);
  return locale === "ru" ? item?.ru : item?.en;
}

function briefGuide(service: BriefService, locale: Locale, offer?: LocalizedOffer): Guide {
  const ru = locale === "ru";
  const definitions: Record<BriefService, { includedRu: string[]; includedEn: string[]; prepareRu: string[]; prepareEn: string[] }> = {
    seo: {
      includedRu: ["Приоритетные страницы", "Технические и контентные задачи", "Проверка сделанных изменений"],
      includedEn: ["Priority pages", "Technical and content tasks", "Verification of completed changes"],
      prepareRu: ["Адрес сайта", "Основные услуги и регионы", "Что уже пробовали"],
      prepareEn: ["Website URL", "Priority services and regions", "What has already been tried"],
    },
    audit: {
      includedRu: ["Список проблем по приоритету", "Примеры страниц и доказательства", "Задание на исправление"],
      includedEn: ["Prioritised issue list", "Page examples and evidence", "Implementation specification"],
      prepareRu: ["Адрес сайта", "Что беспокоит", "Что недавно изменилось"],
      prepareEn: ["Website URL", "What concerns you", "What changed recently"],
    },
    marketplaces: {
      includedRu: ["Поисковые запросы", "Название, описание и свойства", "Материалы для публикации"],
      includedEn: ["Search queries", "Title, description and attributes", "Ready-to-publish materials"],
      prepareRu: ["Ссылки или артикулы", "Исходные фото", "Главные преимущества товара"],
      prepareEn: ["Links or SKUs", "Source photos", "Main product advantages"],
    },
    development: {
      includedRu: ["Структура и прототип", "Дизайн ключевых экранов", "Адаптивная разработка и запуск"],
      includedEn: ["Structure and prototype", "Key-screen design", "Responsive development and launch"],
      prepareRu: ["Цель сайта", "Услуги или товары", "Примеры и готовые материалы"],
      prepareEn: ["Website goal", "Services or products", "References and available materials"],
    },
    ads: {
      includedRu: ["Структура кампаний", "Объявления и запросы", "Настроенные цели"],
      includedEn: ["Campaign structure", "Ads and queries", "Configured goals"],
      prepareRu: ["Ссылка на сайт", "Приоритетная услуга и регион", "Допустимый рекламный бюджет"],
      prepareEn: ["Website URL", "Priority service and region", "Available media budget"],
    },
    custom: {
      includedRu: ["Разбор задачи", "Предложенный состав", "Отдельная оценка этапов"],
      includedEn: ["Task review", "Recommended scope", "Separate estimate by stage"],
      prepareRu: ["Желаемый результат", "Ограничения", "Ссылки и примеры"],
      prepareEn: ["Desired outcome", "Constraints", "Links and examples"],
    },
  };
  const definition = definitions[service];
  return {
    price: offer ? formatOfferPrice(getOffer(offer.id)!, locale) : (ru ? "Стоимость после короткого брифа" : "Price after a short brief"),
    title: offer?.title,
    scope: offer?.scope,
    duration: offer?.duration,
    included: offer?.features ?? (ru ? definition.includedRu : definition.includedEn),
    prepare: ru ? definition.prepareRu : definition.prepareEn,
  };
}

function readLegacyDraft(value: string | null): BriefDraftV2 | undefined {
  if (!value) return undefined;
  try {
    const data = JSON.parse(value) as { service?: unknown; answers?: unknown; step?: unknown };
    if (
      typeof data.service !== "string"
      || !briefServices.some((item) => item.id === data.service)
      || !data.answers
      || typeof data.answers !== "object"
      || Array.isArray(data.answers)
      || typeof data.step !== "number"
      || !Number.isFinite(data.step)
    ) return undefined;
    return {
      version: 2,
      service: data.service as BriefService,
      answers: Object.fromEntries(Object.entries(data.answers as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
      step: Math.max(0, Math.min(Math.floor(data.step), 3)),
    };
  } catch {
    return undefined;
  }
}

export function briefStepIssue(step: number, service: BriefService, answers: Answers, locale: Locale): { key: string; message: string } | null {
  const ru = locale === "ru";
  for (const key of requiredKeysForStep(step, service)) {
    if (!answers[key]?.trim()) {
      return { key, message: ru ? "Заполните обязательные поля — они нужны для точного ответа." : "Complete the required fields so we can give an accurate answer." };
    }
  }

  if (step === 2) {
    for (const key of ["url", "existing"]) {
      if (answers[key]?.trim() && !isValidHttpUrl(answers[key])) {
        return { key, message: ru ? "Проверьте адрес сайта. Например: https://example.ru" : "Check the website address. For example: https://example.com" };
      }
    }
  }
  if (step === 3 && !isValidBriefContact(answers.contact ?? "")) {
    return { key: "contact", message: ru ? "Проверьте контакт: нужен телефон или e-mail." : "Check the contact: enter a phone number or email." };
  }
  if (step === 3 && answers.consent !== "yes") {
    return { key: "consent", message: ru ? "Подтвердите согласие на обработку данных, чтобы отправить бриф." : "Confirm data processing consent to send the brief." };
  }
  return null;
}

export function isValidBriefContact(value: string): boolean {
  const contact = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contact)) return true;
  if (!/^\+?[\d\s()-]+$/u.test(contact)) return false;
  const digits = contact.replace(/\D/gu, "");
  return digits.length >= 10 && digits.length <= 15;
}

function requiredKeysForStep(step: number, service: BriefService): string[] {
  if (step === 1) return ["company", "problem", "result"];
  if (step !== 2) return step === 3 ? ["name", "contact", "consent"] : [];
  const byService: Record<BriefService, string[]> = {
    seo: ["url", "priorities"],
    audit: ["url", "concern"],
    marketplaces: ["platform", "cards"],
    development: ["siteType", "goal"],
    ads: ["url", "regions"],
    custom: ["context"],
  };
  return byService[service];
}

function normalizeBriefUrls(step: number, service: BriefService, answers: Answers): Answers {
  if (step !== 2) return answers;
  const keys = service === "development" ? ["existing"] : ["url"];
  let next = answers;
  for (const key of keys) {
    const value = answers[key]?.trim();
    if (!value || /^[a-z][a-z\d+.-]*:\/\//iu.test(value)) continue;
    next = { ...next, [key]: `https://${value}` };
  }
  return next;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//iu.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    const url = new URL(candidate);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function focusBriefField(key: string) {
  window.requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>(`[data-question-key="${CSS.escape(key)}"] input, [data-question-key="${CSS.escape(key)}"] textarea, [data-question-key="${CSS.escape(key)}"] select`);
    if (!field) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    field.focus({ preventScroll: true });
    field.scrollIntoView({
      block: "center",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  });
}
