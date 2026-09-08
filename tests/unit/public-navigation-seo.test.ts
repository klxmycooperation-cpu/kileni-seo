import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildBreadcrumbSchema } from "../../src/components/layout/Breadcrumbs";
import { Logo } from "../../src/components/brand/Logo";
import { PublicContactLinks } from "../../src/components/contact/PublicContactLinks";
import { buildPublicShellSchema } from "../../src/components/layout/PublicShell";
import { SiteFooter } from "../../src/components/layout/SiteFooter";

describe("public navigation SEO", () => {
  it("uses absolute URLs for BreadcrumbList items in both locales", () => {
    expect(buildBreadcrumbSchema("ru", [
      { label: "Услуги", path: "services" },
      { label: "SEO-аудит", path: "seo-audit", current: true },
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
        item: "https://kileni-seo.ru/seo-audit",
      },
    ]);

    expect(buildBreadcrumbSchema("en", [{ label: "Services", path: "services" }])
      .itemListElement.map((item) => item.item)).toEqual([
      "https://kileni-seo.ru/en",
      "https://kileni-seo.ru/en/services",
    ]);
  });

  it("describes one multilingual WebSite and the business as an Organization", () => {
    for (const locale of ["ru", "en"] as const) {
      const graph = buildPublicShellSchema(locale)["@graph"];
      expect(graph.find((node) => node["@id"] === "https://kileni-seo.ru/#organization")?.["@type"]).toBe("Organization");
      expect(graph.find((node) => node["@id"] === "https://kileni-seo.ru/#website")?.inLanguage).toEqual(["ru", "en"]);
    }
  });

  it("keeps the footer logo and visible contact labels in each accessible name", () => {
    const logo = renderToStaticMarkup(createElement(Logo, { locale: "ru", inverted: true }));
    const contacts = renderToStaticMarkup(createElement(PublicContactLinks, { locale: "ru", variant: "footer" }));

    expect(logo).toContain('aria-label="KILENI seo — главная"');
    expect(contacts).not.toContain('class="public-contact-link" aria-label=');
    expect(contacts).not.toMatch(/<a[^>]+aria-label=/u);
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
