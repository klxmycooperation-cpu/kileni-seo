import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const deferred = vi.hoisted(() => ({ tasks: [] as Array<() => Promise<unknown>> }));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (task: () => Promise<unknown>) => deferred.tasks.push(task),
}));
// A non-responsive external notification service must not hold a saved form open.
vi.mock("../../src/lib/notifications/telegram", () => ({
  notifyTelegram: () => new Promise(() => {}),
}));
vi.mock("../../src/lib/audit", async (original) => ({
  ...(await original<typeof import("../../src/lib/audit")>()),
  assertPublicUrl: async (url: URL) => ({ url }),
}));

let routes: Record<string, (request: Request) => Promise<Response>>;
let admin: typeof import("../../app/admin/_lib/data");
let db: typeof import("../../src/db/client");
let previous: NodeJS.ProcessEnv;
const contact = "boundary@example.test";

beforeAll(async () => {
  previous = { ...process.env };
  const directory = mkdtempSync(join(tmpdir(), "kileni-submission-boundary-"));
  Object.assign(process.env, {
    DATABASE_PATH: join(directory, "test.sqlite"), PRIVATE_UPLOADS_PATH: join(directory, "uploads"),
    TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", VERCEL: "",
    APP_BASE_URL: "http://localhost:3107", FORMS_ENABLED: "true", AUDIT_ENABLED: "true",
    TURNSTILE_SECRET_KEY: "", IP_HASH_SALT: "test-submission-boundary-salt-not-production",
  });
  vi.resetModules();
  db = await import("../../src/db/client");
  admin = await import("../../app/admin/_lib/data");
  routes = {
    leads: (await import("../../app/api/leads/route")).POST,
    briefs: (await import("../../app/api/briefs/route")).POST,
    calculator: (await import("../../app/api/calculator/route")).POST,
    audits: (await import("../../app/api/audits/route")).POST,
  };
});

afterAll(async () => {
  await db?.closeDatabaseConnections();
  process.env = previous;
});

describe("saved submissions do not wait for external notifications", () => {
  for (const kind of ["leads", "briefs", "calculator", "audits"] as const) {
    it(`${kind}: acknowledges persisted data and exposes it to the admin`, async () => {
      const common = { name: "Проверка формы", contact, consent: true, locale: "ru", honeypot: "" };
      const payload = kind === "audits"
        ? { url: "https://example.test", email: contact, consent: true, authority: true, locale: "ru" }
        : kind === "calculator"
          ? { ...common, kind: "audit", answers: {}, estimate: { min: 0, max: 1 } }
          : { ...common, service: "audit", ...(kind === "briefs" ? { answers: { company: "Проверка" } } : {}) };
      const headers = new Headers({ origin: "http://localhost:3107", cookie: "kileni_csrf=test-token", "x-csrf-token": "test-token" });
      let body: BodyInit;
      if (kind === "briefs") {
        const form = new FormData();
        form.set("payload", JSON.stringify(payload));
        body = form;
      } else {
        headers.set("content-type", "application/json");
        body = JSON.stringify(payload);
      }
      const response = await Promise.race([
        routes[kind](new Request(`http://localhost:3107/api/${kind}`, { method: "POST", headers, body })),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_000)),
      ]);
      expect(response, "saved request must return even while notification service stalls").not.toBeNull();
      expect(response!.status).toBe(kind === "audits" ? 202 : 201);
      if (kind === "audits") {
        const accepted = await response!.json();
        expect(await admin.adminAuditList(contact)).toEqual(expect.arrayContaining([expect.objectContaining({ publicToken: accepted.token })]));
      } else if (kind === "briefs") {
        expect(await admin.adminBriefList(contact)).toEqual(expect.arrayContaining([expect.objectContaining({ contact, status: "new" })]));
      } else {
        const leads = await admin.adminLeadList(contact);
        const lead = leads.find((item) => item.service === (kind === "calculator" ? "calculator-audit" : "audit"));
        expect(lead).toBeDefined();
        if (kind === "calculator") expect((await admin.adminLeadDetail(lead!.id))?.calculations).toHaveLength(1);
      }
    });
  }
});

function requestFor(kind: string, payload: unknown, files: File[] = []) {
  const headers = new Headers({ origin: "http://localhost:3107", cookie: "kileni_csrf=test-token", "x-csrf-token": "test-token" });
  let body: BodyInit;
  if (kind === "briefs") {
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    for (const file of files) form.append("files", file);
    body = form;
  } else { headers.set("content-type", "application/json"); body = JSON.stringify(payload); }
  return new Request(`http://localhost:3107/api/${kind}`, { method: "POST", headers, body });
}

it("stores the selected service offer and its canonical terms for the admin", async () => {
  const contact = "selected-offer@example.test";
  const response = await routes.leads(requestFor("leads", {
    name: "Проверка тарифа", contact, consent: true, locale: "ru", service: "web-development",
    offerId: "development-business", comment: "Нужен сайт компании", selectedTier: "Поддельная цена 1 рубль",
  }));
  expect(response.status).toBe(201);
  const leads = await admin.adminLeadList(contact);
  expect(leads).toHaveLength(1);
  const detail = await admin.adminLeadDetail(leads[0].id);
  expect(detail?.lead.comment).toContain("Сайт компании (development-business)");
  expect(detail?.lead.comment).toMatch(/70\s*000\s*₽/u);
  expect(detail?.lead.comment).toContain("До 5 шаблонов и 10 готовых страниц");
  expect(detail?.lead.comment).toContain("Нужен сайт компании");
  expect(detail?.lead.comment).not.toContain("Поддельная цена");
});

it("does not leave a calculator lead without its calculation when the second insert fails", async () => {
  db.sqlite.exec("CREATE TRIGGER test_fail_calculator BEFORE INSERT ON calculator_requests BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  try {
    const response = await routes.calculator(requestFor("calculator", {
      name: "Atomic calculator", contact: "atomic-calculator@example.test", consent: true, locale: "ru",
      kind: "audit", answers: {}, estimate: { min: 0, max: 1 },
    }));
    expect(response.status).toBe(500);
    expect(await admin.adminLeadList("atomic-calculator@example.test")).toHaveLength(0);
  } finally { db.sqlite.exec("DROP TRIGGER test_fail_calculator"); }
});

it("does not expose a partial brief when saving an attachment fails", async () => {
  db.sqlite.exec("CREATE TRIGGER test_fail_attachment BEFORE INSERT ON attachments BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  try {
    const response = await routes.briefs(requestFor("briefs", {
      name: "Atomic brief", contact: "atomic-brief@example.test", consent: true, locale: "ru", service: "audit", answers: {},
    }, [new File([Buffer.from("89504e470d0a1a0a", "hex")], "test.png", { type: "image/png" })]));
    expect(response.status).toBe(500);
    expect(await admin.adminBriefList("atomic-brief@example.test")).toHaveLength(0);
  } finally { db.sqlite.exec("DROP TRIGGER test_fail_attachment"); }
});
