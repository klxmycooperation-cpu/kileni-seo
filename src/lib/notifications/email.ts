import nodemailer from "nodemailer";

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<{ sent: boolean; reason?: string }> {
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
    });
    await transporter.sendMail({ from, to: input.to, subject: input.subject, text: input.text, html: input.html });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message.slice(0, 240) : "smtp_failed" };
  }
}
