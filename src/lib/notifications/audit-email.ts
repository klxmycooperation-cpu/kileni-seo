import type { Locale } from "../../config/site";
import { siteConfig } from "../../config/site";

export type AuditResultEmailInput = {
  locale: Locale;
  publicUrl: string;
  domain: string;
  completedAt?: number | string | Date | null;
  pagesChecked: number;
  partial: boolean;
};

export function buildAuditResultEmail(input: AuditResultEmailInput): { subject: string; text: string; html: string } {
  const ru = input.locale === "ru";
  const resultUrl = safePublicUrl(input.publicUrl);
  const date = formatAuditDate(input.completedAt, input.locale);
  const domain = input.domain.trim().replace(/[\r\n\t]/gu, " ").slice(0, 253) || (ru ? "указанный сайт" : "the submitted website");
  const pagesChecked = Math.max(0, Math.floor(input.pagesChecked));
  const phone = siteConfig.publicContacts.phone;
  const maxUrl = safePublicUrl(siteConfig.publicContacts.maxUrl);
  const status = input.partial
    ? (ru ? "Проверка завершена частично" : "The check completed partially")
    : (ru ? "Проверка завершена" : "The check is complete");
  const subject = ru
    ? `SEO-проверка ${domain} готова — KILENI`
    : `SEO check for ${domain} is ready — KILENI`;

  const text = ru
    ? [
        "KILENI · Результат SEO-проверки",
        "",
        `${status}.`,
        `Сайт: ${domain}`,
        `Дата проверки: ${date}`,
        `Подробно проверено страниц: ${pagesChecked}`,
        "",
        "В отчёте:",
        "— конкретные замечания по проверенным страницам;",
        "— объяснение простыми словами, почему это важно;",
        "— что уже работает и что исправлять сначала.",
        "",
        `Открыть результат: ${resultUrl}`,
        "",
        "Это бесплатная проверка публичной части сайта. Она не использует данные Яндекс Вебмастера или Google Search Console и не обещает позиции в поиске.",
        "",
        `Вопросы по результату: ${phone}`,
        `Написать в MAX: ${maxUrl}`,
        "",
        "Это сервисное письмо отправлено один раз, потому что этот e-mail указали для получения результата. Рекламная подписка не оформлена. Если вы не запускали проверку, письмо можно удалить.",
      ].join("\n")
    : [
        "KILENI · SEO check result",
        "",
        `${status}.`,
        `Website: ${domain}`,
        `Check date: ${date}`,
        `Pages checked in detail: ${pagesChecked}`,
        "",
        "The report contains:",
        "— concrete findings for the checked pages;",
        "— plain-language explanations of why they matter;",
        "— what already works and what to fix first.",
        "",
        `Open the result: ${resultUrl}`,
        "",
        "This is a free check of the public website. It does not use Yandex Webmaster or Google Search Console data and does not promise search positions.",
        "",
        `Questions about the result: ${phone}`,
        `Message us in MAX: ${maxUrl}`,
        "",
        "This one-time service email was sent because this address was entered to receive the result. No marketing subscription was created. If you did not request the check, you can delete this email.",
      ].join("\n");

  const html = auditEmailHtml({
    ru,
    resultUrl,
    domain,
    date,
    pagesChecked,
    status,
    phone,
    maxUrl,
  });
  return { subject, text, html };
}

function auditEmailHtml(input: {
  ru: boolean;
  resultUrl: string;
  domain: string;
  date: string;
  pagesChecked: number;
  status: string;
  phone: string;
  maxUrl: string;
}): string {
  const { ru } = input;
  const resultUrl = escapeHtml(input.resultUrl);
  const domain = escapeHtml(input.domain);
  const date = escapeHtml(input.date);
  const phone = escapeHtml(input.phone);
  const tel = escapeHtml(`tel:${input.phone.replace(/[^+\d]/gu, "")}`);
  const maxUrl = escapeHtml(input.maxUrl);
  const status = escapeHtml(input.status);
  const title = ru ? "Ваш SEO-отчёт готов" : "Your SEO report is ready";
  const open = ru ? "Открыть безопасный отчёт" : "Open the secure report";
  const intro = ru
    ? "Мы проверили публичные страницы сайта. В отчёте показаны факты, понятные объяснения и порядок исправлений."
    : "We checked the public website pages. The report shows facts, plain-language explanations and an order of fixes.";
  const legal = ru
    ? "Это бесплатная предварительная проверка публичной части сайта, а не данные поисковых кабинетов и не обещание позиций."
    : "This is a free preliminary check of the public website, not search-console data or a promise of rankings.";
  const serviceNote = ru
    ? "Письмо отправлено один раз, потому что этот e-mail указали для получения результата. Рекламная подписка не оформлена."
    : "This one-time email was sent because this address was entered to receive the result. No marketing subscription was created.";

  return `<!doctype html>
<html lang="${ru ? "ru" : "en"}">
<body style="margin:0;padding:0;background:#eef2f8;color:#10182b;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f8">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe2ee;border-radius:18px;overflow:hidden">
        <tr><td style="padding:24px 28px;background:#081325;color:#ffffff;border-bottom:4px solid #3d63ff">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">KILENI <span style="font-size:11px;color:#7e9aff">SEO</span></div>
          <div style="margin-top:18px;font-size:13px;color:#aebbd0">${status}</div>
          <h1 style="margin:6px 0 0;font-size:30px;line-height:1.15">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 22px;font-size:17px;line-height:1.55;color:#34415a">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background:#f6f8fc;border:1px solid #dbe2ee;border-radius:12px">
            <tr><td style="padding:14px 16px;border-bottom:1px solid #dbe2ee;color:#68758c;font-size:13px">${ru ? "Сайт" : "Website"}</td><td align="right" style="padding:14px 16px;border-bottom:1px solid #dbe2ee;font-size:14px;font-weight:700">${domain}</td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #dbe2ee;color:#68758c;font-size:13px">${ru ? "Дата" : "Date"}</td><td align="right" style="padding:14px 16px;border-bottom:1px solid #dbe2ee;font-size:14px">${date}</td></tr>
            <tr><td style="padding:14px 16px;color:#68758c;font-size:13px">${ru ? "Проверено подробно" : "Checked in detail"}</td><td align="right" style="padding:14px 16px;font-size:14px;font-weight:700">${input.pagesChecked} ${ru ? "стр." : "pages"}</td></tr>
          </table>
          <h2 style="margin:0 0 12px;font-size:18px">${ru ? "Что внутри" : "What is inside"}</h2>
          <ul style="margin:0 0 26px;padding-left:22px;color:#34415a;font-size:15px;line-height:1.7">
            <li>${ru ? "конкретные замечания по проверенным страницам" : "concrete findings for the checked pages"}</li>
            <li>${ru ? "объяснение, почему это влияет на сайт" : "plain explanations of why they matter"}</li>
            <li>${ru ? "что уже работает и что исправлять сначала" : "what already works and what to fix first"}</li>
          </ul>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px"><tr><td style="background:#3154e8;border-radius:10px"><a href="${resultUrl}" style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700">${escapeHtml(open)} →</a></td></tr></table>
          <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#68758c;word-break:break-all">${ru ? "Полный адрес отчёта" : "Full report address"}:<br><a href="${resultUrl}" style="color:#3154e8">${resultUrl}</a></p>
          <p style="margin:0;padding:16px;background:#f6f8fc;border-radius:10px;font-size:13px;line-height:1.55;color:#59667c">${escapeHtml(legal)}</p>
        </td></tr>
        <tr><td style="padding:22px 28px;background:#081325;color:#dce5f4;font-size:13px;line-height:1.6">
          <strong>${ru ? "Есть вопрос по результату?" : "Have a question about the result?"}</strong><br>
          <a href="${tel}" style="color:#ffffff">${phone}</a> · <a href="${maxUrl}" style="color:#9bb0ff">MAX</a>
          <p style="margin:14px 0 0;color:#9eabc0;font-size:11px;line-height:1.5">${escapeHtml(serviceNote)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function safePublicUrl(value: string): string {
  const fallback = new URL("/", siteConfig.baseUrl).toString();
  try {
    const url = new URL(value, siteConfig.baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function formatAuditDate(value: AuditResultEmailInput["completedAt"], locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  const valid = Number.isFinite(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(valid);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
