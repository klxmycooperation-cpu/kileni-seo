import { createServer, type Socket } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const messages: string[] = [];
const sockets = new Set<Socket>();
let rejectNext = true;
let rejectSenderNext = false;
const smtp = createServer((socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.write("220 test SMTP\r\n");
  let buffer = "";
  let data = false;
  let message = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    let end: number;
    while ((end = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (data) {
        if (line === ".") {
          messages.push(message);
          message = "";
          data = false;
          socket.write("250 Message accepted\r\n");
        } else message += `${line}\r\n`;
      } else if (/^EHLO/i.test(line)) socket.write("250-test\r\n250 AUTH PLAIN\r\n");
      else if (/^AUTH/i.test(line)) socket.write("235 Authenticated\r\n");
      else if (/^MAIL FROM/i.test(line) && rejectSenderNext) {
        rejectSenderNext = false;
        socket.write("550 Sender configuration rejected\r\n");
      }
      else if (/^RCPT/i.test(line) && rejectNext) {
        rejectNext = false;
        socket.write("451 Temporary recipient failure\r\n");
      } else if (line === "DATA") { data = true; socket.write("354 Send data\r\n"); }
      else if (line === "QUIT") socket.end("221 Bye\r\n");
      else socket.write("250 OK\r\n");
    }
  });
});

let previous: NodeJS.ProcessEnv;
let db: typeof import("../../src/db/client");
let queries: typeof import("../../src/db/queries");
let delivery: typeof import("../../src/lib/notifications/audit-delivery");

beforeAll(async () => {
  previous = { ...process.env };
  await new Promise<void>((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  const address = smtp.address();
  if (!address || typeof address === "string") throw new Error("SMTP test port missing");
  Object.assign(process.env, {
    DATABASE_PATH: join(mkdtempSync(join(tmpdir(), "kileni-mail-recovery-")), "test.sqlite"),
    TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", VERCEL: "", APP_BASE_URL: "https://example.test",
    SMTP_HOST: "127.0.0.1", SMTP_PORT: String(address.port), SMTP_SECURE: "false",
    SMTP_USER: "local-test", SMTP_PASSWORD: "local-test", SMTP_FROM: "report@example.test",
  });
  vi.resetModules();
  db = await import("../../src/db/client");
  queries = await import("../../src/db/queries");
  delivery = await import("../../src/lib/notifications/audit-delivery");
});

afterAll(async () => {
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => smtp.close(() => resolve()));
  await db?.closeDatabaseConnections();
  process.env = previous;
});

async function completedAudit(contact = "recipient@example.test") {
  const audit = await queries.createAuditRecord({
    originalUrl: "https://example.test", normalizedDomain: "example.test", locale: "ru",
    name: "Test", contact, contactType: contact ? "email" : "none", consentVersion: "test-consent",
    ipHash: "test", userAgentHash: "test", source: "test", pageLimit: 10,
  });
  await queries.completeAuditRecord(audit.id, {
    publicResult: { pagesChecked: 3 }, fullResult: {}, score: null, grade: null,
    partial: false, pagesDiscovered: 3, pagesChecked: 3,
  });
  return audit;
}

it("recovers a completed audit after SMTP failure and does not resend an accepted message", async () => {
  const audit = await completedAudit();
  const now = Date.now();
  await delivery.deliverAuditResultEmail(audit.id, { now });
  expect(messages).toHaveLength(0);
  expect((await db.database.execute("SELECT status FROM notification_events WHERE channel='email'")).rows[0].status).toBe("failed");
  await delivery.retryPendingAuditEmails(now + 6 * 60_000);
  expect(messages).toHaveLength(1);
  expect(messages[0]).toContain("To: recipient@example.test");
  expect(messages[0]).toContain(`/audit/${audit.publicToken}`);
  await delivery.retryPendingAuditEmails(now + 12 * 60_000);
  expect(messages).toHaveLength(1);
});

it("recovers the completion-to-email restart gap and claims only one concurrent send", async () => {
  const audit = await completedAudit("restart@example.test");
  const before = messages.length;
  await Promise.all([delivery.deliverAuditResultEmail(audit.id), delivery.deliverAuditResultEmail(audit.id)]);
  expect(messages).toHaveLength(before + 1);
});

it("does not email audits without a supplied recipient", async () => {
  await completedAudit("");
  const before = messages.length;
  await delivery.retryPendingAuditEmails(Date.now() + 20 * 60_000);
  expect(messages).toHaveLength(before);
});

it("retries after a sender configuration rejection instead of permanently dropping the audit", async () => {
  const audit = await completedAudit("sender-recovery@example.test");
  const now = Date.now();
  const before = messages.length;
  rejectSenderNext = true;
  await delivery.deliverAuditResultEmail(audit.id, { now });
  expect(messages).toHaveLength(before);
  const failure = await db.database.execute({
    sql: "SELECT status,error FROM notification_events WHERE entity_id=? AND channel='email'",
    args: [audit.id],
  });
  expect(failure.rows[0].status).toBe("failed");
  expect(failure.rows[0].error).not.toBe("smtp_permanent");
  await delivery.retryPendingAuditEmails(now + 6 * 60_000);
  expect(messages).toHaveLength(before + 1);
  expect(messages.at(-1)).toContain("To: sender-recovery@example.test");
});
