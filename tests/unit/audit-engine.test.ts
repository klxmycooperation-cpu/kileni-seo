import { describe, expect, it } from "vitest";

import {
  runAudit,
  toPublicAuditResult,
  type AuditEvent,
  type AuditFetcher,
  type SafeFetchResponse,
} from "../../src/lib/audit";

function response(url: string, text: string, status = 200): SafeFetchResponse {
  return {
    requestedUrl: url,
    url,
    status,
    ok: status >= 200 && status < 300,
    headers: { "content-type": status === 200 ? "text/html; charset=utf-8" : "text/plain" },
    body: new TextEncoder().encode(text),
    text,
    redirects: [],
  };
}

describe("runAudit", () => {
  it("returns a real partial result when the overall deadline fires after the root page", async () => {
    const controller = new AbortController();
    const discoverySignals: Array<AbortSignal | undefined> = [];
    const fetcher: AuditFetcher = async (input, options) => {
      const url = new URL(input).href;
      if (url === "https://example.com/") {
        return response(url, "<html><head><title>Root page for a partial audit</title></head><body><h1>Root</h1></body></html>");
      }
      discoverySignals.push(options?.signal);
      throw new Error("deadline reached");
    };

    const result = await runAudit("https://example.com", {
      fetcher,
      signal: controller.signal,
      performance: {
        performance: 90,
        fcpMs: 1_200,
        lcpMs: 2_100,
        cls: 0.05,
        tbtMs: 100,
        accessibility: 95,
      },
      onEvent(event) {
        if (event.type === "discovery:start") controller.abort("TEST_DEADLINE");
      },
    });

    expect(result.pagesChecked).toBe(1);
    expect(result.partial).toBe(true);
    expect(discoverySignals.length).toBeGreaterThan(0);
    expect(discoverySignals.every((signal) => signal === controller.signal)).toBe(true);
  });

  it("supports an injected fetch boundary and returns public plus full views", async () => {
    const events: AuditEvent[] = [];
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt") || url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404);
      }
      return response(
        url,
        '<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Достаточно длинный заголовок главной страницы</title></head><body><h1>Главная</h1></body></html>',
      );
    };
    const moments = [
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-01T00:00:01.000Z"),
    ];

    const full = await runAudit("пример.рф", {
      fetcher,
      now: () => moments.shift() ?? new Date(0),
      onEvent: (event) => {
        events.push(event);
      },
    });
    const publicResult = toPublicAuditResult(full);

    expect(full.targetUrl).toBe("https://xn--e1afmkfd.xn--p1ai/");
    expect(full.pages).toHaveLength(1);
    expect(full.issues.length).toBeGreaterThan(0);
    expect(full.pagesChecked).toBe(1);
    expect(full.pagesDiscovered).toBe(1);
    expect(full.partial).toBe(true);
    expect(full.coverage).toBeLessThan(1);
    expect(full.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(full.finishedAt).toBe("2026-01-01T00:00:01.000Z");
    expect(Object.keys(publicResult).sort()).toEqual([
      "categories",
      "grade",
      "interpretation",
      "pagesChecked",
      "pagesDiscovered",
      "partial",
      "score",
    ]);
    expect(typeof publicResult.score).toBe("number");
    expect(publicResult.categories).toHaveLength(5);
    for (const category of publicResult.categories) {
      expect(Object.keys(category).sort()).toEqual([
        "explanation",
        "name",
        "risk",
      ]);
    }
    const serialized = JSON.stringify(publicResult);
    expect(serialized).not.toMatch(
      /xn--e1afmkfd|https?:|targetUrl|finalUrl|topIssues|issueCounts|TITLE_|DESCRIPTION_|recommendation|severity/i,
    );
    expect(events[0]?.type).toBe("audit:start");
    expect(events.at(-1)?.type).toBe("audit:complete");
    expect(events.at(-1)).toMatchObject({
      pagesChecked: 1,
      pagesDiscovered: 1,
      partial: true,
    });
    expect(JSON.stringify(events)).not.toMatch(/xn--e1afmkfd|https?:|robotsStatus|message/i);
  });

  it("passes explicit performance observations into scoring and the full result", async () => {
    const fetcher: AuditFetcher = async (input) => {
      const url = new URL(input).href;
      if (url.endsWith("/robots.txt") || url.endsWith("/sitemap.xml")) {
        return response(url, "not found", 404);
      }
      return response(
        url,
        '<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Достаточно длинный заголовок главной страницы</title></head><body><h1>Главная</h1></body></html>',
      );
    };
    const performance = {
      performance: 92,
      fcpMs: 1_200,
      lcpMs: 2_200,
      cls: 0.08,
      tbtMs: 150,
      accessibility: 96,
    } as const;

    const full = await runAudit("https://example.com", { fetcher, performance });

    expect(full.performance).toEqual(performance);
    expect(full.score.categories.performanceMobile).toMatchObject({
      coverage: 1,
      partial: false,
    });
    expect(full.partial).toBe(false);
  });
});
