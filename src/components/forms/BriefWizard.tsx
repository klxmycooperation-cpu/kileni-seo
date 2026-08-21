"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { priceLabel } from "../../config/price-labels";
import type { Locale } from "../../config/site";
import { briefAnswerLabel, briefServices, commonBriefQuestions, qLabel, serviceQuestions, type BriefService } from "../../content/brief";
import { readAuditLeadHandoff } from "../../lib/audit/lead-handoff";
import { useCsrf } from "./useCsrf";
import { TurnstileField } from "./TurnstileField";

type Answers = Record<string, string>;
type Guide = { price: string; included: string[]; prepare: string[] };

export function BriefWizard({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const { token, refresh } = useCsrf();
  const [step, setStep] = useState(0);
  const [service, setService] = useState<BriefService>("seo");
  const [answers, setAnswers] = useState<Answers>({});
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileReset, setTurnstileReset] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);

  const routeLabels = ru
    ? ["Направление", "Цель", "Что уже есть", "Контакт", "Готово"]
    : ["Direction", "Goal", "What exists", "Contact", "Done"];

  useEffect(() => {
    let nextService: BriefService = "seo";
    let nextAnswers: Answers = {};
    let nextStep = 0;
    const saved = localStorage.getItem("kileni-brief");
    if (saved) {
      try {
        const data = JSON.parse(saved) as { service?: unknown; answers?: unknown; step?: unknown };
        if (
          typeof data.service === "string"
          && briefServices.some((item) => item.id === data.service)
          && data.answers
          && typeof data.answers === "object"
          && !Array.isArray(data.answers)
          && typeof data.step === "number"
          && Number.isFinite(data.step)
        ) {
          nextService = data.service as BriefService;
          nextAnswers = data.answers as Answers;
          nextStep = Math.max(0, Math.min(Math.floor(data.step), 3));
        }
      } catch {}
    }
    const query = new URLSearchParams(window.location.search);
    const sourceService = query.get("service");
    const directService = sourceService ? briefServiceForRoute(sourceService) : undefined;
    if (directService) {
      nextService = directService;
      nextAnswers = { ...nextAnswers, sourceService: sourceService ?? "" };
    }
    const selectedTier = query.get("tier");
    if (selectedTier) nextAnswers = { ...nextAnswers, selectedTier };
    const selectedPlatform = query.get("platform");
    if (selectedPlatform && ["wildberries", "ozon", "yandex-market", "megamarket", "multiple"].includes(selectedPlatform)) {
      nextService = "marketplaces";
      nextAnswers = { ...nextAnswers, platform: selectedPlatform };
    }
    const auditToken = query.get("audit");
    const handoff = auditToken ? readAuditLeadHandoff(window.sessionStorage, auditToken) : null;
    if (handoff) {
      const offer = query.get("offer");
      if (offer === "audit" || offer === "audit-fix") nextService = "audit";
      if (offer === "promotion") nextService = "seo";
      nextAnswers = {
        ...nextAnswers,
        sourceOffer: offer ?? "",
        name: nextAnswers.name || handoff.name,
        contact: nextAnswers.contact || handoff.contact,
        url: nextAnswers.url || `https://${handoff.domain}`,
      };
    }
    setService(nextService);
    setAnswers(nextAnswers);
    setStep(nextStep);
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (draftReady) localStorage.setItem("kileni-brief", JSON.stringify({ service, answers, step }));
  }, [draftReady, service, answers, step]);

  useEffect(() => {
    if (!draftReady || previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus();
  }, [draftReady, step]);

  const questions = useMemo(
    () => step === 1 ? commonBriefQuestions : serviceQuestions[service],
    [service, step],
  );
  const guide = useMemo(() => briefGuide(service, locale), [service, locale]);
  const essentialKeys = new Set(["company", "problem", "result"]);
  const primaryQuestions = step === 1
    ? questions.filter((question) => essentialKeys.has(question.key))
    : questions.slice(0, 2);
  const optionalQuestions = questions.filter((question) => !primaryQuestions.includes(question));
  const update = (key: string, value: string) => setAnswers((current) => ({ ...current, [key]: value }));

  function pickFiles(list: FileList | null) {
    const next = [...files, ...Array.from(list ?? [])].slice(0, 5);
    if (next.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024) {
      setStatus(ru ? "Файлы вместе не должны превышать 10 МБ." : "Files must not exceed 10 MB in total.");
      return;
    }
    setFiles(next);
    setStatus("");
  }

  async function submit() {
    setStatus(ru ? "Сохраняем бриф…" : "Saving brief…");
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
      localStorage.removeItem("kileni-brief");
      setStep(4);
    } else {
      const data = await response.json().catch(() => ({})) as { message?: string };
      setStatus(data.message ?? (ru ? "Не удалось сохранить бриф." : "Could not save the brief."));
      setTurnstileReset((value) => value + 1);
    }
  }

  const currentRouteStep = Math.min(step, 4);
  const heading = step === 0
    ? (ru ? "С чего начнём?" : "Where should we start?")
    : step === 1
      ? (ru ? "Контекст задачи" : "Project context")
      : step === 2
        ? (ru ? "Детали по направлению" : "Service details")
        : step === 3
          ? (ru ? "Итог перед отправкой" : "Summary before sending")
          : (ru ? "Спасибо. Бриф уже в работе." : "Thank you. The brief is in our queue.");

  return (
    <div className="brief-wizard">
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
        <ServiceGuide locale={locale} service={service} guide={guide} />
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
                {briefServices.map((item, index) => (
                  <button
                    type="button"
                    className={service === item.id ? "selected" : ""}
                    aria-pressed={service === item.id}
                    key={item.id}
                    onClick={() => setService(item.id)}
                  >
                    <span className="brief-choice-number">{String(index + 1).padStart(2, "0")}</span>
                    <b>{ru ? item.ru : item.en}</b>
                    <span className="brief-choice-copy">{ru ? item.textRu : item.textEn}</span>
                    <strong className="brief-choice-price">{briefGuide(item.id, locale).price}</strong>
                  </button>
                ))}
              </div>
            </>
          )}

          {(step === 1 || step === 2) && (
            <>
              <p className="brief-step-intro">{ru ? "Сначала — вопросы, которые влияют на состав и цену. Всё остальное можно раскрыть и дополнить при желании." : "Start with the answers that affect scope and price. Open the optional section only when it is useful."}</p>
              <QuestionFields questions={primaryQuestions} locale={locale} answers={answers} update={update} />
              {optionalQuestions.length > 0 && (
                <details className="brief-optional">
                  <summary>{ru ? `Дополнительные вопросы · ${optionalQuestions.length}` : `Optional questions · ${optionalQuestions.length}`}</summary>
                  <p>{ru ? "Помогут подготовить предложение точнее, но не обязательны для отправки." : "These make the proposal more precise but are not required to send the brief."}</p>
                  <QuestionFields questions={optionalQuestions} locale={locale} answers={answers} update={update} startIndex={primaryQuestions.length} />
                </details>
              )}
            </>
          )}

          {step === 3 && (
            <div className="brief-review">
              <div className="brief-review-head">
                <p>{ru ? "Вы выбрали" : "Selected service"}</p>
                <strong>{serviceLabel(service, locale)}</strong>
                <span>{guide.price}</span>
              </div>
              <dl>
                {Object.entries(answers)
                  .filter(([key, value]) => value && !["name", "contact", "consent"].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{briefAnswerLabel(service, key, locale)}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
              <section className="brief-response-promise" aria-labelledby="brief-response-title">
                <h3 id="brief-response-title">{ru ? "Что вы получите в ответ" : "What you receive in response"}</h3>
                <ul>
                  <li>{ru ? "Рекомендуемый состав работ без лишних пунктов" : "A recommended scope without unnecessary items"}</li>
                  <li>{ru ? "Срок и последовательность этапов" : "Timing and sequence of stages"}</li>
                  <li>{ru ? "Стоимость и границы, за которые доплата не появится внезапно" : "Price and boundaries, so additional costs do not appear unexpectedly"}</li>
                </ul>
              </section>
              <div className="brief-fields brief-contact-fields">
                <label data-question-number="01">
                  <span>{ru ? "Имя" : "Name"}</span>
                  <input required value={answers.name ?? ""} onChange={(event) => update("name", event.target.value)} />
                </label>
                <label data-question-number="02">
                  <span>{ru ? "E-mail для ответа" : "Email for the reply"}</span>
                  <input type="email" inputMode="email" autoComplete="email" required value={answers.contact ?? ""} onChange={(event) => update("contact", event.target.value)} />
                </label>
                <label className="check-field">
                  <input type="checkbox" checked={answers.consent === "yes"} onChange={(event) => update("consent", event.target.checked ? "yes" : "")} />
                  <span>{ru ? "Согласен на обработку данных и получение ответа" : "I agree to data processing and receiving a response"}</span>
                </label>
                <label className="file-drop">
                  <span>{ru ? "Приложить до 5 файлов · PDF, DOCX, XLSX, PNG, JPG · всего до 10 МБ" : "Attach up to 5 files · PDF, DOCX, XLSX, PNG, JPG · 10 MB total"}</span>
                  <input type="file" multiple accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={(event) => pickFiles(event.target.files)} />
                </label>
                {files.length > 0 && (
                  <ul className="brief-file-list">
                    {files.map((file) => <li key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name} · {Math.ceil(file.size / 1024)} KB</li>)}
                  </ul>
                )}
                <TurnstileField onToken={setTurnstileToken} resetKey={turnstileReset} />
              </div>
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
              <button type="button" className="button button-primary" onClick={() => setStep((value) => value + 1)}>
                {ru ? "Далее" : "Next"}<span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary"
                disabled={!answers.name || !answers.contact || answers.consent !== "yes" || !token || !turnstileToken}
                onClick={() => void submit()}
              >
                {ru ? "Получить расчёт" : "Get the estimate"}<span aria-hidden="true">↗</span>
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
}: {
  questions: BriefQuestion[];
  locale: Locale;
  answers: Answers;
  update: (key: string, value: string) => void;
  startIndex?: number;
}) {
  const ru = locale === "ru";

  return (
    <div className="brief-fields">
      {questions.map((question, index) => (
        <label key={question.key} data-question-number={String(index + startIndex + 1).padStart(2, "0")}>
          <span>{qLabel(question, locale)}</span>
          {question.type === "textarea" ? (
            <textarea rows={4} placeholder={ru ? "Можно коротко и своими словами" : "A short plain-language answer is enough"} value={answers[question.key] ?? ""} onChange={(event) => update(question.key, event.target.value)} />
          ) : question.type === "select" ? (
            <select value={answers[question.key] ?? ""} onChange={(event) => update(question.key, event.target.value)}>
              <option value="">{ru ? "Не уверен — помогите выбрать" : "Not sure — help me choose"}</option>
              {question.options?.map((option) => (
                <option key={option.value} value={option.value}>{ru ? option.ru : option.en}</option>
              ))}
            </select>
          ) : (
            <input type={question.type === "url" ? "url" : "text"} value={answers[question.key] ?? ""} onChange={(event) => update(question.key, event.target.value)} />
          )}
        </label>
      ))}
    </div>
  );
}

function ServiceGuide({ locale, service, guide }: { locale: Locale; service: BriefService; guide: Guide }) {
  const ru = locale === "ru";

  return (
    <section className="brief-service-guide" aria-live="polite" aria-label={ru ? "Ориентир по выбранной услуге" : "Selected service guide"}>
      <p>{ru ? "Что входит и сколько стоит" : "What is included and what it costs"}</p>
      <h2>{serviceLabel(service, locale)}</h2>
      <strong>{guide.price}</strong>
      <div>
        <h3>{ru ? "За что вы платите" : "What you are paying for"}</h3>
        <ul>{guide.included.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div>
        <h3>{ru ? "Что подготовить" : "Prepare"}</h3>
        <ul>{guide.prepare.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <small>{ru ? "Точный состав и цена — после ответов. Оплата на странице не требуется." : "Exact scope and price follow the brief. No payment is taken on this page."}</small>
    </section>
  );
}

function serviceLabel(service: BriefService, locale: Locale) {
  const item = briefServices.find((candidate) => candidate.id === service);
  return locale === "ru" ? item?.ru : item?.en;
}

function briefServiceForRoute(route: string): BriefService | undefined {
  const map: Record<string, BriefService> = {
    "seo-audit": "audit",
    "seo-promotion": "seo",
    marketplaces: "marketplaces",
    "web-development": "development",
    "yandex-ads": "ads",
    "content-materials": "custom",
    "custom-task": "custom",
  };
  return map[route];
}

function briefGuide(service: BriefService, locale: Locale): Guide {
  const ru = locale === "ru";
  const definitions: Record<BriefService, { priceKey: string; includedRu: string[]; includedEn: string[]; prepareRu: string[]; prepareEn: string[] }> = {
    seo: {
      priceKey: "seo-base",
      includedRu: ["Приоритетные страницы", "Технические и контентные задачи", "Проверка сделанных изменений"],
      includedEn: ["Priority pages", "Technical and content tasks", "Verification of completed changes"],
      prepareRu: ["Адрес сайта", "Основные услуги и регионы", "Что уже пробовали"],
      prepareEn: ["Website URL", "Priority services and regions", "What has already been tried"],
    },
    audit: {
      priceKey: "audit-express",
      includedRu: ["Список проблем по приоритету", "Примеры страниц и доказательства", "Задание на исправление"],
      includedEn: ["Prioritised issue list", "Page examples and evidence", "Implementation specification"],
      prepareRu: ["Адрес сайта", "Что беспокоит", "Что недавно изменилось"],
      prepareEn: ["Website URL", "What concerns you", "What changed recently"],
    },
    marketplaces: {
      priceKey: "mp-optimization",
      includedRu: ["Поисковые запросы", "Название, описание и свойства", "Материалы для публикации"],
      includedEn: ["Search queries", "Title, description and attributes", "Ready-to-publish materials"],
      prepareRu: ["Ссылки или артикулы", "Исходные фото", "Главные преимущества товара"],
      prepareEn: ["Links or SKUs", "Source photos", "Main product advantages"],
    },
    development: {
      priceKey: "dev-landing",
      includedRu: ["Структура и прототип", "Дизайн ключевых экранов", "Адаптивная разработка и запуск"],
      includedEn: ["Structure and prototype", "Key-screen design", "Responsive development and launch"],
      prepareRu: ["Цель сайта", "Услуги или товары", "Примеры и готовые материалы"],
      prepareEn: ["Website goal", "Services or products", "References and available materials"],
    },
    ads: {
      priceKey: "ads-setup",
      includedRu: ["Структура кампаний", "Объявления и запросы", "Настроенные цели"],
      includedEn: ["Campaign structure", "Ads and queries", "Configured goals"],
      prepareRu: ["Ссылка на сайт", "Приоритетная услуга и регион", "Допустимый рекламный бюджет"],
      prepareEn: ["Website URL", "Priority service and region", "Available media budget"],
    },
    custom: {
      priceKey: "individual",
      includedRu: ["Разбор задачи", "Предложенный состав", "Отдельная оценка этапов"],
      includedEn: ["Task review", "Recommended scope", "Separate estimate by stage"],
      prepareRu: ["Желаемый результат", "Ограничения", "Ссылки и примеры"],
      prepareEn: ["Desired outcome", "Constraints", "Links and examples"],
    },
  };
  const definition = definitions[service];
  return {
    price: priceLabel(definition.priceKey, locale).current,
    included: ru ? definition.includedRu : definition.includedEn,
    prepare: ru ? definition.prepareRu : definition.prepareEn,
  };
}
