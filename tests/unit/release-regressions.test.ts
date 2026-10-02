import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "../../app/sitemap";
import { buildPublicMetadata } from "../../src/config/seo-metadata";
import { adminFromRequest } from "../../app/admin/_lib/auth";
import { createAdminSession, verifyAdminSession } from "../../src/lib/security/session";
import { leadRequestSchema } from "../../src/lib/security/inputs";

afterEach(() => vi.unstubAllEnvs());

describe("release regressions", () => {
  it("keeps only Russian public URLs and complete metadata for the new cases", () => {
    const entries = sitemap();
    expect(entries.every(entry => !new URL(entry.url).pathname.match(/^\/en(?:\/|$)/u))).toBe(true);
    for (const slug of ["mestoest-ff", "kamenmis"]) {
      expect(entries.some(entry => new URL(entry.url).pathname === `/cases/${slug}`)).toBe(true);
      const metadata = buildPublicMetadata("ru", `cases/${slug}` as Parameters<typeof buildPublicMetadata>[1]);
      expect(metadata.title).not.toEqual({ absolute: "Страница не найдена — KILENI" });
      expect(metadata.description?.length).toBeGreaterThan(70);
      expect(metadata.alternates?.canonical).toBeTruthy();
      expect(metadata.alternates?.languages).toBeUndefined();
    }
  });

  it("rejects sessions signed with the public template secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_LOGIN", "admin");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    const key = "replace-with-at-least-32-random-characters";
    vi.stubEnv("ADMIN_SESSION_SECRET", key);
    const payload = Buffer.from(JSON.stringify({ login: "admin", exp: Date.now() + 60_000 })).toString("base64url");
    const forged = `${payload}.${createHmac("sha256", key).update(payload).digest("base64url")}`;
    expect(verifyAdminSession(forged)).toBeNull();
    expect(adminFromRequest(new Request("http://localhost/admin", { headers: { cookie: `kileni_admin=${forged}` } }))).toBeNull();
    expect(() => createAdminSession("admin")).toThrow();
  });

  it("does not authenticate a signed session when the admin password is unconfigured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_LOGIN", "admin");
    vi.stubEnv("ADMIN_SESSION_SECRET", "a-valid-private-secret-longer-than-32-characters");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    const session = createAdminSession("admin");
    expect(adminFromRequest(new Request("http://localhost/admin", { headers: { cookie: `kileni_admin=${session}` } }))).toBeNull();
  });

  it("retains a selected service offer through request validation", () => {
    const parsed = leadRequestSchema.parse({ name: "Иван", contact: "test@example.test", consent: true,
      service: "web-development", offerId: "development-business", locale: "ru" });
    expect(parsed).toHaveProperty("offerId", "development-business");
  });
});
