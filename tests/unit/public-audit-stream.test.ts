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
});
