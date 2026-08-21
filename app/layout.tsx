import type { Metadata } from "next";
import { headers } from "next/headers";
import { Manrope } from "next/font/google";
import { prelaunchRobotsMetadata, siteConfig, warnIfProductionIntegrationConfigIsIncomplete, warnIfProductionLegalConfigIsIncomplete } from "@/src/config/site";
import { INTRO_BOOTSTRAP } from "@/src/components/home/brand-intro-config";
import { THEME_BOOTSTRAP } from "@/src/components/layout/theme-config";
import "./globals.css";
import "./editorial.css";
import "./brand-intro.css";
import "./site-redesign.css";
import "./audit-progress-refinement.css";
import "./audit-live-overlay.css";
import "./kileni-10.css";
import "./home-10.css";
import "./theme.css";
import "./architecture-10.css";
import "./analytics-visuals.css";
import "./soft-surfaces.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"],
  display: "optional",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: {
    default: "KILENI — SEO, сайты и реклама",
    template: "%s — KILENI",
  },
  description: "KILENI проверяет и исправляет сайты, занимается SEO, рекламой и карточками для Wildberries и Ozon.",
  applicationName: "KILENI",
  keywords: ["SEO-аудит", "SEO-продвижение", "разработка сайтов", "Wildberries", "Ozon", "KILENI"],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: { type: "website", siteName: "KILENI", images: [{ url: "/brand/kileni-og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/brand/kileni-og.png"] },
  robots: prelaunchRobotsMetadata(),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  warnIfProductionLegalConfigIsIncomplete();
  warnIfProductionIntegrationConfigIsIncomplete();
  const locale = (await headers()).get("x-kileni-locale") === "en" ? "en" : "ru";
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim() && process.env.TURNSTILE_SECRET_KEY?.trim()
    ? process.env.TURNSTILE_SITE_KEY.trim()
    : undefined;
  return (
    <html
      lang={locale}
      className={manrope.variable}
      data-kileni-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          id="kileni-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
        <script
          id="kileni-brand-intro-bootstrap"
          dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }}
        />
      </head>
      <body className={manrope.className} data-turnstile-site-key={turnstileSiteKey}>
        <a className="skip-link" href="#main-content">{locale === "ru" ? "Перейти к содержимому" : "Skip to content"}</a>
        {children}
      </body>
    </html>
  );
}
