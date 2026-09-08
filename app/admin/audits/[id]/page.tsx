import { notFound } from "next/navigation";

import { validUuid } from "@/app/api/_lib/http";
import { AdminCopyButton } from "@/src/components/admin/AdminCopyButton";
import { AdminEntityControls } from "@/src/components/admin/AdminEntityControls";
import { AdminBack, AdminDate, AdminEmpty, AdminJson } from "@/src/components/admin/AdminUi";
import { AdminContactActions } from "../../_components/EntityUi";
import { AuditOverview } from "../_components/AuditOverview";
import { AuditStatusBadge, EmailDeliveryBadge, SeverityBadge } from "../_components/AuditBadges";
import {
  buildAuditIssueViews,
  buildAuditContractView,
  buildAuditPageViews,
  buildIndexingView,
  buildPerformanceView,
  emailDeliveryView,
} from "../../_lib/audit-view";
import { requireAdmin } from "../../_lib/auth";
import { adminAuditDetail, auditEmailProviderConfigured } from "../../_lib/data";
import type { AuditClientIssue } from "@/src/lib/audit/client-presentation";

export default async function AdminAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();

  const detail = await adminAuditDetail(id);
  if (!detail) notFound();

  const { audit } = detail;
  const issues = buildAuditIssueViews(detail.issues, detail.fullResult);
  const contract = buildAuditContractView(detail.publicResult, detail.fullResult, detail.metadata);
  const pages = buildAuditPageViews(detail.pages, detail.fullResult);
  const indexing = buildIndexingView(detail.fullResult, pages);
  const performance = buildPerformanceView(detail.fullResult, pages);
  const clientAttentionIssues = contract?.clientPresentation.issues.filter((issue) => issue.kind !== "optional") ?? [];
  const clientOptionalIssues = contract?.clientPresentation.issues.filter((issue) => issue.kind === "optional") ?? [];
  const emailNotification = detail.notifications.find((notification) => notification.channel === "email");
  const emailDelivery = emailDeliveryView({
    contactType: audit.contactType,
    auditStatus: audit.status,
    notificationStatus: emailNotification?.status,
    notificationError: emailNotification?.error,
    providerConfigured: auditEmailProviderConfigured(),
  });
  const auditStatusOptions = audit.status === "failed"
    ? [{ value: "queued", label: "Повторно поставить в очередь" }]
    : audit.status === "queued"
      ? [{ value: "failed", label: "Отменить до запуска" }]
      : [];
  const publicPath = `${audit.locale === "en" ? "/en" : ""}/audit/${audit.publicToken}`;

  return <>
    <AdminBack href="/admin/audits">Все аудиты</AdminBack>
    <div className="admin-title">
      <div>
        <p className="admin-kicker">Проверка с доказательствами</p>
        <h1>{audit.normalizedDomain}</h1>
        <p className="admin-title__description">Здесь видны охват, найденные проблемы, проверенные URL и доставка результата пользователю.</p>
      </div>
      <div className="admin-title__flags">
        <AuditStatusBadge status={audit.status}/>
        {detail.metadata.qaLabel && <span className="admin-badge admin-badge--qa">QA · {detail.metadata.qaLabel}</span>}
        {detail.metadata.archivedAt && <span className="admin-badge admin-badge--muted">В архиве</span>}
      </div>
    </div>

    {audit.contact && <section className="admin-contact-card" aria-labelledby="audit-contact-heading"><div><p className="admin-kicker">Контакт из проверки</p><h2 id="audit-contact-heading">Отправить результат</h2></div><AdminContactActions contact={audit.contact} contactType={audit.contactType}/></section>}

    <section className="admin-section" aria-labelledby="audit-actions-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Быстрые действия</p><h2 id="audit-actions-heading">Открыть и передать результат</h2></div><p>Публичная ссылка показывает только безопасную часть отчёта: без контакта, IP и служебных данных.</p></header>
      <div className="admin-action-links">
        <a href={`/api/admin/audits/${id}/export?format=pdf`}>Скачать PDF</a>
        <a href={`/api/admin/audits/${id}/export`}>Скачать JSON</a>
        <a href={publicPath} target="_blank" rel="noreferrer">Открыть публичный отчёт ↗</a>
        <AdminCopyButton value={publicPath}/>
        <a href={audit.originalUrl} target="_blank" rel="noreferrer">Открыть сайт ↗</a>
      </div>
    </section>

    <AuditOverview audit={audit} issues={issues} queue={detail.queue} contract={contract}/>

    {!contract && detail.metadata.offerSnapshot ? <section className="admin-card" aria-labelledby="audit-offer-heading">
      <p className="admin-kicker">Предложение на момент проверки</p>
      <h2 id="audit-offer-heading">{detail.metadata.offerSnapshot.title}</h2>
      <dl className="admin-dl"><div><dt>Код</dt><dd>{detail.metadata.offerSnapshot.id}</dd></div>{detail.metadata.offerSnapshot.price && <div><dt>Цена</dt><dd>{detail.metadata.offerSnapshot.price}</dd></div>}</dl>
    </section> : null}

    {contract ? <>
      <section className="admin-section" aria-labelledby="audit-client-summary-heading">
        <header className="admin-section__heading"><div><p className="admin-kicker">То, что видит клиент</p><h2 id="audit-client-summary-heading">Клиентский итог и рекомендации</h2></div><p>Эти числа, URL и формулировки совпадают с публичным отчётом и PDF.</p></header>
        <div className="admin-grid admin-grid--summary">
          <article className="admin-card"><h3>Краткий итог</h3><dl className="admin-dl"><div><dt>{contract.clientPresentation.summary.scopeLabel}</dt><dd>{contract.clientPresentation.summary.scopeValue}</dd></div><div><dt>Подходят для выборки</dt><dd>{contract.clientPresentation.summary.eligible}</dd></div><div><dt>Исключено до выборки</dt><dd>{contract.clientPresentation.summary.excluded}</dd></div><div><dt>Выбрано страниц</dt><dd>{contract.clientPresentation.summary.selected}</dd></div><div><dt>{contract.clientPresentation.summary.checkedLabel}</dt><dd>{contract.clientPresentation.summary.checked}</dd></div><div><dt>Не завершено</dt><dd>{contract.clientPresentation.summary.notCompleted}</dd></div><div><dt>Не вошло в выборку</dt><dd>{contract.clientPresentation.summary.outsideSample}</dd></div></dl></article>
          <article className="admin-card"><h3>Что стоит проверить</h3><dl className="admin-dl"><div><dt>Критических проблем</dt><dd>{contract.clientPresentation.summary.critical}</dd></div><div><dt>Стоит проверить</dt><dd>{contract.clientPresentation.summary.review}</dd></div></dl></article>
          <article className="admin-card"><h3>Можно улучшить</h3><dl className="admin-dl"><div><dt>Необязательных улучшений</dt><dd>{contract.clientPresentation.summary.optional}</dd></div></dl></article>
          <article className="admin-card"><h3>Что уже в порядке</h3><ul>{contract.clientPresentation.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></article>
        </div>
        {contract.clientPresentation.exclusions.length > 0 && <p className="admin-muted">{contract.clientPresentation.exclusions.map((entry) => `${entry.label}: ${entry.count}`).join(" · ")}</p>}
        <section aria-labelledby="admin-client-attention-heading">
          <h3 id="admin-client-attention-heading">Что стоит проверить</h3>
          <AdminClientIssueTable issues={clientAttentionIssues} emptyLabel="Проблем и предварительных выводов, требующих проверки, нет."/>
        </section>
        <section aria-labelledby="admin-client-optional-heading">
          <h3 id="admin-client-optional-heading">Можно улучшить</h3>
          <AdminClientIssueTable issues={clientOptionalIssues} emptyLabel="Необязательных улучшений нет."/>
        </section>
      </section>

      <section className="admin-section" aria-labelledby="audit-contract-heading">
        <header className="admin-section__heading"><div><p className="admin-kicker">Контракт результата</p><h2 id="audit-contract-heading">Что система действительно выполнила</h2></div><p>Веб-отчёт, PDF и эта карточка читают один сохранённый снимок результата.</p></header>
        <div className="admin-grid admin-grid--summary">
          <article className="admin-card"><h3>Версия и покрытие</h3><dl className="admin-dl"><div><dt>Движок</dt><dd>{contract.engineVersion}</dd></div><div><dt>Контракт</dt><dd>v{contract.contractVersion}</dd></div><div><dt>Покрытие</dt><dd>{contract.coverageLabel}</dd></div><div><dt>Не проверено</dt><dd>{contract.pagesNotCheckedTotal} URL</dd></div></dl></article>
          <article className="admin-card"><h3>Статусы проверок</h3><dl className="admin-dl"><div><dt>Пройдено</dt><dd>{contract.statusCounts.pass}</dd></div><div><dt>Замечания</dt><dd>{contract.statusCounts.warning}</dd></div><div><dt>Ошибки</dt><dd>{contract.statusCounts.fail}</dd></div><div><dt>Не относится к объекту</dt><dd>{contract.statusCounts.notApplicable}</dd></div><div><dt>Не запускалось / мало данных</dt><dd>{contract.statusCounts.notRun} / {contract.statusCounts.insufficientData}</dd></div></dl></article>
          {contract.contractVersion === 3 ? <article className="admin-card"><h3>Инвентарь и выборка</h3><dl className="admin-dl"><div><dt>Всего объектов</dt><dd>{contract.inventorySummary.objectsFound}</dd></div><div><dt>HTML-страниц</dt><dd>{contract.inventorySummary.htmlFound}</dd></div><div><dt>Подходят для выборки</dt><dd>{contract.inventorySummary.eligibleHtml}</dd></div><div><dt>Типов страниц представлено</dt><dd>{contract.inventorySummary.representedPageTypes}</dd></div></dl></article> : null}
          <article className="admin-card"><h3>Служебные метки</h3><dl className="admin-dl"><div><dt>QA</dt><dd>{contract.qaLabel}</dd></div><div><dt>Предложение на момент проверки</dt><dd>{contract.offerSnapshot}</dd></div><div><dt>Источник</dt><dd>{audit.source || "Не указан"}</dd></div><div><dt>Язык</dt><dd>{audit.locale === "en" ? "Английский" : "Русский"}</dd></div></dl></article>
          <article className="admin-card"><h3>Попытка отправки</h3><dl className="admin-dl"><div><dt>Статус провайдера</dt><dd><EmailDeliveryBadge delivery={emailDelivery}/></dd></div><div><dt>Попытка</dt><dd>{emailNotification?.createdAt ? <AdminDate value={Number(emailNotification.createdAt)}/> : "Не зафиксирована"}</dd></div><div><dt>Ответ провайдера</dt><dd>{emailNotification?.error ? String(emailNotification.error) : emailNotification?.status ? String(emailNotification.status) : "Нет данных"}</dd></div><div><dt>Получатель</dt><dd>{audit.contact || "Не запрашивалась"}</dd></div></dl></article>
        </div>
      </section>

      {contract.contractVersion === 3 ? <section className="admin-section" aria-labelledby="audit-inventory-heading">
        <header className="admin-section__heading"><div><p className="admin-kicker">Все найденные адреса и файлы</p><h2 id="audit-inventory-heading">Полный инвентарь · {contract.inventory.length}</h2></div><p>Здесь видно, что вошло в бесплатную выборку, что осталось за её пределами и почему.</p></header>
        {contract.inventory.length === 0 ? <AdminEmpty>Полный инвентарь в сохранённом результате отсутствует.</AdminEmpty> : <div className="admin-table-wrap"><table><thead><tr><th>Решение</th><th>URL</th><th>Что это</th><th>Тип страницы</th><th>Ответ</th><th>Почему включён или исключён</th><th>Как определён тип</th></tr></thead><tbody>{contract.inventory.map((item, index) => <tr key={`${item.url}-${index}`}><td><span className={`admin-badge admin-badge--${item.included === true ? "success" : item.included === false ? "muted" : "warning"}`}>{item.included === true ? "В выборке" : item.included === false ? "Не в выборке" : "Нет решения"}</span></td><td className="admin-break">{safeExternalUrl(item.url) ? <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a> : item.url}{item.requestedUrl !== item.url ? <small>Запрошен: {item.requestedUrl}</small> : null}</td><td>{item.resourceTypeLabel}</td><td>{item.pageTypeLabel}</td><td>{item.statusCode ?? "Не загружался"}</td><td>{item.decisionLabel}{item.decisionPrimaryUrl ? <small className="admin-break">Основной адрес: {safeExternalUrl(item.decisionPrimaryUrl) ? <a href={item.decisionPrimaryUrl} target="_blank" rel="noreferrer">{item.decisionPrimaryUrl}</a> : item.decisionPrimaryUrl}</small> : null}</td><td>{item.classificationConfidence === null ? "Уверенность не сохранена" : `Уверенность ${Math.round(item.classificationConfidence * 100)}%`}{item.classificationReasons.length || item.templateFamily !== "Не сохранён" ? <details><summary>Показать признаки</summary>{item.classificationReasons.length ? <ul>{item.classificationReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}{item.templateFamily !== "Не сохранён" ? <p>Группа шаблона: {item.templateFamily}</p> : null}</details> : null}</td></tr>)}</tbody></table></div>}
      </section> : null}

      <section className="admin-section" aria-labelledby="audit-selected-heading">
        <header className="admin-section__heading"><div><p className="admin-kicker">Детерминированная выборка</p><h2 id="audit-selected-heading">Почему выбраны эти страницы · {contract.selectedPages.length}</h2></div><p>Разные типы страниц выбираются раньше языковых копий и повторяющихся шаблонов.</p></header>
        {contract.selectedPages.length === 0 ? <AdminEmpty>Выборка не сохранена.</AdminEmpty> : <div className="admin-table-wrap"><table><thead><tr><th>URL</th><th>Тип страницы</th><th>Причина выбора</th>{contract.contractVersion === 3 ? <><th>Шаблон</th><th><abbr title="Доля от 0 до 100%, которая показывает, насколько однозначно сохранённые признаки соответствуют выбранному типу страницы. Это не оценка качества страницы.">Классификация</abbr></th></> : null}</tr></thead><tbody>{contract.selectedPages.map((page) => <tr key={page.url}><td className="admin-break">{safeExternalUrl(page.url) ? <a href={page.url} target="_blank" rel="noreferrer">{page.url}</a> : page.url}</td><td>{page.pageType}</td><td>{page.selectionReason}</td>{contract.contractVersion === 3 ? <><td>{page.templateFamily}</td><td>{page.classificationConfidence === null ? "Не сохранена" : `${Math.round(page.classificationConfidence * 100)}%`}{page.classificationReasons.length ? <small>{page.classificationReasons.join("; ")}</small> : null}</td></> : null}</tr>)}</tbody></table></div>}
      </section>

      {contract.findings.length ? <section className="admin-section" aria-labelledby="audit-findings-heading">
        <header className="admin-section__heading"><div><p className="admin-kicker">Сгруппированные находки</p><h2 id="audit-findings-heading">Что исправить · {contract.findings.length}</h2></div><p>Повтор одной причины на нескольких страницах собран в одну строку. Примеры взяты из сохранённого снимка.</p></header>
        <div className="admin-table-wrap"><table><thead><tr><th>Приоритет</th><th>Что нашли</th><th>Почему это важно</th><th>Что сделать</th><th>Примеры</th></tr></thead><tbody>{contract.findings.map((finding) => <tr key={`${finding.id}-${finding.whatFound}`}><td><span className={`admin-badge admin-badge--${checkTone(finding.severity === "critical" || finding.severity === "high" ? "fail" : "warning")}`}>{finding.severityLabel}</span><small>Затронуто: {finding.affectedCount}</small></td><td><b>{finding.title}</b><p>{finding.whatFound}</p></td><td>{finding.whyImportant}</td><td>{finding.nextStep}</td><td>{finding.examples.length ? <details><summary>{finding.examples.length} пример.</summary><ul>{finding.examples.map((example, index) => <li className="admin-break" key={`${finding.id}-example-${index}`}>{example.observation} — {example.url}</li>)}</ul></details> : "Нет примеров"}</td></tr>)}</tbody></table></div>
      </section> : null}

      {contract.technicalResources.length ? <section className="admin-section" aria-labelledby="audit-resources-heading">
        <header className="admin-section__heading"><div><p className="admin-kicker">Технические файлы</p><h2 id="audit-resources-heading">Проверены отдельно · {contract.technicalResources.length}</h2></div><p>Эти ответы не занимают места в выборке HTML-страниц.</p></header>
        <div className="admin-table-wrap"><table><thead><tr><th>Ресурс</th><th>URL</th><th>Ответ</th><th>Content-Type</th><th>Почему так классифицирован</th></tr></thead><tbody>{contract.technicalResources.map((resource) => <tr key={`${resource.resourceType}-${resource.url}`}><td>{resource.resourceTypeLabel}</td><td className="admin-break">{safeExternalUrl(resource.url) ? <a href={resource.url} target="_blank" rel="noreferrer">{resource.url}</a> : resource.url}</td><td>{resource.statusCode ?? "—"}</td><td>{resource.contentType}</td><td>{resource.classificationReasons.join("; ") || "Причина не сохранена"}</td></tr>)}</tbody></table></div>
      </section> : null}

      <section className="admin-section" aria-labelledby="audit-checks-heading">
        <header className="admin-section__heading"><div><p className="admin-kicker">Матрица проверок</p><h2 id="audit-checks-heading">Статусы и доказательства · {contract.checks.length}</h2></div><p>Неприменимые проверки, незапущенные замеры и нехватка данных показаны отдельно и не считаются успешным результатом.</p></header>
        <div className="admin-table-wrap"><table><thead><tr><th>Статус</th><th>Проверка простыми словами</th><th>Что нашли</th><th>Что сделать</th><th>Доказательства</th></tr></thead><tbody>{contract.checks.map((check, checkIndex) => <tr key={`${check.id}-${checkIndex}`}><td><span className={`admin-badge admin-badge--${checkTone(check.status)}`}>{check.statusLabel}</span></td><td><b>{check.title}</b><small>{check.category}</small><details><summary>Что проверяется и где граница</summary><p>{check.expected}</p><p>{check.automationLimit}</p></details></td><td>{check.explanation}</td><td>{check.nextAction}</td><td>{check.evidenceCount ? <details><summary>{check.evidenceCount} факт.</summary><ul>{check.evidence.map((evidence, index) => <li className="admin-break" key={`${check.id}-${index}`}>{evidence.observation} — {evidence.url}</li>)}</ul></details> : "Нет URL-фактов"}</td></tr>)}</tbody></table></div>
      </section>

      {contract.limitations.length ? <section className="admin-card"><h2>Границы автоматической проверки</h2><ul>{contract.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></section> : null}
    </> : null}

    {contract?.contractVersion !== 3 ? <section className="admin-section" aria-labelledby="audit-signals-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Факты проверки</p><h2 id="audit-signals-heading">Что именно проверила система</h2></div><p>Это наблюдения по сохранённым страницам, а не предположения о всём сайте.</p></header>
      <div className="admin-grid admin-grid--summary">
        <article className="admin-card"><h3>Правила для поисковых систем (robots.txt)</h3><dl className="admin-dl"><div><dt>Статус</dt><dd><span className={`admin-badge admin-badge--${indexing.robotsTone}`}>{indexing.robotsLabel}</span></dd></div><div><dt>Ответ сервера</dt><dd>{indexing.robotsHttpStatus ?? "—"}</dd></div><div><dt>Указанных файлов со страницами</dt><dd>{indexing.declaredSitemaps || "—"}</dd></div></dl></article>
        <article className="admin-card"><h3>Файл со списком страниц (sitemap.xml)</h3><dl className="admin-dl"><div><dt>Статус</dt><dd><span className={`admin-badge admin-badge--${indexing.sitemapTone}`}>{indexing.sitemapLabel}</span></dd></div><div><dt>Адресов в файле</dt><dd>{indexing.sitemapUrls || "—"}</dd></div><div><dt>Ошибок чтения</dt><dd>{indexing.sitemapErrors}</dd></div></dl></article>
        <article className="admin-card"><h3>Проверенные страницы</h3><dl className="admin-dl"><div><dt>Можно обрабатывать для поиска</dt><dd>{indexing.indexablePages} из {pages.length}</dd></div><div><dt>Закрыты от поиска</dt><dd>{indexing.noindexPages}</dd></div><div><dt>Проблемы с основным адресом</dt><dd>{indexing.canonicalProblems}</dd></div></dl></article>
        <article className="admin-card"><h3>Скорость ответа</h3><dl className="admin-dl"><div><dt>Измерено страниц</dt><dd>{performance.measuredPages}</dd></div><div><dt>Средний ответ</dt><dd>{performance.averageResponseMs === null ? "Нет данных" : `${performance.averageResponseMs} мс`}</dd></div><div><dt>Автоматический тест скорости</dt><dd>{performance.available ? "Есть в результате" : "Не запускался"}</dd></div></dl></article>
        <article className="admin-card"><h3>Доставка отчёта</h3><dl className="admin-dl"><div><dt>Email</dt><dd><EmailDeliveryBadge delivery={emailDelivery}/></dd></div><div><dt>Получатель</dt><dd>{audit.contact || "Не запрашивалась"}</dd></div><div><dt>Согласие</dt><dd>{audit.consentVersion || "—"}</dd></div></dl></article>
        <article className="admin-card"><h3>Статус обработки</h3><dl className="admin-dl"><div><dt>Создан</dt><dd><AdminDate value={audit.createdAt}/></dd></div><div><dt>Завершён</dt><dd>{audit.completedAt ? <AdminDate value={audit.completedAt}/> : "Ещё выполняется"}</dd></div><div><dt>Ошибка</dt><dd>{audit.errorSummary ?? "Нет"}</dd></div></dl></article>
      </div>
    </section> : null}

    {!contract ? <section className="admin-section" aria-labelledby="audit-issues-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Очередь исправлений</p><h2 id="audit-issues-heading">Проблемы и доказательства · {issues.length}</h2></div><p>Для каждой проблемы показаны страница, найденный факт и нужное действие.</p></header>
      {issues.length === 0 ? <AdminEmpty>В этой выборке проблем не сохранено.</AdminEmpty> : <div className="admin-table-wrap"><table><thead><tr><th>Приоритет</th><th>Проблема</th><th>Страница</th><th>Факт</th><th>Что сделать</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue.id}><td><SeverityBadge severity={issue.severity}/></td><td><b>{issue.title}</b><small>{issue.categoryLabel} · {issue.code}</small></td><td className="admin-break">{issue.url ?? "Вся выборка"}</td><td>{issue.evidence}</td><td>{issue.recommendation}</td></tr>)}</tbody></table></div>}
    </section> : null}

    {contract?.contractVersion === 3 ? <section className="admin-section" aria-labelledby="audit-pages-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Проверенные страницы</p><h2 id="audit-pages-heading">Факты из сохранённого снимка · {contract.checkedPages.length}</h2></div><p>Админка показывает те же URL и признаки, что веб-отчёт и PDF.</p></header>
      {contract.checkedPages.length === 0 ? <AdminEmpty>В снимке нет проверенных страниц.</AdminEmpty> : <div className="admin-table-wrap"><table><thead><tr><th>Адрес</th><th>Тип</th><th>Шаблон</th><th>Ответ</th><th>Noindex</th><th>Title</th><th>H1</th><th>Canonical</th></tr></thead><tbody>{contract.checkedPages.map((page) => <tr key={page.finalUrl}><td className="admin-break">{safeExternalUrl(page.finalUrl) ? <a href={page.finalUrl} target="_blank" rel="noreferrer">{page.finalUrl}</a> : page.finalUrl}</td><td>{page.pageType}</td><td>{page.templateFamily}<small><abbr title="Доля от 0 до 100%, которая показывает, насколько однозначно сохранённые признаки соответствуют выбранному типу страницы. Это не оценка качества страницы.">уверенность классификации</abbr> {Math.round(page.classificationConfidence * 100)}%</small></td><td>{page.statusCode ?? "—"}</td><td>{page.noindex === null ? "Не сохранено" : page.noindex ? "Да" : "Нет"}</td><td>{page.title}</td><td>{page.h1Count ?? "—"}</td><td className="admin-break">{page.canonical}</td></tr>)}</tbody></table></div>}
    </section> : <section className="admin-section" aria-labelledby="audit-pages-heading">
      <header className="admin-section__heading"><div><p className="admin-kicker">Проверенные страницы</p><h2 id="audit-pages-heading">Факты по страницам · {pages.length}</h2></div><p>Здесь только страницы, которые действительно были загружены и разобраны.</p></header>
      {pages.length === 0 ? <AdminEmpty>Сохранённых страниц нет.</AdminEmpty> : <div className="admin-table-wrap"><table><thead><tr><th>Адрес</th><th>Ответ сервера</th><th>Доступна для поиска</th><th>Название страницы</th><th>Главный заголовок</th><th>Основной адрес</th><th>Проблем</th></tr></thead><tbody>{pages.map((page) => <tr key={page.id}><td className="admin-break">{safeExternalUrl(page.url) ? <a href={page.url} target="_blank" rel="noreferrer">{page.url}</a> : page.url}</td><td>{page.statusCode ?? "—"}</td><td>{page.indexability}</td><td>{page.title}</td><td>{page.h1Count ?? "—"}</td><td className="admin-break">{page.canonical}</td><td>{page.issueCount}</td></tr>)}</tbody></table></div>}
    </section>}

    <section className="admin-card"><h2>Управление и заметки</h2><AdminEntityControls endpoint={`/api/admin/audits/${id}`} id={id} currentStatus={audit.status} statusOptions={auditStatusOptions} currentArchived={Boolean(detail.metadata.archivedAt)} currentQaLabel={detail.metadata.qaLabel}/></section>
    <section className="admin-card"><h2>События · {detail.events.length}</h2>{detail.events.length === 0 ? <AdminEmpty/> : <div className="admin-events">{detail.events.map((event) => <article key={event.id}><header><b>{String(event.event)}</b><AdminDate value={event.createdAt}/></header><AdminJson value={event.payload}/></article>)}</div>}</section>
    <section className="admin-card"><h2>Заметки · {detail.notes.length}</h2>{detail.notes.length === 0 ? <AdminEmpty/> : <div className="admin-notes">{detail.notes.map((note) => <article key={String(note.id)}><AdminDate value={note.createdAt}/><p>{String(note.note)}</p></article>)}</div>}</section>
    <details className="admin-card"><summary>Служебные данные и полный JSON</summary><div className="admin-grid"><section><h2>Уведомления</h2><AdminJson value={detail.notifications}/></section><section><h2>Публичный результат</h2><AdminJson value={detail.publicResult}/></section><section><h2>Полный результат</h2><AdminJson value={detail.fullResult}/></section></div></details>
  </>;
}

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function AdminClientIssueTable({ issues, emptyLabel }: { issues: readonly AuditClientIssue[]; emptyLabel: string }) {
  if (!issues.length) return <AdminEmpty>{emptyLabel}</AdminEmpty>;

  return <div className="admin-table-wrap"><table><thead><tr><th>Статус</th><th>Страница</th><th>Что нашли</th><th>Почему это важно</th><th>Как проверили</th><th>Надёжность</th><th>Что делать дальше</th></tr></thead><tbody>{issues.map((issue) => <tr key={`${issue.checkId}-${issue.url}`}><td><span className={`admin-badge admin-badge--${issue.kind === "critical" ? "danger" : issue.kind === "review" ? "warning" : "success"}`}>{issue.kind === "critical" ? "Критично" : issue.kind === "review" ? "Стоит проверить" : "Необязательное улучшение"}</span></td><td className="admin-break"><b>{issue.title}</b>{safeExternalUrl(issue.url) ? <a href={issue.url} target="_blank" rel="noreferrer">{issue.url}</a> : issue.url}</td><td>{issue.whatFound}</td><td>{issue.whyImportant}</td><td>{issue.howChecked}</td><td>{issue.reliability}</td><td>{issue.nextStep}</td></tr>)}</tbody></table></div>;
}

function checkTone(status: string) {
  if (status === "pass") return "success";
  if (status === "warning") return "warning";
  if (status === "fail") return "danger";
  return "muted";
}
