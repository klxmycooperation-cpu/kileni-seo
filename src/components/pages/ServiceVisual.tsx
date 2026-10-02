import type { CSSProperties } from "react";
import type { Locale } from "../../config/site";
import type { ServiceVisual as ServiceVisualContent } from "../../content/services";
import "../../../app/company-motion.css";

export function ServiceVisual({ visual, locale, items, outcome }: { visual: ServiceVisualContent; locale: Locale; items: string[]; outcome: string }) {
  const ru = locale === "ru";
  if (visual.kind === "audit-matrix") {
    const pages = ru
      ? [
          "Главная",
          "Услуги",
          "Каталог",
          "Карточки",
          "Блог",
          "Контакты",
        ]
      : [
          "Home",
          "Services",
          "Catalogue",
          "Product pages",
          "Blog",
          "Contacts",
        ];
    const checks = ru
      ? [
          ["Ответ сервера", "Страница открывается без ошибки"],
          ["Доступность поиску", "Поисковик может прочитать страницу"],
          ["Содержание", "Заголовки и описания не повторяются"],
          ["Мобильная версия", "Загрузка не мешает посетителю"],
        ]
      : [
          ["Server response", "The page opens without an error"],
          ["Search access", "Search engines can read the page"],
          ["Page content", "Titles and descriptions are not duplicated"],
          ["Mobile version", "Loading does not get in the visitor's way"],
        ];
    return (
      <aside className="svc-visual svc-visual-audit-matrix svc-audit-journey" aria-label={visual.summary}>
        <header className="svc-audit-journey__header">
          <span>{ru ? "Пример маршрута проверки" : "Example audit route"}</span>
          <strong>example.ru</strong>
          <small>{ru ? "Проверяем последовательно" : "Reviewed in sequence"}</small>
        </header>
        <div className="svc-audit-journey__body">
          <p className="svc-audit-journey__intro">
            {ru
              ? "Сначала находим страницы, затем проверяем каждую по четырём направлениям."
              : "We find the pages first, then review each one in four areas."}
          </p>
          <div className="svc-audit-journey__workspace">
            <section className="svc-audit-journey__map">
              <header><span>01</span><strong>{ru ? "Находим страницы" : "Find the pages"}</strong></header>
              <div className="svc-audit-journey__root"><i aria-hidden="true" /><span>example.ru</span></div>
              <ul className="svc-audit-journey__pages">
                {pages.map((page, index) => <li key={page}><span>{String(index + 1).padStart(2, "0")}</span><strong>{page}</strong></li>)}
              </ul>
            </section>
            <section className="svc-audit-journey__review">
              <header><span>02</span><strong>{ru ? "Проверяем каждую" : "Review each page"}</strong></header>
              <ol className="svc-audit-journey__checks">
                {checks.map(([title, description], index) => (
                  <li key={title} style={{ "--check-index": index } as CSSProperties}>
                    <span aria-hidden="true">{index + 1}</span>
                    <div><strong>{title}</strong><small>{description}</small></div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
        <footer className="svc-audit-journey__footer">
          <span>{ru ? "Что получите" : "What you receive"}</span>
          <strong>
            {ru
              ? "Для каждой найденной проблемы показываем адрес страницы, объясняем причину и описываем проверку после исправления."
              : "For every problem we show the affected page, explain the cause and describe how to verify the fix."}
          </strong>
        </footer>
      </aside>
    );
  }
  if (visual.kind === "search-listing") {
    const copy = ru
      ? {
          title: "Как работа с поиском меняет сайт",
          lead: "Каждый месяц сопоставляем спрос с сайтом и оставляем после себя понятные изменения.",
          steps: [
            ["Запросы клиентов", "Находим, что люди ищут и какие вопросы остаются без ответа."],
            ["Страницы сайта", "Улучшаем существующие страницы и добавляем нужные материалы."],
            ["Проверка изменений", "Сверяем видимость, обращения и задачи на следующий месяц."],
          ],
          note: "В отчёте фиксируем сделанное, изменения в показателях и следующий приоритет.",
        }
      : {
          title: "How search work changes the website",
          lead: "Each month we match demand to the website and leave behind clear, useful changes.",
          steps: [
            ["Customer questions", "We find what people are looking for and which questions the website does not answer."],
            ["Website pages", "We improve existing pages and add the materials people need."],
            ["Reviewing changes", "We compare visibility, enquiries and the work needed for the next month."],
          ],
          note: "The report records the completed work, changes in the metrics and the next priority.",
        };
    return (
      <aside className="svc-visual svc-visual-growth-map" aria-label={visual.summary}>
        <header>
          <span>{visual.label}</span>
          <h2>{copy.title}</h2>
          <p>{copy.lead}</p>
        </header>
        <ol aria-label={ru ? "Как устроена работа по SEO-продвижению" : "How SEO work is organised"}>
          {copy.steps.map(([title, description], index) => (
            <li key={title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{title}</strong><p>{description}</p></div>
            </li>
          ))}
        </ol>
        <footer>{copy.note}</footer>
      </aside>
    );
  }
  if (visual.kind === "build-system") {
    if (visual.variant === "website-process") {
      const steps = ru
        ? [["01", "Структура страниц", "Определяем путь посетителя и состав страниц"], ["02", "Ключевые экраны", "Прорабатываем основные экраны и состояния"], ["03", "Мобильная сборка и проверка", "Собираем мобильную версию, формы и аналитику"]]
        : [["01", "Page structure", "Map the visitor path and the required pages"], ["02", "Key screens", "Design the main screens and states"], ["03", "Mobile build and checks", "Build the responsive version, forms and analytics"]];
      return (
        <aside className="svc-visual svc-visual-build-system svc-build-process" aria-label={visual.summary}>
          <div className="svc-build-composition">
            <div className="svc-build-composition__topline"><span>{visual.label}</span></div>
            <div className="svc-build-process__workspace">
              <section className="svc-build-process__preview" aria-label={ru ? "Плоскость готового сайта" : "Working website preview"}>
                <span>{ru ? "Результат работы" : "Working result"}</span>
                <strong>{outcome}</strong>
                <div className="svc-build-process__preview-screen" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </section>
            <ol className="svc-visual-route svc-build-process__steps" aria-label={ru ? "Этапы создания сайта" : "Website creation steps"}>
              {steps.map(([number, title, description]) => <li key={number}><span>{number}</span><div><small>{title}</small><strong>{description}</strong></div><b aria-hidden="true">→</b></li>)}
            </ol>
            </div>
            <p>{ru ? "Состав фиксируем до начала работ" : "Scope is fixed before work starts"}</p>
          </div>
        </aside>
      );
    }
    if (visual.variant === "scope-definition") {
      const rows = ru
        ? [["Сейчас", items[0] ?? "Текущая ситуация"], ["Нужно получить", outcome], ["Первый этап", items[2] ?? "Состав первого этапа"], ["Как примем", "Проверяемый результат"]]
        : [["Current situation", items[0] ?? "Current context"], ["Required outcome", outcome], ["First-stage scope", items[2] ?? "Bounded first stage"], ["Acceptance criterion", "Verifiable result"]];
      return (
        <aside className="svc-visual svc-visual-build-system svc-scope-definition" aria-label={visual.summary}>
          <div className="svc-build-composition">
            <div className="svc-build-composition__topline"><span>{visual.label}</span></div>
            <div className="svc-scope-definition__intro">{ru ? "Сначала фиксируем, что известно и что должно измениться" : "First, make the context and the required change explicit"}</div>
            <div className="svc-scope-definition__decision-map" aria-hidden="true">
              <span className="svc-scope-definition__decision-node svc-scope-definition__decision-node--context">{ru ? "Что известно" : "What is known"}</span>
              <span className="svc-scope-definition__decision-node svc-scope-definition__decision-node--choice">{ru ? "Что меняем" : "What changes"}</span>
              <span className="svc-scope-definition__decision-node svc-scope-definition__decision-node--check">{ru ? "Как проверим" : "How we verify"}</span>
            </div>
            <dl className="svc-scope-definition__list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <p>{ru ? "Оценку согласуем после уточнения входных данных" : "The estimate follows once the inputs are clear"}</p>
          </div>
        </aside>
      );
    }
    return (
      <aside className="svc-visual svc-visual-build-system" aria-label={visual.summary}>
        <div className="svc-build-composition">
          <div className="svc-build-composition__topline"><span>{visual.label}</span></div>
          <div className="svc-build-composition__result"><span>{ru ? "Результат работы" : "Working result"}</span><strong>{outcome}</strong></div>
          <div className="svc-build-composition__deliverables">
            <span>{ru ? "Передадим после согласования" : "Handed over after approval"}</span>
            <ul>{items.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, "0")}</b><span>{item}</span></li>)}</ul>
          </div>
          <p>{ru ? "Состав фиксируем до начала работ" : "Scope is fixed before work starts"}</p>
        </div>
      </aside>
    );
  }
  return (
    <aside className={`svc-visual svc-visual-${visual.kind}`} aria-label={visual.summary}>
      <div className="svc-visual-heading">
        <span>{visual.label}</span>
        <b>{visual.summary}</b>
      </div>
      <div className="svc-visual-result">
        <span>{ru ? "Что передадим" : "What we deliver"}</span>
        <strong>{outcome}</strong>
      </div>
      <ul className="svc-visual-deliverables">
        {items.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}
      </ul>
      <p className="svc-visual-note">{ru ? "Состав фиксируется до начала работы" : "Scope is fixed before work starts"}</p>
    </aside>
  );
}
