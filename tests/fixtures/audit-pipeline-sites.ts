import type { AuditSiteFixture, FixturePayload } from "./audit-sites";

interface PageFixture {
  readonly title?: string;
  readonly h1?: string;
  readonly schema?: string;
  readonly lang?: string;
  readonly noindex?: boolean;
  readonly canonical?: string | null;
  readonly hreflang?: readonly { readonly language: string; readonly href: string }[];
  readonly body?: string;
  readonly links?: readonly string[];
  readonly status?: number;
}

interface SiteOptions {
  readonly targetPath?: string;
  readonly robots?: "normal" | "missing" | "404" | "malformed";
  readonly sitemap?: "normal" | "missing";
  readonly sitemapEntries?: readonly string[];
}

function site(
  host: string,
  pages: Readonly<Record<string, PageFixture>>,
  options: SiteOptions = {},
): AuditSiteFixture {
  const documents: Record<string, FixturePayload> = {};
  for (const [path, page] of Object.entries(pages)) {
    documents[`https://${host}${path}`] = {
      text: html(host, path, page),
      status: page.status,
    };
  }
  const robotsMode = options.robots ?? "normal";
  if (robotsMode !== "missing") {
    documents[`https://${host}/robots.txt`] = robotsMode === "404"
      ? { text: "not found", status: 404, contentType: "text/plain" }
      : robotsMode === "malformed"
        ? { text: "Disallow: /private\nSitemap: ???", contentType: "text/plain" }
        : {
            text: `User-agent: *\nAllow: /${options.sitemap === "missing" ? "" : `\nSitemap: https://${host}/sitemap.xml`}`,
            contentType: "text/plain",
          };
  }
  if ((options.sitemap ?? "normal") !== "missing") {
    const entries = options.sitemapEntries ?? Object.keys(pages).map((path) => `https://${host}${path}`);
    documents[`https://${host}/sitemap.xml`] = {
      text: `<urlset>${entries.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`,
      contentType: "application/xml",
    };
  }
  return { target: `https://${host}${options.targetPath ?? "/"}`, documents };
}

function html(host: string, path: string, page: PageFixture): string {
  const url = `https://${host}${path}`;
  const links = (page.links ?? []).map((href) => `<a href="${href}">Перейти</a>`).join("");
  const schema = page.schema
    ? `<script type="application/ld+json">{"@context":"https://schema.org","@type":"${page.schema}"}</script>`
    : "";
  const title = page.title === undefined ? "" : `<title>${page.title}</title>`;
  const h1 = page.h1 === undefined ? "" : `<h1>${page.h1}</h1>`;
  const canonical = page.canonical === null
    ? ""
    : `<link rel="canonical" href="${page.canonical ?? url}">`;
  const hreflang = (page.hreflang ?? [])
    .map((item) => `<link rel="alternate" hreflang="${item.language}" href="${item.href}">`)
    .join("");
  return `<!doctype html><html lang="${page.lang ?? "ru"}"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width">
    ${title}<meta name="description" content="Подробное описание страницы для посетителя и поисковой выдачи.">
    ${canonical}${hreflang}${page.noindex ? '<meta name="robots" content="noindex,follow">' : ""}${schema}
    </head><body><nav><a href="/">Главная</a></nav><main>${h1}${page.body ?? ""}${links}</main></body></html>`;
}

const corporate = site("fixture-corporate.test", {
  "/": { title: "Компания и её услуги", h1: "Помогаем бизнесу", links: ["/services/seo", "/pricing"] },
  "/services/seo": { title: "SEO-продвижение сайта", h1: "SEO-продвижение", schema: "Service" },
  "/pricing": { title: "Цены на услуги", h1: "Цены" },
});

const store = site("fixture-store.test", {
  "/": { title: "Интернет-магазин", h1: "Каталог товаров", links: ["/catalog", "/catalog/phone", "/cart", "/login"] },
  "/catalog": { title: "Каталог телефонов", h1: "Телефоны" },
  "/catalog/phone": { title: "Телефон Model One", h1: "Model One", schema: "Product" },
  "/cart": { title: "Корзина", h1: "Корзина" },
  "/login": { title: "Вход", h1: "Войти", body: '<form action="/session"><input name="email"><input type="password" name="password"><button>Войти</button></form>' },
});

const multilingual = site("fixture-languages.test", {
  "/": { title: "Главная страница", h1: "Компания", links: ["/services/seo", "/blog/a", "/en", "/en/services/seo", "/en/blog/a"] },
  "/services/seo": { title: "SEO-продвижение", h1: "SEO-продвижение", schema: "Service" },
  "/blog/a": { title: "Как проверить сайт", h1: "Проверка сайта", schema: "Article" },
  "/en": { title: "Company home", h1: "Company", lang: "en" },
  "/en/services/seo": { title: "SEO services", h1: "SEO services", lang: "en", schema: "Service" },
  "/en/blog/a": { title: "How to check a website", h1: "Website check", lang: "en", schema: "Article" },
});

const sitemapIndex = site("fixture-sitemap-index.test", {
  "/": { title: "Главная страница", h1: "Компания" },
}, { sitemap: "missing" });
(sitemapIndex.documents as Record<string, FixturePayload>)["https://fixture-sitemap-index.test/robots.txt"] = {
  text: "User-agent: *\nAllow: /\nSitemap: https://fixture-sitemap-index.test/sitemap-index.xml",
  contentType: "text/plain",
};
(sitemapIndex.documents as Record<string, FixturePayload>)["https://fixture-sitemap-index.test/sitemap-index.xml"] = {
  text: "<sitemapindex><sitemap><loc>https://fixture-sitemap-index.test/pages.xml</loc></sitemap></sitemapindex>",
  contentType: "application/xml",
};
(sitemapIndex.documents as Record<string, FixturePayload>)["https://fixture-sitemap-index.test/pages.xml"] = {
  text: "<urlset><url><loc>https://fixture-sitemap-index.test/</loc></url></urlset>",
  contentType: "application/xml",
};

const mixedSitemap = site("fixture-mixed-sitemap.test", {
  "/": { title: "Главная страница", h1: "Компания" },
}, {
  sitemapEntries: [
    "https://fixture-mixed-sitemap.test/",
    "https://fixture-mixed-sitemap.test/catalog.pdf",
    "https://fixture-mixed-sitemap.test/image.jpg",
    "https://outside.test/page",
  ],
});

export const auditPipelineSiteFixtures = {
  corporate,
  store,
  multilingual,
  landing: site("fixture-landing.test", {
    "/": { title: "Посадочная страница услуги", h1: "Одна услуга" },
  }),
  noRobots: site("fixture-no-robots.test", {
    "/": { title: "Сайт без robots", h1: "Компания" },
  }, { robots: "missing" }),
  robots404: site("fixture-robots-404.test", {
    "/": { title: "Сайт с ответом 404", h1: "Компания" },
  }, { robots: "404" }),
  malformedRobots: site("fixture-malformed-robots.test", {
    "/": { title: "Сайт с ошибкой robots", h1: "Компания" },
  }, { robots: "malformed" }),
  noSitemap: site("fixture-no-sitemap.test", {
    "/": { title: "Сайт без sitemap", h1: "Компания" },
  }, { sitemap: "missing" }),
  sitemapIndex,
  mixedSitemap,
  loginForm: site("fixture-login-form.test", {
    "/": { title: "Главная страница", h1: "Компания", links: ["/login"] },
    "/login": { title: "Вход в кабинет", h1: "Войти", body: '<form action="/session"><input type="password" name="password"><button>Войти</button></form>' },
  }, { targetPath: "/login" }),
  accountWord: site("fixture-account-word.test", {
    "/accounting-services": { title: "Бухгалтерские услуги", h1: "Бухгалтерское сопровождение", schema: "Service" },
  }, { targetPath: "/accounting-services" }),
  restricted: site("fixture-restricted.test", {
    "/private": { title: "Доступ ограничен", h1: "Требуется вход", status: 403 },
  }, { targetPath: "/private" }),
  trackingAndFilters: site("fixture-filtered.test", {
    "/": { title: "Каталог", h1: "Каталог", links: ["/catalog", "/catalog?sort=price", "/?utm_source=test"] },
    "/catalog": { title: "Каталог товаров", h1: "Товары" },
    "/catalog?sort=price": { title: "Сортировка товаров", h1: "Товары по цене" },
    "/?utm_source=test": { title: "Главная с меткой", h1: "Каталог" },
  }),
  duplicateTemplates: site("fixture-templates.test", {
    "/": { title: "Главная страница", h1: "Компания", links: ["/services/a", "/services/b", "/blog/a"] },
    "/services/a": { title: "Услуга А", h1: "Услуга А", schema: "Service" },
    "/services/b": { title: "Услуга Б", h1: "Услуга Б", schema: "Service" },
    "/blog/a": { title: "Статья", h1: "Статья", schema: "Article" },
  }),
  noindexService: site("fixture-noindex-service.test", {
    "/services/seo": { title: "SEO-продвижение", h1: "SEO-продвижение", schema: "Service", noindex: true },
    "/free-audit": { title: "Бесплатная проверка", h1: "Проверить сайт", noindex: true },
  }, { targetPath: "/services/seo" }),
  noindexLogin: site("fixture-noindex-login.test", {
    "/login": { title: "Вход в кабинет", h1: "Войти", noindex: true, body: '<form action="/session"><input type="password" name="password"><button>Войти</button></form>' },
  }, { targetPath: "/login" }),
  acceptanceLanding: site("fixture-acceptance-landing.test", {
    "/": {
      title: "Лендинг небольшой компании",
      h1: "Помогаем запустить проект",
      links: ["/services/launch", "/contact"],
    },
    "/services/launch": {
      h1: "Запуск проекта под ключ",
      schema: "Service",
    },
    "/contact": {
      title: "Связаться с небольшой компанией",
      h1: "Обсудить проект",
      body: '<form action="/lead" method="post"><label for="lead-name">Имя</label><input id="lead-name" name="name"><label for="lead-email">Email</label><input id="lead-email" type="email" name="email"><button type="submit">Отправить</button></form>',
    },
  }, { sitemap: "missing" }),
  acceptanceStore: site("fixture-acceptance-store.test", {
    "/": {
      title: "Интернет-магазин электроники",
      h1: "Каталог электроники",
      links: [
        "/catalog",
        "/product/phone-a",
        "/product/phone-b",
        "/product/blocked-phone",
        "/cart",
        "/search",
        "/catalog?brand=one",
        "/login",
        "/account",
      ],
    },
    "/catalog": { title: "Каталог смартфонов", h1: "Смартфоны", schema: "CollectionPage" },
    "/product/phone-a": { title: "Смартфон A", h1: "Смартфон A", schema: "Product" },
    "/product/phone-b": { title: "Смартфон B", h1: "Смартфон B", schema: "Product" },
    "/product/blocked-phone": { title: "Смартфон с ошибочным запретом", h1: "Смартфон C", schema: "Product", noindex: true },
    "/cart": { title: "Корзина", h1: "Корзина" },
    "/search": { title: "Поиск по каталогу", h1: "Поиск товаров", noindex: true },
    "/catalog?brand=one": { title: "Фильтр по бренду", h1: "Смартфоны бренда One", noindex: true },
    "/login": { title: "Вход в магазин", h1: "Войти", noindex: true, body: '<form action="/session"><label for="login-email">Email</label><input id="login-email" type="email"><label for="login-password">Пароль</label><input id="login-password" type="password"><button>Войти</button></form>' },
    "/account": { title: "Личный кабинет", h1: "Личный кабинет", noindex: true, body: '<form action="/session"><label for="account-password">Пароль</label><input id="account-password" type="password"><button>Войти</button></form>' },
  }),
  acceptanceMultilingual: site("fixture-acceptance-multilingual.test", {
    "/": {
      title: "Главная русская страница",
      h1: "Компания",
      links: ["/services/seo", "/pricing", "/cases/localization", "/blog/a", "/en", "/en/services/seo", "/en/blog/a"],
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en" },
      ],
    },
    "/services/seo": {
      title: "SEO-продвижение",
      h1: "SEO-продвижение",
      schema: "Service",
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/services/seo" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en/services/seo" },
      ],
    },
    "/pricing": { title: "Цены на услуги", h1: "Цены" },
    "/cases/localization": {
      title: "Кейс локализации сайта",
      h1: "Как локализовали сайт",
      canonical: "https://fixture-acceptance-multilingual.test/services/seo",
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/cases/localization" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en/cases/localization" },
      ],
    },
    "/blog/a": {
      title: "Статья о продвижении",
      h1: "Как продвигать сайт",
      schema: "Article",
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/blog/a" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en/blog/a" },
      ],
    },
    "/en": {
      title: "English home",
      h1: "Company",
      lang: "en",
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en" },
      ],
    },
    "/en/services/seo": {
      title: "SEO services",
      h1: "SEO services",
      lang: "en",
      schema: "Service",
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/services/seo" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en/services/seo" },
      ],
    },
    "/en/cases/localization": {
      title: "Website localization case",
      h1: "How we localized a website",
      lang: "en",
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/cases/localization" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en/cases/localization" },
      ],
    },
    "/en/blog/a": {
      title: "SEO article",
      h1: "How to promote a site",
      lang: "en",
      schema: "Article",
      hreflang: [
        { language: "ru", href: "https://fixture-acceptance-multilingual.test/blog/a" },
        { language: "en", href: "https://fixture-acceptance-multilingual.test/en/blog/a" },
      ],
    },
  }),
} satisfies Readonly<Record<string, AuditSiteFixture>>;
