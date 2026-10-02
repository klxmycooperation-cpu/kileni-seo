import "../../../app/brief-refinement.css";

import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "../../config/site";
import { briefServices } from "../../content/brief";
import { BriefWizard } from "../forms/BriefWizard";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { CanvasText } from "../ui/canvas-text";

export function BriefPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const downloads = briefServices;

  return (
    <PublicShell locale={locale}>
      <div className="brief-refinement">
        <header className="brief-page-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Бриф" : "Brief" }]} />
          <div className="shell brief-hero-grid">
            <div>
              <p className="brief-kicker">{ru ? "Предложение под вашу задачу" : "A proposal shaped around your task"}</p>
              <h1><CanvasText text={ru ? "Расскажите о задаче\nСоберём предложение" : "Tell us about the task\nWe will prepare a proposal"} lineGap={7} animationDuration={10}/></h1>
              <p className="brief-effort">{ru ? "Обычно это занимает 5–7 минут. Технические знания не нужны, а на сложный вопрос можно ответить «Не уверен»." : "It usually takes 5–7 minutes. No technical knowledge is required, and “Not sure” is a valid answer."}</p>
              <ul className="brief-hero-outcomes" aria-label={ru ? "Что даст бриф" : "What the brief provides"}>
                {(ru
                  ? ["Состав работ", "Срок по этапам", "Стоимость и границы", "Что понадобится от вас", "Следующие шаги"]
                  : ["Scope of work", "Timing by stage", "Price and boundaries", "What we need from you", "Next steps"]
                ).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="brief-hero-note">
              <strong>{ru ? "После брифа вы получите" : "After the brief, you will receive"}</strong>
              <p>{ru ? "Предложение, в котором можно сразу проверить состав, порядок работы, цену и необходимые материалы." : "A proposal that clearly states the scope, work order, price and required materials."}</p>
              <dl className="brief-offer-preview">
                {(ru
                  ? [["01", "Перечень работ"], ["02", "Порядок и сроки"], ["03", "Стоимость и ограничения"], ["04", "Что понадобится от вас"]]
                  : [["01", "Scope of work"], ["02", "Order and timing"], ["03", "Price and boundaries"], ["04", "What we need from you"]]
                ).map(([number, label]) => <div key={number}><dt>{number}</dt><dd>{label}</dd></div>)}
              </dl>
              <Link className="brief-download-link" href="#downloads">{ru ? "Заполнить в файле" : "Complete it in a file"}<span aria-hidden="true">↓</span></Link>
            </div>
          </div>
        </header>

        <section className="brief-workspace" id="brief" aria-label={ru ? "Интерактивный бриф" : "Interactive brief"}>
          <div className="shell brief-shell">
            <Suspense fallback={<div className="brief-loading" aria-live="polite">{ru ? "Загружаем бриф…" : "Loading brief…"}</div>}>
              <BriefWizard locale={locale} />
            </Suspense>
          </div>
        </section>

        <section className="brief-downloads" id="downloads">
          <div className="shell">
            <div className="brief-download-heading">
              <p className="brief-kicker">{ru ? "Другой формат" : "Another format"}</p>
              <div>
                <h2>{ru ? "Скачать и заполнить офлайн" : "Download and complete offline"}</h2>
                <p>{ru ? "Те же вопросы в DOCX или PDF — если удобнее обсудить их с командой." : "The same questions in DOCX or PDF, ready to share with your team."}</p>
              </div>
            </div>
            <details className="brief-download-selector">
              <summary>
                <span>{ru ? "Выбрать направление и формат" : "Choose a direction and format"}</span>
                <small>DOCX · PDF</small>
              </summary>
              <div className="brief-download-options">
                {downloads.map((service, index) => (
                  <div className="brief-download-option" key={service.id}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{ru ? service.ru : service.en}</strong>
                    <div>
                      <a download href={`/downloads/generated/${locale}-${service.id}-brief.docx`}>DOCX ↓</a>
                      <a download href={`/downloads/generated/${locale}-${service.id}-brief.pdf`}>PDF ↓</a>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
