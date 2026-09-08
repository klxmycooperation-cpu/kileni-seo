import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createClient } from "@libsql/client";
import { createDatabaseFetch } from "../../src/db/transport";
import { migrateLibsqlDatabase } from "../../src/db/migrations";

afterEach(() => vi.unstubAllGlobals());

describe("bounded database HTTP transport", () => {
  it("aborts a stalled request instead of holding every database route indefinitely", async () => {
    const pending = vi.fn((_input: unknown, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    vi.stubGlobal("fetch", pending);
    await expect(createDatabaseFetch(25)("https://database.invalid/v2/pipeline")).rejects.toMatchObject({ name: "TimeoutError" });
    expect(pending).toHaveBeenCalledTimes(1);
  });

  it("preserves cancellation, request credentials and body without caching or retrying a write", async () => {
    const caller = new AbortController();
    const request = new Request("https://database.invalid/v2/pipeline", {
      method: "POST", body: '{"sql":"insert"}', headers: { Authorization: "Bearer test-only" }, signal: caller.signal,
    });
    const fetch = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    await createDatabaseFetch()(request);
    const [input, options] = fetch.mock.calls[0] as [Request, RequestInit];
    expect(input).toBe(request);
    expect(options.cache).toBe("no-store");
    expect(input.headers.get("Authorization")).toBe("Bearer test-only");
    expect(await input.text()).toBe('{"sql":"insert"}');
    caller.abort();
    expect(options.signal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("releases the real libSQL migration transaction when the HTTP peer stops responding", async () => {
    const server = createServer(() => { /* Deliberately no HTTP response; no SQL is executed. */ });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test listener");
    const client = createClient({ url: `http://127.0.0.1:${address.port}`, fetch: createDatabaseFetch(40) });
    const started = Date.now();
    try {
      await expect(migrateLibsqlDatabase(client)).rejects.toThrow();
      expect(Date.now() - started).toBeLessThan(2_000);
    } finally {
      client.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
