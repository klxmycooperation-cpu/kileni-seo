import { afterEach, describe, expect, it, vi } from "vitest";

import { collectBrowserAttribution } from "../../src/lib/attribution";

afterEach(() => vi.unstubAllGlobals());

describe("browser attribution", () => {
  it("stores only origin and path while allowlisting UTM values", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://kileni-seo.ru",
        pathname: "/brief",
        search: "?utm_source=yandex&utm_campaign=launch&email=private%40example.com&restore=secret",
      },
    });

    expect(collectBrowserAttribution()).toEqual({
      pageUrl: "https://kileni-seo.ru/brief",
      utm: { utm_source: "yandex", utm_campaign: "launch" },
    });
  });
});
