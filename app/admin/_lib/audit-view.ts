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
  calculating_score: "Расчёт оценки",
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
  if (notificationStatus === "sent") return { key: "sent", label: "Отправлено", tone: "success" };
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
