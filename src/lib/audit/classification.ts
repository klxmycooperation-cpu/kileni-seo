import type { PageAnalysis } from "./types";
import type { AuditDiscoverySource } from "./sample-selector";

export type AuditResourceType =
  | "html"
  | "robots"
  | "sitemap"
  | "xml_feed"
  | "document"
  | "image"
  | "script"
  | "stylesheet"
  | "api"
  | "unknown";

export type AuditHtmlPageType =
  | "homepage"
  | "about"
  | "service"
  | "category"
  | "product"
  | "article"
  | "case"
  | "pricing"
  | "contact"
  | "legal"
  | "auth"
  | "account"
  | "cart"
  | "internal_search"
  | "filter"
  | "utility"
  | "unknown";

export type AuditAuthSignal =
  | "password_input"
  | "login_form"
  | "restricted_status"
  | "login_redirect"
  | "protected_route"
  | "auth_schema"
  | "confirmed_auth_template";

export type AuditIndexabilitySignal =
  | "meta_noindex"
  | "meta_nofollow"
  | "canonical_present"
  | "canonical_missing"
  | "robots_allowed"
  | "robots_blocked"
  | "sitemap_listed";

export interface ClassifyAuditObjectInput {
  readonly url: string;
  readonly finalUrl?: string;
  readonly contentType?: string | null;
  readonly statusCode?: number | null;
  readonly title?: string | null;
  readonly h1?: readonly string[];
  readonly schemaTypes?: readonly string[];
  readonly language?: string | null;
  readonly templateSignature?: string | null;
  readonly contentFingerprint?: string | null;
  readonly depth?: number;
  readonly noindex?: boolean;
  readonly nofollow?: boolean;
  readonly canonicalUrl?: string | null;
  readonly robotsAllowed?: boolean | null;
  readonly fromSitemap?: boolean;
  readonly redirects?: readonly string[];
  readonly passwordInputCount?: number;
  readonly loginForm?: boolean;
  readonly confirmedProtectedRoute?: boolean;
  readonly confirmedAuthTemplate?: boolean;
  readonly resourceHint?: AuditResourceType;
  readonly discoverySource?: AuditDiscoverySource;
}

export interface ClassifiedAuditObject {
  readonly url: string;
  readonly finalUrl: string;
  readonly resourceType: AuditResourceType;
  readonly pageType: AuditHtmlPageType | null;
  readonly language: string | null;
  readonly templateFamily: string;
  readonly contentFingerprint?: string | null;
  readonly depth: number;
  readonly statusCode: number | null;
  readonly contentType: string | null;
  readonly indexabilitySignals: readonly AuditIndexabilitySignal[];
  readonly authSignals: readonly AuditAuthSignal[];
  readonly canonicalUrl?: string | null;
  readonly classificationConfidence: number;
  readonly classificationReasons: readonly string[];
  readonly discoverySource?: AuditDiscoverySource;
}

type PageScore = {
  score: number;
  reasons: string[];
};

const PAGE_TYPES: readonly AuditHtmlPageType[] = [
  "homepage",
  "about",
  "service",
  "category",
  "product",
  "article",
  "case",
  "pricing",
  "contact",
  "legal",
  "auth",
  "account",
  "cart",
  "internal_search",
  "filter",
  "utility",
];

export function classifyAuditObject(input: ClassifyAuditObjectInput): ClassifiedAuditObject {
  const requested = normalizeUrl(input.url);
  const final = normalizeUrl(input.finalUrl ?? input.url);
  const contentType = normalizeContentType(input.contentType);
  const resource = classifyResource(final, contentType, input.resourceHint);
  const authSignals = collectAuthSignals(input, final);
  const indexabilitySignals = collectIndexabilitySignals(input);
  const base = {
    url: requested.href,
    finalUrl: final.href,
    resourceType: resource.type,
    language: normalizeLanguage(input.language, final.pathname),
    depth: normalizeDepth(input.depth, final.pathname),
    statusCode: normalizeStatus(input.statusCode),
    contentType,
    indexabilitySignals,
    authSignals,
    canonicalUrl: normalizeOptionalUrl(input.canonicalUrl, final),
    contentFingerprint: input.contentFingerprint ?? null,
    ...(input.discoverySource ? { discoverySource: input.discoverySource } : {}),
  } as const;

  if (resource.type !== "html") {
    return Object.freeze({
      ...base,
      pageType: null,
      templateFamily: resource.type,
      classificationConfidence: resource.confidence,
      classificationReasons: Object.freeze(resource.reasons),
    });
  }

  const classifiedPage = classifyHtmlPage(input, final, authSignals);
  const observedTemplate = normalizeTemplate(input.templateSignature);
  const templateFamily = observedTemplate
    ? observedTemplate.startsWith("dom-")
      ? `${classifiedPage.pageType}:${observedTemplate}`
      : observedTemplate
    : inferTemplateFamily(classifiedPage.pageType, final.pathname);
  return Object.freeze({
    ...base,
    pageType: classifiedPage.pageType,
    templateFamily,
    classificationConfidence: classifiedPage.confidence,
    classificationReasons: Object.freeze(classifiedPage.reasons),
  });
}

export function classifyAnalyzedPage(
  page: PageAnalysis,
  context: { readonly robotsAllowed?: boolean | null; readonly fromSitemap?: boolean; readonly discoverySource?: AuditDiscoverySource } = {},
): ClassifiedAuditObject {
  return classifyAuditObject({
    url: page.transport?.requestedUrl ?? page.url,
    finalUrl: page.transport?.finalUrl ?? page.url,
    contentType: page.transport?.contentType ?? "text/html",
    statusCode: page.status,
    title: page.title.value,
    h1: page.h1.values,
    schemaTypes: page.structuredData.types,
    language: page.language.value,
    templateSignature: page.templateSignature,
    contentFingerprint: page.content?.fingerprint,
    depth: page.transport?.depth,
    noindex: page.indexing.noindex,
    nofollow: page.indexing.nofollow,
    canonicalUrl: page.canonical.valid ? page.canonical.url : null,
    robotsAllowed: context.robotsAllowed,
    fromSitemap: context.fromSitemap,
    discoverySource: context.discoverySource,
    redirects: page.transport?.redirects,
    passwordInputCount: page.forms?.passwordInputCount,
    loginForm: page.forms?.loginForm,
  });
}

function classifyResource(
  url: URL,
  contentType: string | null,
  resourceHint?: AuditResourceType,
): { type: AuditResourceType; confidence: number; reasons: string[] } {
  const path = url.pathname.toLowerCase();
  const reasons: string[] = [];
  if (resourceHint && resourceHint !== "unknown") {
    return { type: resourceHint, confidence: 0.99, reasons: [`discovery_hint:${resourceHint}`] };
  }
  if (path === "/robots.txt") return { type: "robots", confidence: 1, reasons: ["root_robots_path"] };
  if (/(?:^|\/)sitemap(?:[-_.][^/]*)?\.xml$/u.test(path) || /sitemapindex|urlset/u.test(contentType ?? "")) {
    return { type: "sitemap", confidence: 0.98, reasons: ["sitemap_path_or_type"] };
  }
  if (isType(contentType, "text/html", "application/xhtml+xml")) {
    return { type: "html", confidence: 0.98, reasons: [`content-type:${contentType}`] };
  }
  if (isType(contentType, "application/rss+xml", "application/atom+xml") || /(?:feed|rss|atom).*\.xml$/u.test(path)) {
    return { type: "xml_feed", confidence: 0.95, reasons: ["feed_content_or_path"] };
  }
  if (isType(contentType, "application/xml", "text/xml") || path.endsWith(".xml")) {
    return { type: "xml_feed", confidence: 0.72, reasons: ["generic_xml"] };
  }
  if (contentType?.startsWith("image/") || /\.(?:avif|gif|jpe?g|png|svg|webp)$/u.test(path)) {
    return { type: "image", confidence: 0.96, reasons: ["image_content_or_extension"] };
  }
  if (isType(contentType, "text/css") || path.endsWith(".css")) {
    return { type: "stylesheet", confidence: 0.96, reasons: ["stylesheet_content_or_extension"] };
  }
  if (contentType?.includes("javascript") || /\.(?:js|mjs|cjs)$/u.test(path)) {
    return { type: "script", confidence: 0.96, reasons: ["script_content_or_extension"] };
  }
  if (/^\/api(?:\/|$)/u.test(path) || isType(contentType, "application/json", "application/problem+json")) {
    return { type: "api", confidence: 0.94, reasons: ["api_path_or_content_type"] };
  }
  if (contentType === "application/pdf" || /\.(?:docx?|odt|pdf|pptx?|xlsx?)$/u.test(path)) {
    return { type: "document", confidence: 0.96, reasons: ["document_content_or_extension"] };
  }
  if (!contentType && !hasFileExtension(path)) {
    return { type: "unknown", confidence: 0.35, reasons: ["web_route_without_content_type"] };
  }
  reasons.push(contentType ? `content-type:${contentType}` : "content_type_missing");
  return { type: "unknown", confidence: 0.25, reasons };
}

function classifyHtmlPage(
  input: ClassifyAuditObjectInput,
  url: URL,
  authSignals: readonly AuditAuthSignal[],
): { pageType: AuditHtmlPageType; confidence: number; reasons: string[] } {
  const scores = new Map<AuditHtmlPageType, PageScore>();
  for (const type of PAGE_TYPES) scores.set(type, { score: 0, reasons: [] });
  const add = (type: AuditHtmlPageType, score: number, reason: string) => {
    const value = scores.get(type);
    if (!value) return;
    value.score += score;
    value.reasons.push(reason);
  };
  // Page semantics must not change only because the same route lives below a
  // locale prefix (`/en/blog`, `/de/services`, …). Language is recorded
  // separately; route rules operate on the locale-independent path.
  const path = stripLocalePrefix(url.pathname.toLowerCase()).replace(/\/+$/u, "") || "/";
  const text = `${input.title ?? ""} ${(input.h1 ?? []).join(" ")}`.toLowerCase();
  const schema = new Set((input.schemaTypes ?? []).map((value) => value.toLowerCase()));
  const template = normalizeTemplate(input.templateSignature) ?? "";

  if (path === "/" || /^\/(?:[a-z]{2}(?:-[a-z]{2})?)$/u.test(path)) add("homepage", 6, "root_or_locale_home");
  if (/^\/(?:services?|marketplaces?|catalog|products?|categories|blog|articles?|news|guides?|cases?|portfolio|glossary|checks?|docs?|help|resources?)$/u.test(path)) {
    add("category", 10, "section_root");
  }
  if (/^\/(?:glossary|checks?|docs?|help|resources?)\/[^/]+(?:\/|$)/u.test(path)) {
    add("article", 4, "knowledge_detail_route");
  }
  if (/^\/marketplaces?\/[^/]+(?:\/|$)/u.test(path)) {
    add("service", 4, "marketplace_service_route");
  }
  const isConversionUtilityRoute = /^\/(?:brief|request|quote|estimate|calculator|free[-_/]?(?:audit|check|scan)|(?:site|website)[-_/]?(?:audit|check|scan))(?:\/|$)/u.test(path);
  if (isConversionUtilityRoute) {
    add("utility", 4, "conversion_utility_route");
  }
  if (/^\/(?:privacy|consent|terms|legal|policy|offer)(?:\/|$)/u.test(path)) {
    add("legal", 4, "legal_route");
  }
  const topLevelTokens = path.split("/").filter(Boolean).length === 1
    ? new Set(path.slice(1).split(/[-_]+/u).filter(Boolean))
    : new Set<string>();
  if (!isConversionUtilityRoute && ["seo", "audit", "promotion", "development", "advertising", "ads", "marketing", "marketplace", "content"].some((token) => topLevelTokens.has(token))) {
    add("service", 4, "top_level_service_route");
  }
  if (topLevelTokens.has("custom") && ["task", "project", "solution"].some((token) => topLevelTokens.has(token))) {
    add("service", 4, "custom_service_route");
  }
  scoreSchema(schema, add);
  scorePathAndText(path, text, add);
  scoreTemplate(template, add);

  // Many public sites render an account widget in their shared header. A
  // password field or login form therefore describes one component, not the
  // page itself. Treat those DOM observations as page-level auth evidence only
  // when the route, heading, schema, template, redirect, or response confirms
  // that this is actually an authentication page.
  const hasPageLevelAuthContext =
    /(?:^|\/)(?:login|log-in|signin|sign-in|auth)(?:\/|$)/u.test(path)
    || /(?:вход|войти|авторизац|log in|sign in)/u.test(text)
    || /(?:login|signin|auth)/u.test(template)
    || schema.has("loginaction")
    || schema.has("authenticateaction")
    || authSignals.some((signal) => signal !== "password_input" && signal !== "login_form");

  for (const signal of authSignals) {
    if ((signal === "password_input" || signal === "login_form") && !hasPageLevelAuthContext) continue;
    const points = signal === "password_input" || signal === "login_form" ? 5 : 4;
    if (signal === "protected_route" && /(?:^|\/)(?:account|cabinet|profile)(?:\/|$)/u.test(path)) {
      add("account", points, `auth:${signal}`);
    } else {
      add("auth", points, `auth:${signal}`);
    }
  }

  const ranked = [...scores.entries()]
    .filter(([type]) => type !== "unknown")
    .sort((left, right) => right[1].score - left[1].score || left[0].localeCompare(right[0], "en"));
  const winner = ranked[0];
  const runnerUp = ranked[1];
  if (!winner || winner[1].score < 3) {
    return { pageType: "unknown", confidence: 0.35, reasons: ["insufficient_combined_signals"] };
  }
  const margin = winner[1].score - (runnerUp?.[1].score ?? 0);
  const confidence = Math.min(0.98, 0.56 + winner[1].score * 0.07 + Math.max(0, margin) * 0.025);
  return {
    pageType: winner[0],
    confidence: roundConfidence(margin <= 0 ? Math.min(confidence, 0.62) : confidence),
    reasons: winner[1].reasons,
  };
}

function scoreSchema(
  schema: ReadonlySet<string>,
  add: (type: AuditHtmlPageType, score: number, reason: string) => void,
): void {
  const schemaRules: readonly [AuditHtmlPageType, readonly string[]][] = [
    ["product", ["product", "offer"]],
    ["service", ["service"]],
    ["article", ["article", "blogposting", "newsarticle", "techarticle"]],
    ["case", ["case", "creativework"]],
    ["contact", ["contactpage"]],
    ["pricing", ["priceSpecification".toLowerCase()]],
    ["auth", ["loginaction", "authenticateaction"]],
  ];
  for (const [type, values] of schemaRules) {
    const match = values.find((value) => schema.has(value));
    if (match) add(type, 5, `schema:${canonicalSchemaName(match)}`);
  }
}

function scorePathAndText(
  path: string,
  text: string,
  add: (type: AuditHtmlPageType, score: number, reason: string) => void,
): void {
  const rules: readonly [AuditHtmlPageType, RegExp, RegExp][] = [
    ["about", /(?:^|\/)(?:about|about-us|company)(?:\/?$)/u, /(?:о компании|о нас|наша команда|about us|company)/u],
    ["pricing", /(?:^|\/)(?:pricing|prices?|tariffs?)(?:\/|$)/u, /(?:цены|тариф|стоимость|pricing|prices?)/u],
    ["contact", /(?:^|\/)(?:contacts?|feedback)(?:\/|$)/u, /(?:контакты|связаться|contact)/u],
    ["legal", /(?:^|\/)(?:privacy|consent|terms|legal|policy|offer)(?:\/|$)/u, /(?:политик|согласие|условия|privacy|terms)/u],
    ["auth", /(?:^|\/)(?:login|log-in|signin|sign-in|auth)(?:\/|$)/u, /(?:вход|войти|авторизац|log in|sign in)/u],
    ["account", /(?:^|\/)(?:account|cabinet|profile)(?:\/|$)/u, /(?:личный кабинет|профиль|account)/u],
    ["cart", /(?:^|\/)(?:cart|basket)(?:\/|$)/u, /(?:корзина|cart|basket)/u],
    ["internal_search", /(?:^|\/)(?:search|find)(?:\/|$)/u, /(?:поиск|результаты поиска|search results)/u],
    ["filter", /(?:^|\/)(?:filter|sort)(?:\/|$)/u, /(?:фильтр|сортиров|filter|sort)/u],
    ["category", /(?:^|\/)(?:catalog|categories|products|services|blog|cases)(?:\/?$)/u, /(?:каталог|категори|все услуги|материалы|cases|portfolio)/u],
    ["product", /(?:^|\/)(?:products?|catalog)\//u, /(?:купить|товар|характеристики|product)/u],
    ["article", /(?:^|\/)(?:blog|articles?|news|guides?)\//u, /(?:статья|разбор|руководство|article|guide)/u],
    ["case", /(?:^|\/)(?:cases?|portfolio)\//u, /(?:кейс|результат проекта|case study)/u],
    ["service", /(?:^|\/)(?:services?|seo|audit|promotion|development)(?:\/|$)/u, /(?:услуг|аудит|продвижение|разработка|service)/u],
  ];
  for (const [type, pathPattern, textPattern] of rules) {
    const pathMatch = pathPattern.test(path);
    const textMatch = textPattern.test(text);
    if (pathMatch) add(type, 1, `url_pattern:${type}`);
    if (textMatch) add(type, 2, `content_pattern:${type}`);
    if (pathMatch && textMatch) add(type, 1, `combined_pattern:${type}`);
  }
  if (new URLSearchParams(path.includes("?") ? path.split("?")[1] : "").size > 0) add("filter", 1, "query_parameters");
}

function scoreTemplate(
  template: string,
  add: (type: AuditHtmlPageType, score: number, reason: string) => void,
): void {
  if (!template) return;
  for (const type of PAGE_TYPES) {
    // DOM signatures contain counters such as `article0`. Those are element
    // counts, not a semantic template name. Only accept a complete token so a
    // page without an <article> element is never classified as an article.
    const semanticToken = new RegExp(`(?:^|[:/_-])${type}(?:$|[:/_-])`, "u");
    if (type !== "unknown" && semanticToken.test(template)) add(type, 3, `template:${template}`);
  }
  if (/(?:login|signin|auth)/u.test(template)) add("auth", 4, `template:${template}`);
}

function collectAuthSignals(input: ClassifyAuditObjectInput, finalUrl: URL): AuditAuthSignal[] {
  const signals: AuditAuthSignal[] = [];
  if ((input.passwordInputCount ?? 0) > 0) signals.push("password_input");
  if (input.loginForm) signals.push("login_form");
  if (input.statusCode === 401 || input.statusCode === 403) signals.push("restricted_status");
  if ((input.redirects ?? []).some((value) => /(?:^|\/)(?:login|log-in|signin|sign-in|auth)(?:\/|$|\?)/iu.test(safePath(value)))) {
    signals.push("login_redirect");
  }
  if (input.confirmedProtectedRoute) signals.push("protected_route");
  const schema = (input.schemaTypes ?? []).some((value) => /^(?:LoginAction|AuthenticateAction)$/iu.test(value));
  if (schema) signals.push("auth_schema");
  if (input.confirmedAuthTemplate) signals.push("confirmed_auth_template");
  // A route fragment is evidence only when another observation confirms that
  // the route is protected. This avoids treating /accounting-services as login.
  if ((input.statusCode === 401 || input.statusCode === 403)
    && /(?:^|\/)(?:account|cabinet|profile)(?:\/|$)/iu.test(finalUrl.pathname)
    && !signals.includes("protected_route")) {
    signals.push("protected_route");
  }
  return signals;
}

function collectIndexabilitySignals(input: ClassifyAuditObjectInput): AuditIndexabilitySignal[] {
  const signals: AuditIndexabilitySignal[] = [];
  if (input.noindex) signals.push("meta_noindex");
  if (input.nofollow) signals.push("meta_nofollow");
  signals.push(input.canonicalUrl ? "canonical_present" : "canonical_missing");
  if (input.robotsAllowed === true) signals.push("robots_allowed");
  if (input.robotsAllowed === false) signals.push("robots_blocked");
  if (input.fromSitemap) signals.push("sitemap_listed");
  return signals;
}

function normalizeUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Audit URL must use HTTP or HTTPS");
  url.username = "";
  url.password = "";
  url.hash = "";
  return url;
}

function normalizeOptionalUrl(value: string | null | undefined, base: URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function normalizeContentType(value: string | null | undefined): string | null {
  const normalized = value?.split(";", 1)[0]?.trim().toLowerCase();
  return normalized || null;
}

function normalizeStatus(value: number | null | undefined): number | null {
  return Number.isInteger(value) && value! >= 100 && value! <= 599 ? value! : null;
}

function normalizeLanguage(value: string | null | undefined, pathname: string): string | null {
  const direct = value?.trim().toLowerCase().split(/[-_]/u)[0];
  if (direct) return direct;
  const route = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  return route && /^[a-z]{2}$/u.test(route) ? route : null;
}

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments[0] || !/^[a-z]{2}(?:-[a-z]{2})?$/u.test(segments[0])) return pathname;
  const remainder = segments.slice(1);
  return remainder.length > 0 ? `/${remainder.join("/")}` : "/";
}

function normalizeTemplate(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/\s+/gu, "-");
  return normalized || null;
}

function normalizeDepth(value: number | undefined, pathname: string): number {
  if (Number.isFinite(value)) return Math.max(0, Math.floor(value!));
  return pathname.split("/").filter(Boolean).length;
}

function inferTemplateFamily(pageType: AuditHtmlPageType, pathname: string): string {
  if (pageType === "homepage") return "homepage";
  const parts = pathname.split("/").filter(Boolean);
  return `${pageType}:${parts.length > 1 ? `${parts[0]}/:detail` : parts[0] ?? "root"}`;
}

function isType(value: string | null, ...expected: readonly string[]): boolean {
  return value !== null && expected.includes(value);
}

function hasFileExtension(pathname: string): boolean {
  return /\/[^/]+\.[a-z\d]{1,8}$/iu.test(pathname);
}

function safePath(value: string): string {
  try {
    return new URL(value).pathname;
  } catch {
    return value;
  }
}

function canonicalSchemaName(value: string): string {
  const names: Readonly<Record<string, string>> = {
    product: "Product",
    offer: "Offer",
    service: "Service",
    article: "Article",
    blogposting: "BlogPosting",
    newsarticle: "NewsArticle",
    techarticle: "TechArticle",
    case: "Case",
    creativework: "CreativeWork",
    contactpage: "ContactPage",
    pricespecification: "PriceSpecification",
    loginaction: "LoginAction",
    authenticateaction: "AuthenticateAction",
  };
  return names[value] ?? value;
}

function roundConfidence(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}
