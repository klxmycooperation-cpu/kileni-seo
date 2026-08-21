import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import type { Locale } from "../../config/site";
import { legalDocumentsAreComplete, legalOperatorSummary, localizedPath, siteConfig } from "../../config/site";
import { LeadForm } from "../forms/LeadForm";
import { PublicContactLinks } from "../contact/PublicContactLinks";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";

export function AboutPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const actions = ru
    ? ["Проверяем", "Проектируем", "Исправляем", "Создаём", "Публикуем", "Измеряем", "Перепроверяем"]
    : ["Audit", "Design", "Fix", "Create", "Publish", "Measure", "Verify again"];
  const projectStart = ru
    ? ["Короткая заявка", "Бриф", "Первичный разбор", "Согласование состава", "Цена", "Срок", "Начало работ"]
    : ["Short request", "Brief", "Initial review", "Scope agreement", "Price", "Timing", "Work begins"];
  const deliverables = ru
    ? ["Отчёты", "Таблицы", "Тексты", "Изображения", "Технические задания", "Исходники", "Журнал изменений", "Доступы", "Повторная проверка"]
    : ["Reports", "Tables", "Copy", "Images", "Technical specifications", "Source files", "Change log", "Access details", "Repeat check"];
  const guarantees = ru
    ? ["Согласованный объём", "Соблюдение границ", "Фиксация изменений", "Сохранение материалов", "Повторная проверка", "Прозрачность"]
    : ["Agreed scope", "Clear boundaries", "Recorded changes", "Preserved materials", "Repeat check", "Transparency"];
  const noGuarantees = ru
    ? ["Топ-1", "Заданное число продаж", "Конкретное число клиентов", "Мгновенная индексация", "Результат, зависящий от цены и отдела продаж"]
    : ["A number-one ranking", "A fixed number of sales", "A fixed number of customers", "Instant indexing", "Outcomes controlled by pricing or the sales team"];
  const acceptance = ru
    ? [
      ["Состав", "Переданы все материалы, перечисленные в согласованном объёме."],
      ["Работоспособность", "Изменённые страницы и сценарии проверены на согласованных устройствах."],
      ["Доказательства", "Есть журнал изменений, ссылки, файлы или результаты повторной проверки."],
      ["Ограничения", "Оставшиеся риски и то, что не входило в работу, отмечены отдельно."],
    ]
    : [
      ["Scope", "Every deliverable listed in the agreed scope has been handed over."],
      ["Function", "Changed pages and journeys have been checked on the agreed devices."],
      ["Evidence", "A change log, links, files or repeat-check results are included."],
      ["Limitations", "Remaining risks and excluded work are stated separately."],
    ];
  const roles = ru
    ? ["SEO-аналитика", "Техническая разработка", "UX и дизайн", "Контент", "Маркетплейсы", "Реклама", "Управление проектом", "Контроль качества"]
    : ["SEO analysis", "Technical development", "UX and design", "Content", "Marketplaces", "Advertising", "Project management", "Quality assurance"];

  return (
    <PublicShell locale={locale}>
      <div className="about-10">
        <header className="about-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "О компании" : "About" }]} />
          <div className="shell about-hero-grid">
            <div>
              <p className="svc-kicker">KILENI · SEO</p>
              <h1>{ru ? "SEO, разработка, аналитика, контент и маркетплейсы — в одной рабочей системе." : "SEO, development, analytics, content and marketplaces — one working system."}</h1>
            </div>
            <p>{ru ? "Нас объединяет простой принцип: найти причину, объяснить её без лишних терминов, выполнить согласованные изменения и проверить результат ещё раз." : "Our shared principle is simple: find the cause, explain it plainly, deliver the agreed changes and verify the result again."}</p>
          </div>
        </header>

        <section className="about-actions" aria-labelledby="about-actions-title">
          <div className="shell">
            <div className="about-section-heading">
              <p className="svc-kicker">{ru ? "Что мы делаем" : "What we do"}</p>
              <h2 id="about-actions-title">{ru ? "От проверки до повторного контроля" : "From the first audit to the repeat check"}</h2>
            </div>
            <ol className="about-action-list">
              {actions.map((action, index) => <li key={action}><span>{String(index + 1).padStart(2, "0")}</span><strong>{action}</strong></li>)}
            </ol>
          </div>
        </section>

        <section className="about-process" aria-labelledby="about-process-title">
          <div className="shell">
            <div className="about-section-heading">
              <p className="svc-kicker">{ru ? "Как начинается проект" : "How a project starts"}</p>
              <h2 id="about-process-title">{ru ? "Сначала договариваемся о результате, составе, цене и сроке" : "First agree the outcome, scope, price and timing"}</h2>
            </div>
            <ol className="about-start-route">
              {projectStart.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong></li>)}
            </ol>
          </div>
        </section>

        <section className="about-roles" aria-labelledby="about-roles-title">
          <div className="shell about-roles-grid">
            <div>
              <p className="svc-kicker">{ru ? "Компетенции внутри работы" : "Capabilities within the work"}</p>
              <h2 id="about-roles-title">{ru ? "Подключаем нужные роли, а не продаём лишний пакет" : "Bring in the right roles, not an oversized package"}</h2>
              <p>{ru ? "Состав зависит от задачи. Один проект может требовать только аналитики, другой — совместной работы дизайна, разработки и контента." : "The team shape follows the task. One project may need analysis only; another may combine design, development and content."}</p>
            </div>
            <ul>{roles.map((role, index) => <li key={role}><span>{String(index + 1).padStart(2, "0")}</span>{role}</li>)}</ul>
          </div>
        </section>

        <section className="about-deliverables" aria-labelledby="about-deliverables-title">
          <div className="shell about-deliverables-grid">
            <div><p className="svc-kicker">{ru ? "Что получает клиент" : "What the client receives"}</p><h2 id="about-deliverables-title">{ru ? "Материалы, которые можно открыть, проверить и передать дальше" : "Material you can open, verify and hand over"}</h2></div>
            <ul>{deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </section>

        <section className="about-boundaries" aria-labelledby="about-boundaries-title">
          <div className="shell">
            <div className="about-section-heading">
              <p className="svc-kicker">{ru ? "Ответственность" : "Accountability"}</p>
              <h2 id="about-boundaries-title">{ru ? "Что гарантируем — и чего обещать не будем" : "What we guarantee — and what we will not promise"}</h2>
            </div>
            <div className="about-boundary-grid">
              <article><h3>{ru ? "Гарантируем" : "We guarantee"}</h3><ul>{guarantees.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>{ru ? "Не гарантируем" : "We do not guarantee"}</h3><ul>{noGuarantees.map((item) => <li key={item}>{item}</li>)}</ul></article>
            </div>
          </div>
        </section>

        <section className="about-acceptance" aria-labelledby="about-acceptance-title">
          <div className="shell">
            <div className="about-section-heading">
              <p className="svc-kicker">{ru ? "Как принимается работа" : "How work is accepted"}</p>
              <h2 id="about-acceptance-title">{ru ? "Четыре критерия вместо субъективного «нравится»" : "Four criteria instead of a subjective approval"}</h2>
            </div>
            <ol className="about-acceptance-grid">{acceptance.map(([title, text], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
          </div>
        </section>

        <section className="about-next">
          <div className="shell about-next-grid">
            <div><p className="svc-kicker">{ru ? "Нестандартная задача" : "A non-standard task"}</p><h2>{ru ? "Не нашли подходящую услугу? Изучим задачу и предложим решение." : "Cannot find the right service? We will review the task and propose a solution."}</h2></div>
            <div className="about-next-actions">
              <Link className="button button-primary" href={localizedPath(locale, "brief")}>{ru ? "Заполнить короткий бриф" : "Complete the short brief"}<span aria-hidden="true">↗</span></Link>
              <PublicContactLinks locale={locale} variant="compact" primaryOnly />
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

export function ContactsPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <PublicShell locale={locale}>
      <div className="page-dark-top">
        <Breadcrumbs locale={locale} items={[{ label: ru ? "Контакты" : "Contact" }]} />
        <section className="page-hero shell">
          <p className="eyebrow light">{ru ? "Контакты" : "Contact"}</p>
          <h1>{ru ? "Расскажите, что нужно сделать" : "Tell us what needs to be done"}</h1>
          <p>{ru ? "Позвоните или напишите в удобный мессенджер. Для подробной задачи оставьте короткую заявку." : "Call or use your preferred messenger. For a detailed task, send a short request."}</p>
        </section>
      </div>
      <section className="section">
        <div className="shell contact-grid">
          <PublicContactLinks locale={locale} variant="cards" />
          <LeadForm locale={locale} service="contact" />
        </div>
      </section>
    </PublicShell>
  );
}

export function LegalPage({ locale, kind }: { locale: Locale; kind: "privacy" | "consent" }) {
  const ru = locale === "ru";
  const privacy = kind === "privacy";
  const legal = siteConfig.legal;
  const operator = legalOperatorSummary(locale);

  if (!operator || !legalDocumentsAreComplete()) {
    return (
      <PublicShell locale={locale}>
        <div className="page-dark-top compact-top">
          <Breadcrumbs locale={locale} items={[{ label: privacy ? (ru ? "Политика обработки данных" : "Privacy policy") : (ru ? "Согласие на обработку данных" : "Data processing consent") }]}/>
          <section className="page-hero shell">
            <h1>{ru ? "Юридический документ не опубликован" : "Legal document is not published"}</h1>
            <p>{ru ? "Публичные формы должны оставаться отключёнными до заполнения и проверки данных оператора." : "Public forms must remain disabled until the operator details are complete and reviewed."}</p>
          </section>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell locale={locale}>
      <div className="page-dark-top compact-top">
        <Breadcrumbs locale={locale} items={[{ label: privacy ? (ru ? "Политика обработки данных" : "Privacy policy") : (ru ? "Согласие на обработку данных" : "Data processing consent") }]}/>
        <section className="page-hero shell">
          <p className="eyebrow light">{ru ? "Редакция" : "Version"} {legal.version}</p>
          <h1>{privacy ? (ru ? "Политика обработки персональных данных" : "Personal data processing policy") : (ru ? "Согласие на обработку персональных данных" : "Personal data processing consent")}</h1>
        </section>
      </div>
      <article className="section legal-copy shell">
        <h2>{ru ? "1. Оператор и область действия" : "1. Operator and scope"}</h2>
        <p>{ru ? `Оператор: ${operator}. Политика применяется к обращениям, бесплатным аудитам, калькулятору, онлайн-брифу и вложениям на сайте KILENI.` : `Operator: ${operator}. This policy covers requests, free audits, calculator submissions, online briefs and attachments on the KILENI website.`}</p>
        <h2>{ru ? "2. Какие данные обрабатываются" : "2. Data processed"}</h2>
        <p>{ru ? "Имя, выбранный контакт, адрес сайта или проекта, ответы брифа, загруженные пользователем файлы, источник и UTM-параметры, версия согласия, дата и время, а также хеш IP-адреса для защиты от злоупотреблений." : "Name, selected contact, website or project address, brief answers, uploaded files, source and UTM parameters, consent version, timestamp and a hashed IP address for abuse prevention."}</p>
        <h2>{ru ? "3. Цели и действия" : "3. Purposes and operations"}</h2>
        <p>{ru ? "Данные используются для ответа на обращение, подготовки оценки, выполнения проверки, защиты форм, ведения истории проекта и исполнения согласованных работ. Автоматическое решение о выдаче кредита, трудоустройстве или других юридически значимых последствиях не принимается." : "Data is used to answer requests, prepare estimates, run checks, protect forms, retain project history and deliver agreed work. No automated legally significant decisions are made."}</p>
        <h2>{ru ? "4. Хранение и безопасность" : "4. Retention and security"}</h2>
        <p>{ru ? "Публичный результат аудита хранится по криптографически случайной ссылке не менее 90 дней в пределах настроенного срока и не содержит контакта. Вложения хранятся вне публичной папки. Доступ администратора ограничен сессией." : "Public audit results use a cryptographically random link, are retained for the configured period of at least 90 days and contain no contact details. Attachments are stored outside public assets. Administrator access is session-protected."}</p>
        <h2>{ru ? "5. Согласие и отзыв" : "5. Consent and withdrawal"}</h2>
        <p>{privacy ? (ru ? "Отправляя форму с отмеченным чекбоксом, пользователь подтверждает согласие с актуальной версией. Отзыв направляется оператору по указанному юридическому контакту." : "Submitting a form with the consent checkbox confirms agreement to the current version. Withdrawal should be sent to the listed legal contact.") : (ru ? "Я добровольно даю согласие на обработку перечисленных данных для получения ответа, оценки и выполнения запрошенного сценария. Я подтверждаю право передать сведения и понимаю возможность отозвать согласие." : "I voluntarily consent to processing the listed data to receive a response, estimate and requested service. I confirm my right to provide the data and understand that consent may be withdrawn.")}</p>
        <p><a href={`mailto:${legal.email}`}>{legal.email}</a></p>
      </article>
    </PublicShell>
  );
}
