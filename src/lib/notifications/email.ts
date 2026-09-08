import nodemailer from "nodemailer";

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string; messageId?: string }): Promise<{ sent: boolean; reason?: string; retryable?: boolean }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  if (!host || !user || !password || !from) return { sent: false, reason: "not_configured" };
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass: password },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    });
    try {
      const result = await transporter.sendMail({ from, to: input.to, subject: input.subject, text: input.text, html: input.html,
        ...(input.messageId ? { messageId: input.messageId } : {}),
      });
      return result.accepted?.length > 0 ? { sent: true } : { sent: false, reason: "recipient_not_accepted", retryable: false };
    } finally {
      transporter.close();
    }
  } catch (error) {
    const smtp = error as { code?: string; responseCode?: number; command?: string };
    // Provider messages can contain recipients or SMTP credentials; store codes only.
    return { sent: false, reason: `smtp_${String(smtp?.code ?? "failed").replace(/[^a-z0-9_]/giu, "").slice(0, 40)}${smtp?.responseCode ? `_${smtp.responseCode}` : ""}`,
      // Sender/configuration failures can recover without changing the recipient.
      retryable: !(smtp?.code === "EENVELOPE" && smtp.command === "RCPT TO" && smtp.responseCode && smtp.responseCode >= 500 && smtp.responseCode < 600),
    };
  }
}
