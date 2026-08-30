import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildBreadcrumbSchema } from "../../src/components/layout/Breadcrumbs";
import { SiteFooter } from "../../src/components/layout/SiteFooter";

describe("public navigation SEO", () => {
  it("uses absolute URLs for BreadcrumbList items in both locales", () => {
    expect(buildBreadcrumbSchema("ru", [
      { label: "Услуги", path: "services" },
      { label: "SEO-аудит" },
    ]).itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: "https://kileni-seo.ru/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Услуги",
        item: "https://kileni-seo.ru/services",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "SEO-аудит",
      },
    ]);

    expect(buildBreadcrumbSchema("en", [{ label: "Services", path: "services" }])
      .itemListElement.map((item) => item.item)).toEqual([
      "https://kileni-seo.ru/en",
      "https://kileni-seo.ru/en/services",
    ]);
  });

  it.each([
    ["ru", "/contacts", "/calculator"],
    ["en", "/en/contacts", "/en/calculator"],
  ] as const)("links the %s contact and calculator pages from the sitewide footer", (locale, contacts, calculator) => {
    const html = renderToStaticMarkup(createElement(SiteFooter, { locale }));

    expect(html).toContain(`href="${contacts}"`);
    expect(html).toContain(`href="${calculator}"`);
  });
});
