import type { AdminEntityMetadata, AdminOfferSnapshot } from "@/src/db/admin-entity-metadata";
import { auditChecks } from "@/src/content/audit-checks";
import { buildAuditClientPresentation, type AuditClientPresentation } from "@/src/lib/audit/client-presentation";
import { auditCheckCopy, auditObservationCopy, type AuditCheckCopyInput } from "@/src/lib/audit/report-content";

const auditStatusLabels: Readonly<Record<string, string>> = {
  queued: "В очереди",
  validating_target: "Проверка адреса",
  connecting: "Подключение",
  checking_robots: "Проверка robots.txt",
  checking_sitemaps: "Проверка Sitemap",
  discovering_pages: "Поиск страниц",
  crawling_pages: "Обход страниц",
  analyzing_structure: "Анализ структуры",
  running_performance: "Проверка скорости",
  finalizing_report: "Формирование отчёта",
  calculating_score: "Формирование отчёта",
  completed: "Завершён",
  partial: "Частичный результат",
  failed: "Ошибка",
};

export const auditStatusOptions = Object.entries(auditStatusLabels).map(([value, label]) => ({ value, label }));

export function auditStatusLabel(status: unknown): string {
  const key = String(status ?? "").trim();
  return auditStatusLabels[key] ?? "Неизвестный статус";
}

export function auditStatusTone(status: unknown): DeliveryTone {
  const value = String(status ?? "");
  if (value === "completed") return "success";
  if (value === "failed") return "danger";
  if (value === "partial") return "warning";
  return "progress";
}

export function severityLabel(severity: unknown): string {
  const value = String(severity ?? "");
  return severityLabels[value] ?? "Не определена";
}

export function severityTone(severity: unknown): DeliveryTone {
  const value = String(severity ?? "");
  if (value === "critical" || value === "high") return "danger";
  if (value === "medium") return "warning";
  return value === "low" ? "success" : "muted";
}

export function auditEventLabel(event: unknown): string {
  const value = String(event ?? "");
  const special: Readonly<Record<string, string>> = {
    "audit:start": "Проверка запущена",
    "discovery:start": "Начат поиск страниц",
    "discovery:robots_complete": "robots.txt проверен",
    "discovery:sitemaps_complete": "Sitemap проверена",
    "discovery:complete": "Поиск страниц завершён",
    "crawl:page": "Страница проверена",
    "crawl:progress": "Обход продолжается",
    "audit:complete": "Проверка завершена",
    warning: "Предупреждение",
  };
  return special[value] ?? auditStatusLabels[value] ?? humanizeCode(value);
}

export function readableFieldLabel(field: string): string {
  const labels: Readonly<Record<string, string>> = {
    pagesChecked: "Подробно проверено",
    pagesDiscovered: "Найдено страниц",
    crawled: "Обойдено",
    queued: "В очереди",
    limit: "Лимит",
    score: "Оценка",
    code: "Код",
    cached: "Использован кеш",
    admin: "Изменено администратором",
    retry: "Повторный запуск",
  };
  const parts = field.split(".");
  const leaf = parts.at(-1) ?? field;
  return labels[leaf] ?? humanizeCode(field);
}

export function safeHttpUrl(value: unknown): string | null {
  const candidate = readString(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function maskAuditContact(contact: unknown, contactType: unknown): string {
  const value = String(contact ?? "").trim();
  if (!value) return "—";
  if (contactType !== "email" && !value.includes("@")) return value;
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  const visible = local.length > 1 ? `${local[0]}***${local.at(-1)}` : `${local[0]}***`;
  return `${visible}@${domain}`;
}

export function formatAuditDuration(
  audit: { startedAt?: number | null; completedAt?: number | null },
  now = Date.now(),
): string {
  if (!audit.startedAt) return "—";
  const durationMs = Math.max(0, (audit.completedAt ?? now) - audit.startedAt);
  const totalSeconds = Math.round(durationMs / 1_000);
  if (totalSeconds < 60) return `${totalSeconds} с`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes} мин ${seconds} с` : `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} ч ${remainingMinutes} мин` : `${hours} ч`;
}

type DeliveryTone = "success" | "danger" | "warning" | "muted" | "progress";

export type EmailDeliveryView = {
  key: "sent" | "failed" | "not_connected" | "waiting" | "not_required";
  label: string;
  tone: DeliveryTone;
  detail?: string;
};

export type AdminAuditContractView = {
  clientPresentation: AuditClientPresentation;
  engineVersion: string;
  contractVersion: number;
  coverageStatus: string;
  coverageLabel: string;
  pagesDiscovered: number;
  pagesEligible: number;
  pagesExcluded: number;
  pagesSelected: number;
  pagesChecked: number;
  pagesNotCompleted: number;
  pagesNotCheckedTotal: number;
  inventorySummary: { objectsFound: number; htmlFound: number; eligibleHtml: number; excludedHtml: number; selected: number; checked: number; notCompleted: number; outsideSample: number; representedPageTypes: number };
  statusCounts: { pass: number; warning: number; fail: number; notApplicable: number; notRun: number; insufficientData: number; total: number; completed: number };
  selectedPages: Array<{ url: string; pageType: string; selectionReason: string; templateFamily: string; classificationConfidence: number | null; classificationReasons: string[] }>;
  checkedPages: Array<{ url: string; finalUrl: string; pageType: string; templateFamily: string; classificationConfidence: number; statusCode: number | null; noindex: boolean | null; title: string; h1Count: number | null; canonical: string }>;
  findings: Array<{ id: string; title: string; severity: string; severityLabel: string; whatFound: string; whyImportant: string; nextStep: string; affectedCount: number; confidence: number; examples: Array<{ url: string; observation: string }> }>;
  technicalResources: Array<{ url: string; resourceType: string; resourceTypeLabel: string; statusCode: number | null; contentType: string; classificationReasons: string[] }>;
  inventory: Array<{
    url: string;
    requestedUrl: string;
    resourceType: string;
    resourceTypeLabel: string;
    pageType: string | null;
    pageTypeLabel: string;
    templateFamily: string;
    statusCode: number | null;
    contentType: string;
    classificationConfidence: number | null;
    classificationReasons: string[];
    included: boolean | null;
    decisionReason: string | null;
    decisionLabel: string;
    decisionPrimaryUrl: string | null;
  }>;
  limitations: string[];
  checks: Array<{
    id: string;
    version: number;
    title: string;
    category: string;
    status: string;
    statusLabel: string;
    severity: string;
    explanation: string;
    nextAction: string;
    expected: string;
    automationLimit: string;
    evidenceCount: number;
    evidence: Array<{ url: string; observation: string }>;
  }>;
  qaLabel: string;
  offerSnapshot: string;
};

export function buildAuditContractView(
  publicResult: unknown,
  fullResult: unknown,
  metadata?: AdminEntityMetadata | null,
): AdminAuditContractView | null {
  const publicRecord = asRecord(publicResult);
  const fullRecord = asRecord(fullResult);
  const nestedPublic = asRecord(fullRecord?.publicResult);
  const source = isV4AuditSnapshot(publicRecord)
    ? publicRecord
    : isV4AuditSnapshot(nestedPublic)
      ? nestedPublic
      : isV3AuditSnapshot(publicRecord)
        ? publicRecord
        : isV3AuditSnapshot(nestedPublic) ? nestedPublic : null;
  if (!source) return null;

  const isV4 = readNumber(source.contractVersion) === 3;
  const clientPresentation = buildAuditClientPresentation(source, "ru");
  const clientPagesByUrl = new Map(clientPresentation.pages.map((page) => [adminComparableUrl(page.url), page]));
  const summary = asRecord(source.resultSummary);
  const inventory = asRecord(source.inventorySummary);
  const coverageStatus = readString(source.coverageStatus) ?? "sample_partial";
  const findingRecords = asRecordArray(source.findings);
  const checks = asRecordArray(source.checks).map((check) => {
    const status = normalizedAuditCheckStatus(check.status);
    const checkId = readString(check.checkId) ?? "unknown";
    const content = auditChecks.find((item) => item.id === checkId)?.ru;
    const rawEvidence = asRecordArray(isV4 ? check.evidence : check.urlEvidence).map((item) => ({
      url: readString(item.url) ?? "—",
      observation: readString(item.observation) ?? "Факт не сохранён",
    }));
    const copy = isV4 ? {
      title: readString(check.title) ?? "Проверка",
      explanation: readString(check.reason) ?? "Результат не сохранён",
      expected: readString(check.publicExplanation) ?? "Описание проверки не сохранено",
      automationLimit: readString(check.automationLimit) ?? "Граница автоматической проверки не сохранена",
    } : auditCheckCopy("ru", {
      checkId,
      status,
      value: check.value,
      title: readString(check.title) ?? undefined,
      expected: readString(check.expected) ?? undefined,
      explanation: readString(check.explanation) ?? undefined,
      automationLimit: readString(check.automationLimit) ?? undefined,
      urlEvidence: rawEvidence,
    });
    const evidence = rawEvidence.map((item) => ({ ...item, observation: auditObservationCopy("ru", item.observation) }));
    const matchingFinding = findingRecords.find((finding) => readString(finding.checkId) === checkId);
    return {
      id: checkId,
      version: readNumber(isV4 ? check.version : check.checkVersion) ?? 0,
      title: copy.title,
      category: categoryLabels[readString(check.category) ?? ""] ?? "Другое",
      status,
      statusLabel: auditCheckStatusLabel(status),
      severity: readString(check.severity) ?? "info",
      explanation: copy.explanation,
      nextAction: status === "pass"
        ? "Исправления по этому пункту не нужны."
        : status === "not_applicable"
          ? "Действие не требуется: проверка не относится к этому типу страницы или ресурса."
          : readString(matchingFinding?.nextStep) ?? content?.action ?? "Сверьте найденный факт со страницей и запланируйте исправление.",
      expected: copy.expected,
      automationLimit: copy.automationLimit,
      evidenceCount: evidence.length,
      evidence,
    };
  });
  const selectedPages = asRecordArray(source.selectedPages).map((page) => {
    const pageType = readString(page.pageType);
    const selectionReason = readString(page.selectionReason);
    const pageLocale = readString(page.locale);
    const rawUrl = readString(page.url) ?? "—";
    const clientPage = clientPagesByUrl.get(adminComparableUrl(rawUrl));
    return {
      url: rawUrl,
      pageType: isV4
        ? clientPage?.typeLabel ?? adminSelectedPageTypeLabel(pageType, selectionReason, pageLocale)
        : pageType ?? "Не определён",
      selectionReason: isV4
        ? clientPage?.selectionReason ?? adminSelectionReasonLabel(selectionReason)
        : selectionReason ?? "Причина выбора не сохранена",
      templateFamily: readString(page.templateFamily) ?? "Не сохранён",
      classificationConfidence: readNumber(page.classificationConfidence),
      classificationReasons: readStringArray(page.classificationReasons),
    };
  });
  const checkedPages = asRecordArray(source.checkedPages).map((page) => ({
    url: readString(page.url) ?? "—",
    finalUrl: readString(page.finalUrl) ?? readString(page.url) ?? "—",
    pageType: adminPageTypeLabel(readString(page.pageType)),
    templateFamily: readString(page.templateFamily) ?? "Не сохранён",
    classificationConfidence: readNumber(page.classificationConfidence) ?? 0,
    statusCode: readNumber(page.statusCode) ?? readNumber(asRecord(page.http)?.status),
    noindex: readBoolean(page.noindex),
    title: readString(asRecord(page.title)?.value) ?? readString(page.title) ?? "Не задан",
    h1Count: readNumber(asRecord(page.h1)?.count) ?? readNumber(page.h1Count),
    canonical: readString(asRecord(page.canonical)?.url) ?? readString(page.canonical) ?? "Не задан",
  }));
  const findings = findingRecords.map((finding, index) => {
    const severity = readString(finding.severity) ?? "info";
    return {
      id: readString(finding.checkId) ?? `finding-${index + 1}`,
      title: readString(finding.title) ?? "Находка",
      severity,
      severityLabel: severityLabels[severity] ?? "Информация",
      whatFound: readString(finding.whatFound) ?? "Факт не сохранён",
      whyImportant: readString(finding.whyImportant) ?? "Пояснение не сохранено",
      nextStep: readString(finding.nextStep) ?? "Действие не сохранено",
      affectedCount: readNumber(finding.affectedCount) ?? 0,
      confidence: readNumber(finding.confidence) ?? 0,
      examples: asRecordArray(finding.examples).map((example) => ({
        url: readString(example.url) ?? "—",
        observation: readString(example.observation) ?? "Факт не сохранён",
      })),
    };
  });
  const technicalResources = asRecordArray(source.technicalResources).map((resource) => {
    const resourceType = readString(resource.resourceType) ?? "unknown";
    return {
      url: readString(resource.finalUrl) ?? readString(resource.url) ?? "—",
      resourceType,
      resourceTypeLabel: adminResourceTypeLabel(resourceType),
      statusCode: readNumber(resource.statusCode),
      contentType: readString(resource.contentType) ?? "Не указан",
      classificationReasons: readStringArray(resource.classificationReasons),
    };
  });
  const inventoryDecisions = new Map(asRecordArray(fullRecord?.inventoryDecisions).flatMap((decision) => {
    const url = readString(decision.url);
    if (!url) return [];
    const finalUrl = readString(decision.finalUrl) ?? url;
    return [[adminInventoryDecisionKey(url, finalUrl), {
      included: readBoolean(decision.included),
      reason: readString(decision.reason),
      primaryUrl: readString(decision.primaryUrl),
    }] as const];
  }));
  const inventoryObjects = isV4 ? asRecordArray(fullRecord?.inventory).map((item) => {
    const requestedUrl = readString(item.url) ?? "—";
    const finalUrl = readString(item.finalUrl) ?? requestedUrl;
    const resourceType = readString(item.resourceType) ?? "unknown";
    const pageType = readString(item.pageType);
    const decision = inventoryDecisions.get(adminInventoryDecisionKey(requestedUrl, finalUrl))
      ?? inventoryDecisions.get(adminInventoryDecisionKey(finalUrl, finalUrl));
    return {
      url: finalUrl,
      requestedUrl,
      resourceType,
      resourceTypeLabel: adminResourceTypeLabel(resourceType),
      pageType,
      pageTypeLabel: resourceType === "html" ? adminPageTypeLabel(pageType) : "Не относится к странице",
      templateFamily: readString(item.templateFamily) ?? "Не сохранён",
      statusCode: readNumber(item.statusCode),
      contentType: readString(item.contentType) ?? "Не указан",
      classificationConfidence: readNumber(item.classificationConfidence),
      classificationReasons: readStringArray(item.classificationReasons),
      included: decision?.included ?? null,
      decisionReason: decision?.reason ?? null,
      decisionLabel: adminInventoryDecisionLabel(decision?.included ?? null, decision?.reason ?? null),
      decisionPrimaryUrl: decision?.primaryUrl ?? null,
    };
  }) : [];
  const qaLabel = metadata?.qaLabel
    ?? readString(source.qaLabel)
    ?? readString(fullRecord?.qaLabel)
    ?? readString(asRecord(fullRecord?.metadata)?.qaLabel)
    ?? "Не указана";
  const offerRecord = asRecord(source.offerSnapshot) ?? asRecord(fullRecord?.offerSnapshot);
  const fallbackOffer = normalizeOfferSnapshot(offerRecord);
  const offerSnapshot = formatOfferSnapshot(metadata?.offerSnapshot ?? fallbackOffer)
    ?? readString(offerRecord?.id)
    ?? readString(source.offerSnapshot)
    ?? readString(fullRecord?.offerSnapshot)
    ?? "Не указан";

  return {
    clientPresentation,
    engineVersion: readString(source.engineVersion) ?? "Не указана",
    contractVersion: readNumber(source.contractVersion) ?? 2,
    coverageStatus,
    coverageLabel: coverageStatus === "sample_complete"
      ? "Все выбранные страницы проверены"
      : "Часть выбранных страниц не удалось проверить",
    pagesDiscovered: readNumber(source.pagesDiscovered) ?? 0,
    pagesEligible: readNumber(source.pagesEligible) ?? readNumber(inventory?.eligibleHtml) ?? 0,
    pagesExcluded: readNumber(source.pagesExcluded) ?? readNumber(inventory?.excludedHtml) ?? 0,
    pagesSelected: readNumber(source.pagesSelected) ?? selectedPages.length,
    pagesChecked: readNumber(source.pagesChecked) ?? 0,
    pagesNotCompleted: readNumber(source.pagesNotCompleted) ?? readNumber(inventory?.notCompleted) ?? 0,
    pagesNotCheckedTotal: readNumber(source.pagesNotCheckedTotal) ?? 0,
    inventorySummary: {
      objectsFound: readNumber(inventory?.objectsFound) ?? readNumber(source.pagesDiscovered) ?? 0,
      htmlFound: readNumber(inventory?.htmlFound) ?? readNumber(source.pagesDiscovered) ?? 0,
      eligibleHtml: readNumber(inventory?.eligibleHtml) ?? readNumber(source.pagesSelected) ?? 0,
      excludedHtml: readNumber(inventory?.excludedHtml) ?? readNumber(source.pagesExcluded) ?? 0,
      selected: readNumber(inventory?.selected) ?? readNumber(source.pagesSelected) ?? selectedPages.length,
      checked: readNumber(inventory?.checked) ?? readNumber(source.pagesChecked) ?? 0,
      notCompleted: readNumber(inventory?.notCompleted) ?? readNumber(source.pagesNotCompleted) ?? 0,
      outsideSample: readNumber(inventory?.outsideSample) ?? readNumber(source.pagesNotCheckedTotal) ?? 0,
      representedPageTypes: readNumber(inventory?.representedPageTypes) ?? new Set(selectedPages.map((page) => page.pageType)).size,
    },
    statusCounts: {
      pass: readNumber(summary?.pass) ?? checks.filter((check) => check.status === "pass").length,
      warning: readNumber(summary?.warning) ?? checks.filter((check) => check.status === "warning").length,
      fail: readNumber(summary?.fail) ?? checks.filter((check) => check.status === "fail").length,
      notApplicable: readNumber(summary?.not_applicable) ?? checks.filter((check) => check.status === "not_applicable").length,
      notRun: readNumber(summary?.not_run) ?? checks.filter((check) => check.status === "not_run").length,
      insufficientData: readNumber(summary?.insufficient_data) ?? checks.filter((check) => check.status === "insufficient_data").length,
      total: readNumber(summary?.totalChecks) ?? checks.length,
      completed: readNumber(summary?.completedChecks) ?? checks.filter((check) => ["pass", "warning", "fail"].includes(check.status)).length,
    },
    selectedPages,
    checkedPages,
    findings,
    technicalResources,
    inventory: inventoryObjects,
    limitations: readStringArray(source.limitations),
    checks,
    qaLabel,
    offerSnapshot,
  };
}

function isV4AuditSnapshot(value: Record<string, unknown> | null): boolean {
  return readNumber(value?.resultVersion) === 4 && readNumber(value?.contractVersion) === 3;
}

function isV3AuditSnapshot(value: Record<string, unknown> | null): boolean {
  const resultVersion = readNumber(value?.resultVersion);
  return readNumber(value?.contractVersion) === 2 && (resultVersion === null || resultVersion === 3);
}

function normalizeOfferSnapshot(value: Record<string, unknown> | null): AdminOfferSnapshot | null {
  if (!value) return null;
  const id = readString(value.id);
  const title = readString(value.title);
  if (!id || !title) return null;
  const price = readString(value.price);
  return { id, title, ...(price ? { price } : {}) };
}

function formatOfferSnapshot(value: AdminOfferSnapshot | null | undefined): string | null {
  if (!value) return null;
  return value.price ? `${value.title} · ${value.price}` : value.title;
}

function auditCheckStatusLabel(status: string): string {
  if (status === "pass") return "Пройдено";
  if (status === "warning") return "Есть замечание";
  if (status === "fail") return "Ошибка";
  if (status === "not_applicable") return "Не относится к объекту";
  if (status === "not_run") return "Замер не запускался";
  if (status === "insufficient_data") return "Результат не получен";
  return "Не определён";
}

function normalizedAuditCheckStatus(value: unknown): AuditCheckCopyInput["status"] {
  const status = readString(value);
  if (status === "pass" || status === "warning" || status === "fail" || status === "not_applicable" || status === "not_run" || status === "insufficient_data") return status;
  return "insufficient_data";
}

export function emailDeliveryView(input: {
  contactType: unknown;
  auditStatus: unknown;
  notificationStatus?: unknown;
  notificationError?: unknown;
  providerConfigured: boolean;
}): EmailDeliveryView {
  const isEmail = String(input.contactType ?? "") === "email";
  if (!isEmail) return { key: "not_required", label: "Не требуется", tone: "muted" };

  const notificationStatus = String(input.notificationStatus ?? "");
  const notificationError = String(input.notificationError ?? "");
  if (!input.providerConfigured || (notificationStatus === "skipped" && notificationError === "not_configured")) {
    return { key: "not_connected", label: "Не подключён", tone: "warning", detail: "Отправка писем не настроена" };
  }
  if (notificationStatus === "sent") return { key: "sent", label: "Передано почтовому серверу", tone: "success" };
  if (notificationStatus === "failed") {
    return { key: "failed", label: "Ошибка отправки", tone: "danger", detail: notificationError || undefined };
  }

  const terminal = ["completed", "partial", "failed"].includes(String(input.auditStatus ?? ""));
  return terminal
    ? { key: "failed", label: "Не отправлено", tone: "warning" }
    : { key: "waiting", label: "После завершения", tone: "progress" };
}

export type AuditPageView = {
  id: string;
  anchorId: string;
  url: string;
  statusCode: number | null;
  depth: number | null;
  title: string;
  description: string;
  h1Count: number | null;
  indexability: string;
  indexable: boolean | null;
  canonical: string;
  canonicalValid: boolean | null;
  issueCount: number;
  responseTimeMs: number | null;
  wordCount: number | null;
  missingAlt: number | null;
};

const severityLabels: Readonly<Record<string, string>> = {
  critical: "Критическая",
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
  info: "Информация",
};

const categoryLabels: Readonly<Record<string, string>> = {
  technicalIndexing: "Техническая доступность",
  structureOnPage: "Содержание и структура страницы",
  performanceMobile: "Скорость и мобильность",
  trustStructuredData: "Доверие и разметка",
  contentImages: "Контент и изображения",
};

export type AuditIssueView = {
  id: string;
  anchorId: string;
  severity: string;
  severityLabel: string;
  code: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  url: string | null;
  evidence: string;
  recommendation: string;
};

export function buildAuditIssueViews(storedIssues: unknown, fullResult: unknown): AuditIssueView[] {
  const stored = asRecordArray(storedIssues);
  const full = asRecordArray(asRecord(fullResult)?.issues);
  const sources = stored.length ? stored : full;

  return sources.map((source, index) => {
    const code = readString(source.code) ?? "unknown";
    const url = readString(source.url);
    const matchingFull = full.find((candidate) => {
      if (readString(candidate.code) !== code) return false;
      const candidateUrl = readString(candidate.url);
      return candidateUrl === url || candidateUrl === null || url === null;
    });
    const severity = readString(source.severity) ?? readString(matchingFull?.severity) ?? "medium";
    const category = readString(source.category) ?? readString(matchingFull?.category) ?? "other";
    return {
      id: readString(source.id) ?? `result-issue-${index + 1}`,
      anchorId: `issue-${index + 1}`,
      severity,
      severityLabel: severityLabels[severity] ?? "Не определена",
      code,
      category,
      categoryLabel: categoryLabels[category] ?? "Другое",
      title: readString(source.title) ?? readString(matchingFull?.title) ?? humanizeCode(code),
      description: readString(source.description) ?? readString(matchingFull?.description) ?? "Описание не сохранено",
      url,
      evidence: readString(source.evidence) ?? readString(matchingFull?.evidence) ?? "Доказательство не сохранено",
      recommendation: readString(source.recommendation) ?? readString(matchingFull?.recommendation) ?? "Рекомендация не сохранена",
    };
  });
}

export function readableEntries(value: unknown): Array<{ label: string; value: string }> {
  const output: Array<{ label: string; value: string }> = [];
  flattenReadable(value, "", output, 0);
  return output;
}

export type AuditIndexingView = {
  robotsLabel: string;
  robotsTone: DeliveryTone;
  robotsHttpStatus: number | null;
  declaredSitemaps: number;
  sitemapLabel: string;
  sitemapTone: DeliveryTone;
  sitemapFiles: number | null;
  sitemapUrls: number;
  sitemapErrors: number;
  indexablePages: number;
  noindexPages: number;
  unknownPages: number;
  canonicalProblems: number;
};

export function buildIndexingView(fullResult: unknown, pages: readonly AuditPageView[]): AuditIndexingView {
  const result = asRecord(fullResult);
  const robots = asRecord(result?.robots);
  const sitemap = asRecord(result?.sitemap);
  const robotsStatus = readString(robots?.status);
  const allowedRoot = readBoolean(robots?.allowedRoot);
  const sitemapStatus = readString(sitemap?.status);
  const robotsView = robotsStatus === "found" && allowedRoot === true
    ? { label: "Доступ разрешён", tone: "success" as const }
    : robotsStatus === "found" && allowedRoot === false
      ? { label: "Обход запрещён", tone: "danger" as const }
      : robotsStatus === "missing"
        ? { label: "Файл не найден", tone: "warning" as const }
        : robotsStatus === "error"
          ? { label: "Ошибка проверки", tone: "danger" as const }
          : { label: "Нет данных", tone: "muted" as const };
  const sitemapView = sitemapStatus === "found"
    ? { label: "Найдена", tone: "success" as const }
    : sitemapStatus === "missing"
      ? { label: "Не найдена", tone: "warning" as const }
      : sitemapStatus === "error"
        ? { label: "Ошибка проверки", tone: "danger" as const }
        : { label: "Нет данных", tone: "muted" as const };

  return {
    robotsLabel: robotsView.label,
    robotsTone: robotsView.tone,
    robotsHttpStatus: readNumber(robots?.httpStatus),
    declaredSitemaps: asArray(robots?.sitemapUrls).length,
    sitemapLabel: sitemapView.label,
    sitemapTone: sitemapView.tone,
    sitemapFiles: readNumber(sitemap?.filesVisited),
    sitemapUrls: asArray(sitemap?.urls).length,
    sitemapErrors: asArray(sitemap?.errors).length,
    indexablePages: pages.filter((page) => page.indexable === true).length,
    noindexPages: pages.filter((page) => page.indexable === false).length,
    unknownPages: pages.filter((page) => page.indexable === null).length,
    canonicalProblems: pages.filter((page) => page.canonicalValid === false).length,
  };
}

export type AuditPerformanceView = {
  available: boolean;
  score: number | null;
  accessibility: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  averageResponseMs: number | null;
  measuredPages: number;
};

export function buildPerformanceView(
  fullResult: unknown,
  pages: readonly Pick<AuditPageView, "responseTimeMs">[],
): AuditPerformanceView {
  const performance = asRecord(asRecord(fullResult)?.performance);
  const timings = pages
    .map((page) => page.responseTimeMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageResponseMs = timings.length
    ? Math.round(timings.reduce((sum, value) => sum + value, 0) / timings.length)
    : null;
  const score = normalizePercentage(readNumber(performance?.performance));
  const accessibility = normalizePercentage(readNumber(performance?.accessibility));
  const fcpMs = readNumber(performance?.fcpMs);
  const lcpMs = readNumber(performance?.lcpMs);
  const cls = readNumber(performance?.cls);
  const tbtMs = readNumber(performance?.tbtMs);
  return {
    available: [score, accessibility, fcpMs, lcpMs, cls, tbtMs, averageResponseMs].some((value) => value !== null),
    score,
    accessibility,
    fcpMs,
    lcpMs,
    cls,
    tbtMs,
    averageResponseMs,
    measuredPages: timings.length,
  };
}

export function buildAuditPageViews(storedPages: unknown, fullResult: unknown): AuditPageView[] {
  const stored = asRecordArray(storedPages);
  const resultPages = asRecordArray(asRecord(fullResult)?.pages);
  const sources: Record<string, unknown>[] = stored.length
    ? stored
    : resultPages.map((data, index) => ({
        id: `result-page-${index + 1}`,
        url: data.url,
        statusCode: data.status,
        depth: asRecord(data.transport)?.depth,
        data,
      }));

  return sources.map((source, index) => {
    const data = asRecord(source.data);
    const analysis = data ?? source;
    const title = asRecord(analysis.title);
    const description = asRecord(analysis.description);
    const h1 = asRecord(analysis.h1);
    const indexing = asRecord(analysis.indexing);
    const canonical = asRecord(analysis.canonical);
    const transport = asRecord(analysis.transport);
    const content = asRecord(analysis.content);
    const images = asRecord(analysis.images);
    const hasAnalysis = Boolean(data) || stored.length === 0;
    const noindex = readBoolean(indexing?.noindex);
    const nofollow = readBoolean(indexing?.nofollow);
    const indexable = noindex === null ? null : !noindex;
    const indexability = noindex === null
      ? "Не определено"
      : noindex
        ? "Закрыта noindex"
        : nofollow
          ? "index, nofollow"
          : "Открыта для индексации";

    return {
      id: readString(source.id) ?? `page-${index + 1}`,
      anchorId: `page-${index + 1}`,
      url: readString(source.url) ?? readString(analysis.url) ?? "—",
      statusCode: readNumber(source.statusCode) ?? readNumber(analysis.status),
      depth: readNumber(source.depth) ?? readNumber(transport?.depth),
      title: readString(title?.value) ?? (hasAnalysis ? "Не задан" : "Нет данных"),
      description: readString(description?.value) ?? (hasAnalysis ? "Не задано" : "Нет данных"),
      h1Count: readNumber(h1?.count),
      indexability,
      indexable,
      canonical: readString(canonical?.url) ?? "Не задан",
      canonicalValid: readBoolean(canonical?.valid),
      issueCount: asRecordArray(analysis.issues).length,
      responseTimeMs: readNumber(transport?.responseTimeMs),
      wordCount: readNumber(content?.wordCount),
      missingAlt: readNumber(images?.missingAlt),
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    const text = readString(item);
    return text ? [text] : [];
  }) : [];
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function humanizeCode(value: string): string {
  const text = value.replace(/[_-]+/gu, " ").trim();
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "Проблема без названия";
}

function adminPageTypeLabel(value: string | null): string {
  const labels: Readonly<Record<string, string>> = {
    homepage: "Главная",
    service: "Услуга",
    category: "Раздел",
    product: "Карточка товара",
    article: "Статья",
    case: "Кейс",
    pricing: "Цены",
    contact: "Контакты",
    legal: "Правовая информация",
    auth: "Вход",
    account: "Личный кабинет",
    cart: "Корзина",
    internal_search: "Поиск по сайту",
    filter: "Фильтр",
    utility: "Служебная страница",
    commercial: "Коммерческая страница",
    conversion_support: "Страница обращения",
    hub: "Страница раздела",
    detail: "Детальная страница",
    unique: "Отдельный шаблон",
    alternate_locale: "Другая языковая версия",
    unknown: "Тип не определён",
  };
  return value ? labels[value] ?? value : "Не определён";
}

function adminSelectedPageTypeLabel(pageType: string | null, selectionReason: string | null, pageLocale: string | null): string {
  if (selectionReason === "primary_locale_type_missing") {
    if (pageLocale === "en" && (pageType === "commercial" || pageType === "service")) return "Англоязычная страница услуги";
    if (pageType === "commercial" || pageType === "service") return "Страница услуги на другом языке";
    return "Страница на другом языке";
  }
  return adminPageTypeLabel(pageType);
}

function adminSelectionReasonLabel(value: string | null): string {
  const labels: Readonly<Record<string, string>> = {
    homepage: "Главная страница",
    primary_commercial: "Основная коммерческая страница",
    commercial_different_template: "Другой коммерческий шаблон",
    conversion_support: "Страница, ведущая к обращению",
    category_hub: "Страница раздела",
    detail_page: "Детальная страница",
    case_page: "Кейс",
    article_page: "Статья",
    unique_template: "Отдельный шаблон",
    additional_important: "Дополнительная значимая страница",
    alternate_locale_control: "Контроль другой языковой версии",
    primary_locale_type_missing: "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена",
    user_target: "Адрес указан пользователем",
    priority_url: "Приоритетный адрес",
  };
  return value ? labels[value] ?? value : "Причина выбора не сохранена";
}

function adminResourceTypeLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    html: "Страница сайта (HTML)",
    robots: "robots.txt",
    sitemap: "sitemap.xml",
    xml_feed: "XML-фид",
    document: "Документ",
    image: "Изображение",
    script: "Скрипт",
    stylesheet: "Таблица стилей",
    api: "Ответ API",
    unknown: "Неизвестный ресурс",
  };
  return labels[value] ?? value;
}

function adminInventoryDecisionLabel(included: boolean | null, reason: string | null): string {
  if (included) return adminSelectionReasonLabel(reason);
  const labels: Readonly<Record<string, string>> = {
    technical_resource: "Технический файл проверяется отдельно",
    not_selected_within_limit: "Подходит для проверки, но не вошла в лимит 10 страниц",
    not_selected_similar_template: "Подходит для проверки, но не выбрана из-за похожего шаблона",
    excluded_by_sampling_rules: "Не подходит для бесплатной выборки",
    tracking_query: "Адрес с рекламной меткой не расходует бесплатный лимит",
    filter_query: "Вариант фильтра или сортировки не расходует бесплатный лимит",
  };
  if (reason?.startsWith("excluded_by_sampling_rules:")) {
    const exclusionReason = reason.slice("excluded_by_sampling_rules:".length);
    const exclusionLabels: Readonly<Record<string, string>> = {
      search_page: "Исключена до выборки: страница поиска",
      closed_section: "Исключена до выборки: закрытый раздел",
      technical_page: "Исключена до выборки: юридическая или служебная страница",
      parameterized_url: "Исключена до выборки: URL с параметрами",
      redirect: "Исключена до выборки: перенаправление",
      confirmed_duplicate: "Исключена до выборки: подтверждённый дубликат",
      service_url: "Исключена до выборки: служебный URL (старый снимок)",
      technical_object: "Исключена до выборки: технический объект (старый снимок)",
      duplicate_template: "Исключена до выборки: дубликат шаблона (старый снимок)",
      other: "Исключена до выборки: другая сохранённая причина",
    };
    return exclusionLabels[exclusionReason] ?? `Исключена до выборки: ${humanizeCode(exclusionReason)}`;
  }
  if (reason) return labels[reason] ?? humanizeCode(reason);
  return included === false ? "Причина исключения не сохранена" : "Решение по адресу не сохранено";
}

function adminInventoryUrlKey(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return value;
  }
}

function adminComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
    return url.href;
  } catch {
    return value;
  }
}

function adminInventoryDecisionKey(requestedUrl: string, finalUrl: string): string {
  return `${adminInventoryUrlKey(requestedUrl)}\u0000${adminInventoryUrlKey(finalUrl)}`;
}

function normalizePercentage(value: number | null): number | null {
  if (value === null) return null;
  const percent = value <= 1 ? value * 100 : value;
  return Math.round(Math.max(0, Math.min(100, percent)));
}

function flattenReadable(
  value: unknown,
  prefix: string,
  output: Array<{ label: string; value: string }>,
  depth: number,
): void {
  const record = depth < 3 ? asRecord(value) : null;
  if (record) {
    for (const [key, nested] of Object.entries(record)) {
      flattenReadable(nested, prefix ? `${prefix}.${key}` : key, output, depth + 1);
    }
    return;
  }
  output.push({ label: prefix || "Значение", value: readableValue(value) });
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(readableValue).join(", ") || "—";
  return "Данные сохранены в старом формате";
}
