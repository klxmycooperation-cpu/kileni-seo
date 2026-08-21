import type {
  AuditFetcher,
  SafeFetchResponse,
} from "../../src/lib/audit/fetch";

export interface FixturePayload {
  readonly text: string;
  readonly status?: number;
  readonly contentType?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly finalUrl?: string;
  readonly redirects?: readonly string[];
}

export interface AuditSiteFixture {
  readonly target: string;
  readonly documents: Readonly<Record<string, FixturePayload>>;
}

const securityHeaders = {
  "content-security-policy": "default-src 'self'",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin",
  "permissions-policy": "camera=()",
  "x-frame-options": "DENY",
} as const;

export function createFixtureFetcher(
  fixture: AuditSiteFixture,
  calls: string[] = [],
): AuditFetcher {
  return async (input): Promise<SafeFetchResponse> => {
    const requestedUrl = new URL(input).href;
    calls.push(requestedUrl);
    const payload = fixture.documents[requestedUrl] ?? {
      text: "not found",
      status: 404,
      contentType: "text/plain; charset=utf-8",
    };
    const status = payload.status ?? 200;
    const url = payload.finalUrl ?? requestedUrl;
    const body = new TextEncoder().encode(payload.text);
    return {
      requestedUrl,
      url,
      status,
      ok: status >= 200 && status < 300,
      headers: {
        "content-type": payload.contentType ?? "text/html; charset=utf-8",
        ...(payload.contentType?.startsWith("text/html") || payload.contentType === undefined
          ? securityHeaders
          : {}),
        ...payload.headers,
      },
      body,
      text: payload.text,
      redirects: payload.redirects ?? [],
    };
  };
}

function sitemap(host: string, paths: readonly string[]): string {
  return `<urlset>${paths.map((path) => `<url><loc>https://${host}${path}</loc></url>`).join("")}</urlset>`;
}

function html(input: {
  readonly url: string;
  readonly title?: string;
  readonly h1?: readonly string[];
  readonly canonical?: string | null;
  readonly noindex?: boolean;
  readonly links?: readonly string[];
}): string {
  const pageLabel = input.title ?? "Страница сайта";
  const title = input.title === undefined ? "" : `<title>${input.title}</title>`;
  const canonical = input.canonical === null
    ? ""
    : `<link rel="canonical" href="${input.canonical ?? input.url}">`;
  const robots = input.noindex ? '<meta name="robots" content="noindex,follow">' : "";
  const headings = (input.h1 ?? ["Главный заголовок страницы"])
    .map((value) => `<h1>${value}</h1>`)
    .join("");
  const links = (input.links ?? []).map((href) => `<a href="${href}">Ссылка</a>`).join("");
  return `<!doctype html><html lang="ru"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    ${title}
    <meta name="description" content="${pageLabel}. Подробное и полезное описание страницы для поисковой выдачи и будущих посетителей сайта.">
    <link rel="icon" href="/favicon.svg">
    ${canonical}${robots}
    <meta property="og:title" content="Заголовок"><meta property="og:description" content="Описание">
    <meta property="og:image" content="https://cdn.example.test/og.jpg"><meta property="og:url" content="${input.url}">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"WebSite"},{"@type":"BreadcrumbList"}]}</script>
  </head><body>${headings}<p>${`${pageLabel} содержит проверяемое полезное описание услуги, условий работы, результата, этапов, ограничений, примеров, сроков, ответов на вопросы и следующего шага для посетителя. `.repeat(7)}</p>${links}<img src="/image.jpg" alt="Иллюстрация страницы" width="640" height="360"></body></html>`;
}

function standardDocuments(
  host: string,
  root: FixturePayload,
  extras: Readonly<Record<string, FixturePayload>> = {},
): Readonly<Record<string, FixturePayload>> {
  const paths = ["/", ...Object.keys(extras).map((url) => new URL(url).pathname)];
  return {
    [`https://${host}/`]: root,
    [`https://${host}/robots.txt`]: {
      text: `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml`,
      contentType: "text/plain; charset=utf-8",
    },
    [`https://${host}/sitemap.xml`]: {
      text: sitemap(host, paths),
      contentType: "application/xml",
    },
    ...extras,
  };
}

const goodHost = "correct.test";
const goodRootUrl = `https://${goodHost}/`;
const goodAboutUrl = `https://${goodHost}/about`;

const duplicateTitle = "Одинаковый заголовок двух страниц для проверки";
const idnHost = new URL("https://пример.рф").hostname;
const redirectFinalUrl = "https://www.redirect.test/";

export const auditSiteFixtures = {
  correct: {
    target: goodRootUrl,
    documents: standardDocuments(
      goodHost,
      { text: html({ url: goodRootUrl, title: "Корректная главная страница компании KILENI", links: ["/about"] }) },
      {
        [goodAboutUrl]: {
          text: html({ url: goodAboutUrl, title: "Подробная информация о компании и её команде", links: ["/"] }),
        },
      },
    ),
  },
  noTitle: {
    target: "https://no-title.test/",
    documents: standardDocuments("no-title.test", {
      text: html({ url: "https://no-title.test/", title: undefined }),
    }),
  },
  multipleH1: {
    target: "https://multiple-h1.test/",
    documents: standardDocuments("multiple-h1.test", {
      text: html({
        url: "https://multiple-h1.test/",
        title: "Страница с несколькими основными заголовками",
        h1: ["Первый главный заголовок", "Второй главный заголовок"],
      }),
    }),
  },
  badCanonical: {
    target: "https://bad-canonical.test/",
    documents: standardDocuments("bad-canonical.test", {
      text: html({
        url: "https://bad-canonical.test/",
        title: "Страница с некорректным каноническим адресом",
        canonical: "javascript:alert(1)",
      }),
    }),
  },
  brokenSitemap: {
    target: "https://broken-sitemap.test/",
    documents: {
      "https://broken-sitemap.test/": {
        text: html({
          url: "https://broken-sitemap.test/",
          title: "Страница сайта с недоступной картой сайта",
        }),
      },
      "https://broken-sitemap.test/robots.txt": {
        text: "User-agent: *\nAllow: /\nSitemap: https://broken-sitemap.test/sitemap.xml",
        contentType: "text/plain; charset=utf-8",
      },
      "https://broken-sitemap.test/sitemap.xml": {
        text: "upstream failure",
        status: 500,
        contentType: "text/plain; charset=utf-8",
      },
    },
  },
  redirect: {
    target: "https://redirect.test/",
    documents: {
      "https://redirect.test/": {
        text: html({
          url: redirectFinalUrl,
          title: "Финальная страница после постоянного перенаправления",
        }),
        finalUrl: redirectFinalUrl,
        redirects: [redirectFinalUrl],
      },
      "https://www.redirect.test/robots.txt": {
        text: "User-agent: *\nAllow: /\nSitemap: https://www.redirect.test/sitemap.xml",
        contentType: "text/plain; charset=utf-8",
      },
      "https://www.redirect.test/sitemap.xml": {
        text: sitemap("www.redirect.test", ["/"]),
        contentType: "application/xml",
      },
    },
  },
  noindex: {
    target: "https://noindex.test/",
    documents: standardDocuments("noindex.test", {
      text: html({
        url: "https://noindex.test/",
        title: "Страница с запретом поисковой индексации",
        noindex: true,
      }),
    }),
  },
  duplicateTitles: {
    target: "https://duplicates.test/",
    documents: standardDocuments(
      "duplicates.test",
      { text: html({ url: "https://duplicates.test/", title: duplicateTitle, links: ["/second"] }) },
      {
        "https://duplicates.test/second": {
          text: html({ url: "https://duplicates.test/second", title: duplicateTitle, links: ["/"] }),
        },
      },
    ),
  },
  internal404: {
    target: "https://internal-404.test/",
    documents: standardDocuments(
      "internal-404.test",
      {
        text: html({
          url: "https://internal-404.test/",
          title: "Главная страница со ссылкой на удалённый адрес",
          links: ["/missing"],
        }),
      },
      {
        "https://internal-404.test/missing": {
          text: html({
            url: "https://internal-404.test/missing",
            title: "Страница не найдена на проверяемом сайте",
            canonical: null,
          }),
          status: 404,
        },
      },
    ),
  },
  idn: {
    target: "https://пример.рф/",
    documents: standardDocuments(idnHost, {
      text: html({
        url: `https://${idnHost}/`,
        title: "Главная страница сайта на кириллическом домене",
      }),
    }),
  },
} satisfies Readonly<Record<string, AuditSiteFixture>>;

export const completePerformance = {
  performance: 100,
  fcpMs: 1_000,
  lcpMs: 2_000,
  cls: 0.05,
  tbtMs: 100,
  accessibility: 100,
} as const;
