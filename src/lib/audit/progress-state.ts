export const AUDIT_PROGRESS_STATUSES = [
  "queued",
  "validating_target",
  "connecting",
  "checking_robots",
  "checking_sitemaps",
  "discovering_pages",
  "crawling_pages",
  "analyzing_structure",
  "running_performance",
  "finalizing_report",
  "calculating_score",
  "completed",
  "partial",
  "failed",
] as const;

export type AuditProgressStatus = typeof AUDIT_PROGRESS_STATUSES[number];
export type AuditConnectionState = "live" | "polling";
export type AuditLoadError = "not-found" | "unavailable" | null;

export type AuditProgressSelectedPage = {
  url: string;
  pageType: string;
  selectionReason: string;
};

export type AuditProgressEvent = {
  kind: string;
  path?: string;
  pageType?: string;
  createdAt?: string;
};

export type AuditProgressSnapshot = {
  status: AuditProgressStatus;
  pagesChecked: number;
  pagesDiscovered: number;
  pageLimit: number;
  pagesEligible?: number;
  pagesSelected?: number;
  selectedPages?: readonly AuditProgressSelectedPage[];
  checkedUrls?: readonly string[];
  failedUrls?: readonly string[];
  selectionComplete?: boolean;
  technicalFilesChecked?: number;
  robotsStatus?: "found" | "missing" | "error";
  sitemapStatus?: "found" | "missing" | "error";
  currentUrl?: string;
  currentPageType?: string;
  eventKind?: string;
  eventCreatedAt?: string;
  recentEvents?: readonly AuditProgressEvent[];
  coverageStatus?: "sample_complete" | "sample_partial";
  result?: unknown | null;
  normalizedDomain?: string;
  createdAt?: number;
  completedAt?: number | null;
  consentRecorded?: boolean;
  errorSummary?: string | null;
};

const STATUS_VALUES = new Set<string>(AUDIT_PROGRESS_STATUSES);
const TERMINAL_STATUSES = new Set<AuditProgressStatus>(["completed", "partial", "failed"]);
const RECONNECT_DELAYS_MS = [3_000, 5_000, 10_000] as const;

export function mergeAuditSnapshot<T extends AuditProgressSnapshot>(current: T | null, next: T): T {
  if (!current) return next;
  if (TERMINAL_STATUSES.has(current.status) && current.status !== next.status) return current;

  const checkedUrls = mergeProgressUrls(current.checkedUrls, next.checkedUrls);
  const failedUrls = mergeProgressUrls(current.failedUrls, next.failedUrls)
    .filter((url) => !checkedUrls.includes(url));
  return {
    ...current,
    ...next,
    pagesChecked: Math.max(current.pagesChecked, next.pagesChecked),
    pagesDiscovered: Math.max(current.pagesDiscovered, next.pagesDiscovered),
    ...(current.pagesSelected !== undefined || next.pagesSelected !== undefined
      ? { pagesSelected: Math.max(current.pagesSelected ?? 0, next.pagesSelected ?? 0) }
      : {}),
    ...(current.pagesEligible !== undefined || next.pagesEligible !== undefined
      ? { pagesEligible: Math.max(current.pagesEligible ?? 0, next.pagesEligible ?? 0) }
      : {}),
    ...(current.technicalFilesChecked !== undefined || next.technicalFilesChecked !== undefined
      ? { technicalFilesChecked: Math.max(current.technicalFilesChecked ?? 0, next.technicalFilesChecked ?? 0) }
      : {}),
    ...(current.selectionComplete || next.selectionComplete ? { selectionComplete: true } : {}),
    ...(next.selectedPages?.length ? { selectedPages: next.selectedPages } : current.selectedPages?.length ? { selectedPages: current.selectedPages } : {}),
    ...(current.checkedUrls !== undefined || next.checkedUrls !== undefined ? { checkedUrls } : {}),
    ...(current.failedUrls !== undefined || next.failedUrls !== undefined ? { failedUrls } : {}),
    recentEvents: mergeRecentEvents(current.recentEvents, next.recentEvents),
    ...(current.result != null ? { result: current.result } : {}),
  } as T;
}

export function decodeAuditSnapshotJson(value: string): AuditProgressSnapshot | null {
  try {
    return decodeAuditSnapshot(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
}

export function decodeAuditSnapshot(value: unknown): AuditProgressSnapshot | null {
  if (!isRecord(value) || typeof value.status !== "string" || !STATUS_VALUES.has(value.status)) return null;
  const pagesChecked = nonNegativeInteger(value.pagesChecked);
  const pagesDiscovered = nonNegativeInteger(value.pagesDiscovered);
  const pageLimit = boundedInteger(value.pageLimit, 1, 100);
  if (pagesChecked === null || pagesDiscovered === null || pageLimit === null || pagesChecked > pagesDiscovered) return null;

  const snapshot: AuditProgressSnapshot = {
    status: value.status as AuditProgressStatus,
    pagesChecked,
    pagesDiscovered,
    pageLimit,
  };
  if (value.pagesSelected !== undefined) {
    const pagesSelected = nonNegativeInteger(value.pagesSelected);
    if (pagesSelected === null || pagesSelected < pagesChecked || pagesSelected > pagesDiscovered) return null;
    snapshot.pagesSelected = pagesSelected;
  }
  if (value.pagesEligible !== undefined) {
    const pagesEligible = nonNegativeInteger(value.pagesEligible);
    if (pagesEligible === null || pagesEligible > pagesDiscovered || pagesEligible < (snapshot.pagesSelected ?? pagesChecked)) return null;
    snapshot.pagesEligible = pagesEligible;
  }
  if (value.selectedPages !== undefined) {
    if (!Array.isArray(value.selectedPages)) return null;
    const selectedPages = value.selectedPages.slice(0, 10).flatMap(decodeSelectedPage);
    if (selectedPages.length !== Math.min(value.selectedPages.length, 10)) return null;
    snapshot.selectedPages = selectedPages;
  }
  const checkedUrls = decodeProgressUrls(value.checkedUrls, pageLimit);
  const failedUrls = decodeProgressUrls(value.failedUrls, pageLimit)
    .filter((url) => !checkedUrls.includes(url));
  if (checkedUrls.length) snapshot.checkedUrls = checkedUrls;
  if (failedUrls.length) snapshot.failedUrls = failedUrls.slice(0, Math.max(0, pageLimit - checkedUrls.length));
  if (value.selectionComplete !== undefined) {
    if (typeof value.selectionComplete !== "boolean") return null;
    snapshot.selectionComplete = value.selectionComplete;
  }
  if (value.technicalFilesChecked !== undefined) {
    const technicalFilesChecked = boundedInteger(value.technicalFilesChecked, 0, 21);
    if (technicalFilesChecked === null) return null;
    snapshot.technicalFilesChecked = technicalFilesChecked;
  }
  if (value.robotsStatus !== undefined) {
    if (value.robotsStatus !== "found" && value.robotsStatus !== "missing" && value.robotsStatus !== "error") return null;
    snapshot.robotsStatus = value.robotsStatus;
  }
  if (value.sitemapStatus !== undefined) {
    if (value.sitemapStatus !== "found" && value.sitemapStatus !== "missing" && value.sitemapStatus !== "error") return null;
    snapshot.sitemapStatus = value.sitemapStatus;
  }
  if (value.currentUrl !== undefined) {
    const currentUrl = safeProgressUrl(value.currentUrl);
    if (!currentUrl) return null;
    snapshot.currentUrl = currentUrl;
  }
  if (value.currentPageType !== undefined) {
    if (typeof value.currentPageType !== "string" || !/^[a-z_]{2,40}$/u.test(value.currentPageType)) return null;
    snapshot.currentPageType = value.currentPageType;
  }
  if (value.eventKind !== undefined) {
    if (typeof value.eventKind !== "string" || !/^[a-z_]{2,60}$/u.test(value.eventKind)) return null;
    snapshot.eventKind = value.eventKind;
  }
  if (value.eventCreatedAt !== undefined) {
    if (typeof value.eventCreatedAt !== "string" || Number.isNaN(Date.parse(value.eventCreatedAt))) return null;
    snapshot.eventCreatedAt = value.eventCreatedAt;
  }
  if (value.recentEvents !== undefined) {
    if (!Array.isArray(value.recentEvents)) return null;
    const recentEvents = value.recentEvents.slice(-3).flatMap(decodeProgressEvent);
    if (recentEvents.length !== Math.min(value.recentEvents.length, 3)) return null;
    snapshot.recentEvents = recentEvents;
  }
  if (value.coverageStatus !== undefined) {
    if (value.coverageStatus !== "sample_complete" && value.coverageStatus !== "sample_partial") return null;
    snapshot.coverageStatus = value.coverageStatus;
  }
  if (value.result !== undefined) {
    if (value.result !== null && !isRecord(value.result)) return null;
    snapshot.result = value.result;
  }
  if (value.normalizedDomain !== undefined) {
    if (typeof value.normalizedDomain !== "string" || value.normalizedDomain.length > 253) return null;
    snapshot.normalizedDomain = value.normalizedDomain;
  }
  if (value.createdAt !== undefined) {
    const createdAt = nonNegativeInteger(value.createdAt);
    if (createdAt === null) return null;
    snapshot.createdAt = createdAt;
  }
  if (value.completedAt !== undefined) {
    const completedAt = value.completedAt === null ? null : nonNegativeInteger(value.completedAt);
    if (completedAt === null && value.completedAt !== null) return null;
    snapshot.completedAt = completedAt;
  }
  if (value.consentRecorded !== undefined) {
    if (typeof value.consentRecorded !== "boolean") return null;
    snapshot.consentRecorded = value.consentRecorded;
  }
  if (value.errorSummary !== undefined) {
    if (value.errorSummary !== null && typeof value.errorSummary !== "string") return null;
    snapshot.errorSummary = value.errorSummary;
  }
  if (snapshot.eventKind) {
    snapshot.recentEvents = mergeRecentEvents(snapshot.recentEvents, [{
      kind: snapshot.eventKind,
      ...(snapshot.currentUrl ? { path: progressPath(snapshot.currentUrl) } : {}),
      ...(snapshot.currentPageType ? { pageType: snapshot.currentPageType } : {}),
      ...(snapshot.eventCreatedAt ? { createdAt: snapshot.eventCreatedAt } : {}),
    }]);
  }
  return snapshot;
}

function decodeProgressEvent(value: unknown): AuditProgressEvent[] {
  if (!isRecord(value) || typeof value.kind !== "string" || !/^[a-z_]{2,60}$/u.test(value.kind)) return [];
  const event: AuditProgressEvent = { kind: value.kind };
  if (value.path !== undefined) {
    if (typeof value.path !== "string" || !value.path.startsWith("/") || value.path.length > 2_048) return [];
    event.path = value.path.split(/[?#]/u, 1)[0] || "/";
  }
  if (value.pageType !== undefined) {
    if (typeof value.pageType !== "string" || !/^[a-z_]{2,40}$/u.test(value.pageType)) return [];
    event.pageType = value.pageType;
  }
  if (value.createdAt !== undefined) {
    if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) return [];
    event.createdAt = value.createdAt;
  }
  return [event];
}

function decodeSelectedPage(value: unknown): AuditProgressSelectedPage[] {
  if (!isRecord(value)) return [];
  const url = safeProgressUrl(value.url);
  if (!url || typeof value.pageType !== "string" || typeof value.selectionReason !== "string") return [];
  if (!/^[a-z_]{2,40}$/u.test(value.pageType) || !/^[a-z_]{2,60}$/u.test(value.selectionReason)) return [];
  return [{ url, pageType: value.pageType, selectionReason: value.selectionReason }];
}

function safeProgressUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function decodeProgressUrls(value: unknown, maximum: number): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) return [];
  return [...new Set(value.flatMap((item) => {
    const url = safeProgressUrl(item);
    return url ? [url] : [];
  }))];
}

function mergeProgressUrls(current: readonly string[] | undefined, next: readonly string[] | undefined): string[] {
  return [...new Set([...(current ?? []), ...(next ?? [])])];
}

function progressPath(value: string): string {
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value;
  }
}

function mergeRecentEvents(
  current: readonly AuditProgressEvent[] | undefined,
  next: readonly AuditProgressEvent[] | undefined,
): AuditProgressEvent[] {
  const byKey = new Map<string, AuditProgressEvent>();
  for (const item of [...(current ?? []), ...(next ?? [])]) {
    const key = `${item.kind}|${item.path ?? ""}|${item.pageType ?? ""}`;
    const previous = byKey.get(key);
    if (previous) byKey.delete(key);
    byKey.set(key, {
      ...previous,
      ...item,
      ...(item.createdAt ?? previous?.createdAt ? { createdAt: item.createdAt ?? previous?.createdAt } : {}),
    });
  }
  return [...byKey.values()].slice(-3);
}

export function auditNeedsResult(snapshot: AuditProgressSnapshot | null): boolean {
  return Boolean(snapshot && (snapshot.status === "completed" || snapshot.status === "partial") && !snapshot.result);
}

export function shouldCloseStream(snapshot: AuditProgressSnapshot | null): boolean {
  return Boolean(snapshot && TERMINAL_STATUSES.has(snapshot.status));
}

export function shouldPoll(connection: AuditConnectionState, snapshot: AuditProgressSnapshot | null, loadError: AuditLoadError): boolean {
  if (connection !== "polling" || loadError === "not-found") return false;
  if (!snapshot) return true;
  if (snapshot.status === "failed") return false;
  return !TERMINAL_STATUSES.has(snapshot.status) || auditNeedsResult(snapshot);
}

export function nextReconnectDelay(attempt: number): number {
  const index = Math.max(0, Math.min(RECONNECT_DELAYS_MS.length - 1, Math.floor(attempt)));
  return RECONNECT_DELAYS_MS[index];
}

export function auditStreamDirective(event: "done" | "reconnect" | "error"): { close: true; refreshSnapshot: boolean } {
  return { close: true, refreshSnapshot: event === "done" };
}

function nonNegativeInteger(value: unknown): number | null {
  return boundedInteger(value, 0, Number.MAX_SAFE_INTEGER);
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
