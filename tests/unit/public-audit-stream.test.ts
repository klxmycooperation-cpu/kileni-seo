import { describe, expect, it, vi } from "vitest";

import { consumePublicAuditStream } from "../../src/lib/audit/public-stream";

describe("public audit NDJSON consumer", () => {
  it("parses fragmented progress events and resolves with the protected terminal result", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      '{"type":"accepted","token":"token","status":"running","pageLimit":10}\n{"type":"pro',
      'gress","token":"token","status":"crawling_pages","pagesChecked":10,"pagesDiscovered":10,"pageLimit":10}\n',
      '{"type":"completed","token":"token","status":"partial","restore":"payload.signature"}\n',
    ];
    const response = new Response(new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }), { status: 202, headers: { "content-type": "application/x-ndjson" } });
    const observed = vi.fn();

    const terminal = await consumePublicAuditStream(response, observed);

    expect(observed).toHaveBeenCalledWith(expect.objectContaining({ type: "progress", pagesChecked: 10, pageLimit: 10 }));
    expect(terminal).toEqual({ type: "completed", token: "token", status: "partial", restore: "payload.signature" });
  });

  it("rejects a terminal backend failure with its safe public message", async () => {
    const response = new Response(
      `${JSON.stringify({ type: "accepted", token: "token", status: "running", pageLimit: 10 })}\n${JSON.stringify({ type: "failed", token: "token", code: "AUDIT_TARGET_UNAVAILABLE", message: "Сайт не ответил" })}\n`,
      { status: 202, headers: { "content-type": "application/x-ndjson" } },
    );

    await expect(consumePublicAuditStream(response, () => undefined)).rejects.toThrow("Сайт не ответил");
  });

  it("keeps the real selection and current page in a validated progress event", async () => {
    const progress = {
      type: "progress",
      token: "token",
      status: "crawling_pages",
      pagesChecked: 3,
      pagesDiscovered: 100,
      pagesEligible: 98,
      pagesSelected: 10,
      selectedPages: [{ url: "https://example.com/pricing", pageType: "pricing", selectionReason: "conversion_support" }],
      checkedUrls: ["https://example.com/", "https://example.com/about"],
      failedUrls: ["https://example.com/contact"],
      selectionComplete: true,
      technicalFilesChecked: 2,
      currentUrl: "https://example.com/pricing",
      currentPageType: "pricing",
      eventKind: "page_started",
      eventCreatedAt: "2026-09-02T10:00:00.000Z",
      robotsStatus: "found",
      sitemapStatus: "found",
      pageLimit: 10,
    } as const;
    const response = new Response(`${JSON.stringify(progress)}\n${JSON.stringify({ type: "completed", token: "token", status: "completed", restore: "payload.signature" })}\n`);
    const observed: unknown[] = [];

    await consumePublicAuditStream(response, (event) => observed.push(event));

    expect(observed[0]).toEqual(progress);
  });

  it("rejects malformed page URLs and unknown progress values", async () => {
    const response = new Response(`${JSON.stringify({
      type: "progress",
      token: "token",
      status: "crawling_pages",
      pagesChecked: 0,
      pagesDiscovered: 1,
      pageLimit: 10,
      currentUrl: "javascript:alert(1)",
    })}\n`);

    await expect(consumePublicAuditStream(response, () => undefined)).rejects.toThrow("некорректный ход проверки");
  });

  it("rejects contradictory or oversized page outcome lists", async () => {
    const response = new Response(`${JSON.stringify({
      type: "progress",
      token: "token",
      status: "crawling_pages",
      pagesChecked: 1,
      pagesDiscovered: 2,
      pageLimit: 10,
      checkedUrls: ["https://example.com/pricing"],
      failedUrls: ["https://example.com/pricing"],
    })}\n`);

    await expect(consumePublicAuditStream(response, () => undefined)).rejects.toThrow("некорректный ход проверки");
  });
});
