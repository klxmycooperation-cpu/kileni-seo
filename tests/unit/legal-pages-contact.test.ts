import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/privacy" }));

import { LegalPage } from "../../src/components/pages/StaticPages";
import legalDefaults from "../../src/config/legal-defaults.json";

describe("legal page contact fallback", () => {
  it("uses the postal request route and does not render an empty or legacy mail link", () => {
    const html = renderToStaticMarkup(createElement(LegalPage, { locale: "ru", kind: "privacy" }));

    expect(html).toContain(legalDefaults.address);
    expect(html).toContain("Телефон и MAX для уточнения порядка обращения");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("K-TRANS-DIR@MAIL.RU");
  });
});
