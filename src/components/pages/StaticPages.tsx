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
    ? [
      ["Резюме решения", "Причины, выводы и порядок действий без лишнего текста."],
      ["Рабочие материалы", "Таблицы, тексты, изображения, ТЗ и исходники по согласованному составу."],
      ["Журнал изменений", "Что именно изменено, где это находится и как проверить."],
      ["Передача доступа", "Файлы и доступы собраны так, чтобы работу можно было продолжить внутри команды."],
      ["Повторная проверка", "Финальный контроль по тем же критериям, с которых начиналась работа."],
    ]
    : [
      ["Decision summary", "Causes, conclusions and an action order without filler."],
      ["Working material", "Tables, copy, images, specifications and source files within the agreed scope."],
      ["Change log", "What changed, where it lives and how to verify it."],
      ["Access handover", "Files and access details organised for the client team to continue the work."],
      ["Repeat check", "A final check against the same criteria used at the start."],
    ];
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
            <div><p className="svc-kicker">{ru ? "Что получает клиент" : "What the client receives"}</p><h2 id="about-deliverables-title">{ru ? "Не россыпь файлов, а понятная передача результата" : "A structured handover, not a pile of files"}</h2></div>
            <ol className="about-deliverable-flow">{deliverables.map(([title, text], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol>
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

  if (!privacy) {
    return (
      <PublicShell locale={locale}>
        <div className="page-dark-top compact-top">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Согласие на обработку данных" : "Data processing consent" }]}/>
          <section className="page-hero shell">
            <p className="eyebrow light">{ru ? "Редакция" : "Version"} {legal.version}</p>
            <h1>{ru ? "Согласие на обработку персональных данных" : "Personal data processing consent"}</h1>
          </section>
        </div>
        <article className="section legal-copy shell">
          <p>{ru ? `Настоящим я свободно, своей волей и в своём интересе даю ${legal.name} (ИНН ${legal.inn}, ОГРНИП ${legal.ogrnip}) согласие на обработку данных, которые я укажу в форме сайта KILENI.` : `I freely consent to ${legal.name} processing the data I submit through a KILENI form.`}</p>
          <h2>{ru ? "Какие данные" : "Data covered"}</h2>
          <p>{ru ? "Имя; e-mail или имя пользователя Telegram; адрес проверяемого сайта, карточки или проекта; комментарий; ответы брифа; выбранный тариф; переданные мной файлы; технические сведения о согласии, источнике обращения и защите формы." : "Name; email or Telegram username; website, listing or project address; comment; brief answers; selected package; submitted files; and technical consent, attribution and form-security records."}</p>
          <h2>{ru ? "Цели" : "Purposes"}</h2>
          <p>{ru ? "Ответить на обращение, выполнить запрошенную бесплатную проверку, подготовить расчёт или предложение, связать результат проверки с моим обращением и согласовать возможные работы. Согласие не включает рекламную рассылку." : "To answer the request, run the requested free check, prepare an estimate or proposal, connect the audit result with the request and agree possible work. This consent does not cover advertising messages."}</p>
          <h2>{ru ? "Действия и способы обработки" : "Processing operations"}</h2>
          <p>{ru ? "Сбор, запись, систематизация, хранение, уточнение, извлечение, использование, передача только привлечённым для работы сервисам, блокирование и удаление; автоматизированно и без использования средств автоматизации." : "Collection, recording, organisation, storage, update, retrieval, use, transfer only to service providers involved in delivery, restriction and deletion, by automated and non-automated means."}</p>
          <h2>{ru ? "Срок и отзыв" : "Duration and withdrawal"}</h2>
          <p>{ru ? `Согласие действует до достижения указанных целей или до его отзыва. Отзыв и запрос на удаление можно направить на ${legal.email}. После отзыва оператор прекращает обработку и удаляет данные, если их дальнейшее хранение не требуется по закону или для исполнения заключённого договора.` : `Consent applies until the stated purposes are achieved or it is withdrawn. Withdrawal and deletion requests may be sent to ${legal.email}.`}</p>
          <p>{ru ? "Я подтверждаю, что имею право передать указанные сведения и файлы и ознакомился с Политикой обработки персональных данных." : "I confirm that I may lawfully submit the information and files and have read the privacy policy."}</p>
          <p><Link href={localizedPath(locale, "privacy")}>{ru ? "Политика обработки персональных данных" : "Privacy policy"}</Link></p>
          <p><a href={`mailto:${legal.email}`}>{legal.email}</a></p>
        </article>
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
        <p>{ru ? `Оператор: ${operator}. ИП зарегистрирован ${legal.registrationDate}, регистрирующий орган — ${legal.registrationAuthority}. Политика применяется к сайту KILENI и его формам.` : `Operator: ${operator}. This policy applies to the KILENI website and its forms.`}</p>
        <h2>{ru ? "2. Какие данные обрабатываются" : "2. Data processed"}</h2>
        <p>{ru ? "Имя; e-mail или имя пользователя Telegram; адрес сайта, карточки или проекта; комментарий; выбранная услуга и тариф; ответы брифа; файлы, которые пользователь прикрепил сам; UTM-параметры; версия и время согласия; необратимый хеш IP-адреса и User-Agent для ограничения злоупотреблений. Платёжные данные сайт не собирает." : "Name; email or Telegram username; website, listing or project address; comment; selected service and package; brief answers; files submitted by the user; UTM parameters; consent version and time; and irreversible IP and User-Agent hashes for abuse prevention. The website does not collect payment data."}</p>
        <h2>{ru ? "3. Цели и действия" : "3. Purposes and operations"}</h2>
        <p>{ru ? "Данные используются, чтобы ответить на обращение, выполнить бесплатную проверку, подготовить расчёт или предложение, защитить формы, сохранить историю согласованного проекта и исполнить договор. Основания: отдельное согласие пользователя, действия по его запросу до заключения договора и исполнение заключённого договора. Юридически значимые решения автоматически не принимаются; рекламная рассылка без отдельного согласия не ведётся." : "Data is used to answer requests, run the free check, prepare an estimate or proposal, protect forms, retain agreed project history and perform a contract. Grounds include the user's separate consent, pre-contract steps requested by the user and contract performance. No legally significant automated decisions or advertising mailings are made."}</p>
        <h2>{ru ? "4. Хранение и безопасность" : "4. Retention and security"}</h2>
        <p>{ru ? `Результат аудита и связанная заявка хранятся ${siteConfig.audit.retentionDays} дней, затем технические записи аудита удаляются автоматически. Остальные обращения, брифы и вложения хранятся до ответа, завершения согласованного проекта или отзыва согласия; оператор удаляет их через защищённый административный раздел. Вложения находятся вне публичной папки, а публичный результат доступен только по случайной ссылке и не содержит имени или контакта.` : `Audit results and the related request are retained for ${siteConfig.audit.retentionDays} days and then removed automatically. Other requests, briefs and attachments are retained until the reply or agreed project is complete or consent is withdrawn, and are deleted through the protected administration area. Attachments are outside public assets; public results use random links and contain no name or contact.`}</p>
        <h2>{ru ? "5. Согласие и отзыв" : "5. Consent and withdrawal"}</h2>
        <p>{ru ? "Форма отправляется только после отдельной отметки согласия. Согласие можно отозвать, а данные уточнить, заблокировать или удалить по запросу на юридический e-mail оператора. Отзыв не делает незаконной обработку, выполненную до его получения." : "A form can be submitted only after a separate consent checkbox is selected. Consent may be withdrawn and data may be corrected, restricted or deleted by writing to the operator's legal email."}</p>
        <h2>{ru ? "6. Передача сервисам и за пределы РФ" : "6. Service providers and international transfer"}</h2>
        <p>{ru ? "Заявки могут доставляться оператору через настроенные серверные e-mail и Telegram-уведомления. Для защиты формы может загружаться Cloudflare Turnstile: браузер соединяется с Cloudflare, а сервер передаёт сервису IP-адрес отправителя для проверки запроса; применяются условия Cloudflare. Иные системы аналитики, Яндекс Метрика и рекламные пиксели сейчас не подключены. При их подключении политика и настройки cookies должны быть обновлены до начала сбора." : "Requests may be delivered through configured server-side email and Telegram notifications. Cloudflare Turnstile may be loaded to protect forms: the browser connects to Cloudflare and the server supplies the sender IP address for request verification under Cloudflare's terms. No analytics systems, Yandex Metrica or advertising pixels are currently connected. This policy and cookie controls must be updated before any such collection begins."}</p>
        <h2>{ru ? "7. Cookies и локальное хранилище" : "7. Cookies and local storage"}</h2>
        <p>{ru ? "Сайт использует необходимые технические данные для CSRF-защиты, темы, черновика брифа, связи с результатом аудита, показа вступления и сохранения выбора cookies. Необязательные категории по умолчанию выключены. Полный список, назначение и срок доступны через кнопку «Настройки cookies» в подвале." : "The website uses essential technical storage for CSRF protection, theme, brief drafts, audit handoff, the intro and cookie choices. Optional categories are off by default. The full inventory, purpose and duration are available from Cookie settings in the footer."}</p>
        <h2>{ru ? "8. Права пользователя и контакты" : "8. User rights and contact"}</h2>
        <p>{ru ? "Пользователь может получить сведения об обработке, потребовать уточнения, ограничения или удаления данных и отозвать согласие. Для обращения укажите контакт, использованный в форме, и примерную дату отправки — это поможет найти запись без запроса лишних данных." : "Users may request processing information, correction, restriction or deletion and may withdraw consent. Include the contact used in the form and approximate submission date so the record can be found without requesting extra data."}</p>
        <p><a href={`mailto:${legal.email}`}>{legal.email}</a></p>
      </article>
    </PublicShell>
  );
}
