import { afterEach, describe, expect, it, vi } from "vitest";

const { createTransportMock, sendMailMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(),
  sendMailMock: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

import { sendEmail } from "../../src/lib/notifications/email";

describe("отправка сервисного письма", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it.each([
    ["MAIL FROM", 550, true],
    ["DATA", 550, true],
    ["RCPT TO", 451, true],
    ["RCPT TO", 550, false],
  ])("классифицирует отказ %s %i для повторной доставки", async (command, responseCode, retryable) => {
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "test-password");
    vi.stubEnv("SMTP_FROM", "report@example.test");
    const close = vi.fn();
    createTransportMock.mockReturnValue({ sendMail: sendMailMock, close });
    sendMailMock.mockRejectedValueOnce({ code: "EENVELOPE", responseCode, command });
    await expect(sendEmail({ to: "recipient@example.test", subject: "Test", text: "Test" }))
      .resolves.toMatchObject({ sent: false, retryable });
    expect(close).toHaveBeenCalledOnce();
  });

  it("передаёт SMTP-серверу адрес получателя и готовое письмо", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_SECURE", "false");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "password");
    vi.stubEnv("SMTP_FROM", "KILENI <report@example.test>");
    sendMailMock.mockResolvedValue({ messageId: "smtp-message", accepted: ["recipient@example.test"] });
    createTransportMock.mockReturnValue({ sendMail: sendMailMock, close: vi.fn() });

    await expect(sendEmail({
      to: "recipient@example.test",
      subject: "SEO-проверка готова",
      text: "Откройте отчёт",
      html: "<p>Откройте отчёт</p>",
    })).resolves.toEqual({ sent: true });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      auth: { user: "mailer", pass: "password" },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "KILENI <report@example.test>",
      to: "recipient@example.test",
      subject: "SEO-проверка готова",
      text: "Откройте отчёт",
      html: "<p>Откройте отчёт</p>",
    });
  });
});
