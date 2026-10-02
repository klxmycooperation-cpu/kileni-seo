import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_EXTERNAL_SERVER !== "1", "requires the supervised localhost with its audit worker");

test("runs one healthy web server with a live audit worker", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const health = await response.json() as { status?: string; worker?: string };
  expect(health).toMatchObject({ status: "ok", worker: "ok" });
});
