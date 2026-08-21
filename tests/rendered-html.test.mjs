import assert from "node:assert/strict";
import test from "node:test";

async function getWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(pathname = "/") {
  const worker = await getWorker();
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the KILENI home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>KILENI — каталог ароматов<\/title>/i);
  assert.match(html, /КАТАЛОГ АРОМАТОВ/);
  assert.match(html, /KILENI 01/);
  assert.doesNotMatch(html, /SCENT SPECTRUM|Три аромата|Три состояния|AIR|PULSE|TRACE/i);
  assert.match(html, /kileni-01\.jpg/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Lorem ipsum/i);
});

test("renders every requested route", async () => {
  for (const pathname of [
    "/collection",
    "/fragrance/01",
    "/fragrance/02",
    "/fragrance/03",
    "/about",
    "/where-to-buy",
    "/contacts",
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
  }
});

test("unknown fragrance returns the branded 404", async () => {
  const response = await render("/fragrance/99");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Такой страницы/);
});
