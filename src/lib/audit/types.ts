export type AuditCategory =
  | "technicalIndexing"
  | "structureOnPage"
  | "performanceMobile"
  | "trustStructuredData"
  | "contentImages";

export type AuditIssueSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface AuditIssue {
  readonly code: string;
  readonly category: AuditCategory;
  readonly severity: AuditIssueSeverity;
  readonly title: string;
  readonly description: string;
  readonly recommendation: string;
  readonly url?: string;
}

export interface TextSignal {
  readonly value: string | null;
  readonly present: boolean;
  readonly length: number;
  readonly optimal: boolean;
}

export interface PageAnalysis {
  readonly url: string;
  readonly status: number;
  readonly title: TextSignal;
  readonly description: TextSignal;
  readonly h1: {
    readonly count: number;
    readonly values: readonly string[];
  };
  readonly headingStructure?: {
    readonly h2Count: number;
    readonly h3Count: number;
    readonly hierarchyValid: boolean;
  };
  readonly canonical: {
    readonly url: string | null;
    readonly valid: boolean;
    readonly selfReferential: boolean | null;
  };
  readonly indexing: {
    readonly noindex: boolean;
    readonly nofollow: boolean;
  };
  readonly language: {
    readonly present: boolean;
    readonly value: string | null;
  };
  readonly viewport: boolean;
  readonly charset: string | null;
  readonly links: {
    readonly internalCount: number;
    readonly externalCount: number;
    readonly internalUrls: readonly string[];
    readonly parameterizedCount?: number;
  };
  readonly images: {
    readonly total: number;
    readonly withAlt: number;
    readonly missingAlt: number;
    readonly emptyAlt: number;
    readonly missingDimensions?: number;
  };
  readonly structuredData: {
    readonly total: number;
    readonly valid: number;
    readonly invalid: number;
    readonly types: readonly string[];
  };
  readonly openGraph: {
    readonly title: string | null;
    readonly description: string | null;
    readonly image: string | null;
    readonly url: string | null;
    readonly coverage: number;
  };
  readonly securityHeaders: {
    readonly present: readonly string[];
    readonly missing: readonly string[];
  };
  readonly content?: {
    readonly wordCount: number;
    readonly thin: boolean;
  };
  readonly favicon?: boolean;
  readonly mixedContent?: {
    readonly count: number;
  };
  readonly forms?: {
    readonly total: number;
    readonly getMethodCount: number;
    readonly controls: number;
    readonly labeledControls: number;
    readonly visibleConsent: boolean;
  };
  readonly transport?: {
    readonly requestedUrl: string;
    readonly finalUrl: string;
    readonly redirects: readonly string[];
    readonly responseTimeMs: number | null;
    readonly depth: number;
  };
  readonly issues: readonly AuditIssue[];
}

export type AuditEvent =
  | { readonly type: "audit:start" }
  | { readonly type: "discovery:start" }
  | { readonly type: "discovery:robots_complete" }
  | { readonly type: "discovery:sitemaps_complete" }
  | { readonly type: "discovery:complete" }
  | {
      readonly type: "crawl:page";
      readonly pagesChecked: number;
      readonly pagesDiscovered: number;
    }
  | {
      readonly type: "crawl:progress";
      readonly crawled: number;
      readonly queued: number;
      readonly pagesChecked: number;
      readonly pagesDiscovered: number;
      readonly limit: number;
    }
  | { readonly type: "warning"; readonly code: string }
  | {
      readonly type: "audit:complete";
      readonly score: number;
      readonly pages: number;
      readonly pagesChecked: number;
      readonly pagesDiscovered: number;
      readonly partial: boolean;
    };

export interface RobotsInfo {
  readonly url: string;
  readonly status: "found" | "missing" | "error";
  readonly httpStatus: number | null;
  readonly allowedRoot: boolean | null;
  readonly sitemapUrls: readonly string[];
  readonly body?: string;
  readonly error?: string;
}

export interface SitemapInfo {
  readonly status: "found" | "missing" | "error";
  readonly filesVisited: number;
  readonly urls: readonly string[];
  readonly errors: readonly string[];
}

/** Optional Lighthouse/PageSpeed observations for the audited landing page. */
export interface PerformanceAuditInput {
  /** Lighthouse Performance score, accepted as 0..1 or 0..100. */
  readonly performance?: number | null;
  /** First Contentful Paint in milliseconds. */
  readonly fcpMs?: number | null;
  /** Largest Contentful Paint in milliseconds. */
  readonly lcpMs?: number | null;
  /** Cumulative Layout Shift, unitless. */
  readonly cls?: number | null;
  /** Total Blocking Time in milliseconds. */
  readonly tbtMs?: number | null;
  /** Lighthouse Accessibility score, accepted as 0..1 or 0..100. */
  readonly accessibility?: number | null;
}

export interface CategoryScore {
  readonly category: AuditCategory;
  readonly score: number;
  readonly maxScore: number;
  /** 0..1 fraction of weighted checks backed by observations. */
  readonly coverage: number;
  readonly partial: boolean;
  readonly checks: readonly ScoreCheckResult[];
}

export interface ScoreCheckResult {
  readonly id: string;
  readonly label: string;
  readonly value: number | null;
  readonly weight: number;
  readonly applicable: boolean;
  /** 0..1 observation coverage for this check. */
  readonly coverage: number;
}

export interface AuditScore {
  readonly total: number;
  readonly maxScore: 100;
  readonly coverage: number;
  readonly partial: boolean;
  readonly categories: Readonly<Record<AuditCategory, CategoryScore>>;
}

export type AuditGrade = "A" | "B" | "C" | "D" | "E";
export type PublicAuditCheckStatus = "checked" | "not_checked";
export type PublicAuditRisk = "low" | "medium" | "high" | "not_checked";

export interface PublicAuditCategory {
  readonly name: string;
  readonly risk: PublicAuditRisk;
  readonly status: PublicAuditCheckStatus;
  readonly explanation: string;
  readonly reason?: string;
}

export interface PublicAuditCoverage {
  /** Hard ceiling for one public audit run. */
  readonly pageLimit: number;
  /** Reachable sample target: min(pageLimit, pagesDiscovered). */
  readonly plannedPages: number;
  readonly checkedPages: number;
  /** checkedPages / plannedPages, never checkedPages / whole site. */
  readonly ratio: number;
}

export interface PublicAuditIssueCounts extends Readonly<Record<AuditIssueSeverity, number>> {
  readonly total: number;
}

export interface PublicAuditSummary {
  readonly headline: string;
  readonly facts: readonly string[];
}

export interface PublicAuditIssueEvidence {
  readonly url?: string;
  readonly observation: string;
}

export interface PublicAuditIssueGroup {
  readonly code: string;
  readonly category: AuditCategory;
  readonly severity: AuditIssueSeverity;
  readonly title: string;
  readonly why: string;
  readonly fix: string;
  readonly acceptance: string;
  readonly affectedCount: number;
  readonly affectedUrls: readonly string[];
  readonly evidence: readonly PublicAuditIssueEvidence[];
}

export interface PublicAuditPageResult {
  readonly url: string;
  readonly finalUrl: string;
  readonly http: {
    readonly status: number;
    readonly ok: boolean;
    readonly redirectCount: number;
  };
  readonly title: Pick<TextSignal, "value" | "present" | "length" | "optimal">;
  readonly description: Pick<TextSignal, "value" | "present" | "length" | "optimal">;
  readonly h1: {
    readonly count: number;
    readonly values: readonly string[];
  };
  readonly noindex: boolean;
  readonly canonical: {
    readonly url: string | null;
    readonly valid: boolean;
    readonly selfReferential: boolean | null;
  };
  readonly sitemap:
    | { readonly status: "checked"; readonly included: boolean }
    | { readonly status: "not_checked"; readonly included: null; readonly reason: string };
  readonly internalLinks: {
    readonly outgoing: number;
    readonly incomingFromCheckedPages: number;
  };
}

export type PublicAuditIndexability =
  | {
      readonly status: "checked";
      readonly checkedPages: number;
      readonly indexablePages: number;
      readonly noindexPages: number;
      readonly httpErrorPages: number;
      readonly ratio: number;
    }
  | {
      readonly status: "not_checked";
      readonly checkedPages: 0;
      readonly indexablePages: 0;
      readonly noindexPages: 0;
      readonly httpErrorPages: 0;
      readonly ratio: null;
      readonly reason: string;
    };

export interface PublicAuditResult {
  readonly resultVersion: number;
  /** Query and fragment are intentionally removed from every public URL. */
  readonly finalUrl: string;
  readonly score: number;
  readonly grade: AuditGrade;
  readonly interpretation: string;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly partial: boolean;
  readonly coverage: PublicAuditCoverage;
  readonly issueCounts: PublicAuditIssueCounts;
  readonly summary: PublicAuditSummary;
  readonly categories: readonly PublicAuditCategory[];
  readonly issueGroups: readonly PublicAuditIssueGroup[];
  readonly checkedPages: readonly PublicAuditPageResult[];
  readonly indexability: PublicAuditIndexability;
  /** Bounded public-safe sample; pagesDiscovered remains the complete count. */
  readonly uncheckedUrls: readonly string[];
}

export interface FullAuditResult {
  readonly resultVersion: number;
  readonly targetUrl: string;
  readonly finalUrl: string;
  readonly pageLimit: number;
  readonly score: AuditScore;
  readonly grade: AuditGrade;
  readonly interpretation: string;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly partial: boolean;
  /** 0..1 combined signal and crawl coverage. */
  readonly coverage: number;
  readonly issueCounts: Readonly<Record<AuditIssueSeverity, number>>;
  readonly pages: readonly PageAnalysis[];
  readonly discoveredUrls: readonly string[];
  readonly issues: readonly AuditIssue[];
  readonly robots: RobotsInfo;
  readonly sitemap: SitemapInfo;
  readonly performance: PerformanceAuditInput | null;
  readonly startedAt: string;
  readonly finishedAt: string;
}
