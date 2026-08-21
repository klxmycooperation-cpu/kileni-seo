import "../../../app/brief-refinement.css";

import Link from "next/link";
import type { Locale } from "../../config/site";
import { BriefWizard } from "../forms/BriefWizard";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";

export function BriefPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const downloads = ["seo", "audit", "marketplaces", "development"];

  return (
    <PublicShell locale={locale}>
      <div className="brief-refinement">
        <header className="brief-page-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Бриф" : "Brief" }]} />
          <div className="shell brief-hero-grid">
            <div>
              <p className="brief-kicker">{ru ? "Предложение под вашу задачу" : "A proposal shaped around your task"}</p>
              <h1>{ru ? "Расскажите о задаче — соберём предложение без лишних работ" : "Describe the task — get a proposal without unnecessary work"}</h1>
              <p className="brief-effort">{ru ? "5–7 минут · технические знания не нужны · можно отвечать «не уверен»" : "5–7 minutes · No technical knowledge is required · “Not sure” is a valid answer"}</p>
              <ul className="brief-hero-outcomes" aria-label={ru ? "Что даст бриф" : "What the brief provides"}>
                {(ru
                  ? ["Состав работ", "Срок по этапам", "Стоимость и границы"]
                  : ["Scope of work", "Timing by stage", "Price and boundaries"]
                ).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="brief-hero-note">
              <strong>{ru ? "За что вы будете платить" : "What the estimate pays for"}</strong>
              <dl className="brief-offer-preview">
                {(ru
                  ? [["01", "Что делаем"], ["02", "В какой последовательности"], ["03", "Сколько стоит"], ["04", "Что потребуется от вас"]]
                  : [["01", "What we will do"], ["02", "In what order"], ["03", "What it will cost"], ["04", "What we need from you"]]
                ).map(([number, label]) => <div key={number}><dt>{number}</dt><dd>{label}</dd></div>)}
              </dl>
              <Link className="brief-download-link" href="#downloads">{ru ? "Заполнить в файле" : "Complete it in a file"}<span aria-hidden="true">↓</span></Link>
            </div>
          </div>
        </header>

        <section className="brief-workspace" aria-label={ru ? "Интерактивный бриф" : "Interactive brief"}>
          <div className="shell brief-shell">
            <BriefWizard locale={locale} />
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
            <div className="brief-download-grid">
              {downloads.map((type, index) => (
                <article key={type}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{downloadTitle(type, ru)}</h3>
                  <div>
                    <a download href={`/downloads/generated/${locale}-${type}-brief.docx`}>DOCX ↓</a>
                    <a download href={`/downloads/generated/${locale}-${type}-brief.pdf`}>PDF ↓</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

function downloadTitle(type: string, ru: boolean) {
  if (type === "seo") return ru ? "Продвижение" : "SEO growth";
  if (type === "audit") return ru ? "SEO-аудит" : "SEO audit";
  if (type === "marketplaces") return "Wildberries & Ozon";
  return ru ? "Разработка" : "Development";
}
