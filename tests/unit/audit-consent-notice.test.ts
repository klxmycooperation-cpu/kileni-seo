import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConsentNotice } from "../../src/components/forms/ConsentNotice";

describe("audit report consent notice", () => {
  it("states the limited email purpose and links both legal documents", () => {
    const html = renderToStaticMarkup(createElement(ConsentNotice, { locale: "ru", purpose: "audit-report" }));

    expect(html).toContain("обработку email для подготовки и однократной отправки отчёта");
    expect(html).toContain('href="/consent"');
    expect(html).toContain('href="/privacy"');
  });
});
