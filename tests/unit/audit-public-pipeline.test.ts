import { describe, expect, it } from "vitest";

import { runPublicAudit } from "../../src/lib/audit/public-pipeline";
import { auditSiteFixtures, createFixtureFetcher } from "../fixtures/audit-sites";

describe("current free audit pipeline", () => {
  it("returns classified evidence without calculating a score or grade", async () => {
    const result = await runPublicAudit(auditSiteFixtures.correct.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.correct),
      maxPages: 10,
      now: () => new Date("2026-09-01T10:00:00.000Z"),
    });

    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("grade");
    expect(result).not.toHaveProperty("interpretation");
    expect(result.inventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourceType: "html" }),
      expect.objectContaining({ resourceType: "robots" }),
      expect.objectContaining({ resourceType: "sitemap" }),
    ]));
    expect(result.selectedPages.every((page) => !/robots\.txt|sitemap/iu.test(page.url))).toBe(true);
  });

  it("fails instead of publishing a completed audit when no public page can be checked", async () => {
    const target = "https://private.test/login";
    const loginHtml = `<!doctype html><html lang="ru"><head><title>Вход в кабинет</title></head>
      <body><h1>Войти</h1><form action="/session"><input type="password" name="password">
      <button>Войти</button></form></body></html>`;

    await expect(runPublicAudit(target, {
      fetcher: createFixtureFetcher({
        target,
        documents: {
          [target]: { text: loginHtml },
          "https://private.test/robots.txt": { text: "User-agent: *\nAllow: /", contentType: "text/plain" },
          "https://private.test/sitemap.xml": { text: "not found", status: 404, contentType: "text/plain" },
        },
      }),
      maxPages: 10,
    })).rejects.toThrow(/no eligible public html pages/i);
  });
});
