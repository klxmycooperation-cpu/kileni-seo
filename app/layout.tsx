import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { prelaunchRobotsMetadata, siteConfig, warnIfProductionIntegrationConfigIsIncomplete, warnIfProductionLegalConfigIsIncomplete } from "@/src/config/site";
import { INTRO_BOOTSTRAP } from "@/src/components/home/brand-intro-config";
import { ThemePreferenceSync } from "@/src/components/layout/ThemePreferenceSync";
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
import "./brand-intro-v9.css";
import "./compact-redesign.css";
import "./responsive-foundation.css";
import "./content-navigation.css";
import "./glossary-links.css";
import "./final-ui-corrections.css";
import "./visual-layer.css";
import "./spatial-depth-v2.css";
import "./canvas-text.css";
import "./floating-header.css";
import "./pricing-reference-cards.css";
import "./site-tracing-beam.css";
import "./site-continuity.css";
import "./hero-highlight.css";
import "./pin-container.css";
import "./data-visual-primitives.css";
import "./home-dashboard-redesign.css";
import "./ux-quality-pass.css";
import "./theme-contrast-completion.css";
import "./adaptive-desktop-foundation.css";
import "./design-system-foundation.css";
import "./sitewide-adaptive-pass.css";

const SKIP_LINK_BOOTSTRAP = `(() => {
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.shiftKey || event.defaultPrevented) return;
    const active = document.activeElement;
    if (active !== document.body && active !== document.documentElement) return;
    const skipLink = document.querySelector(".skip-link");
    if (!(skipLink instanceof HTMLElement)) return;
    event.preventDefault();
    skipLink.focus({ preventScroll: true });
  }, true);
})();`;

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
  return (
    <html
      lang="ru"
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
          id="kileni-skip-link-bootstrap"
          dangerouslySetInnerHTML={{ __html: SKIP_LINK_BOOTSTRAP }}
        />
        <script
          id="kileni-brand-intro-bootstrap"
          dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }}
        />
      </head>
      <body className={manrope.className}>
        <ThemePreferenceSync />
        <a className="skip-link" href="#main-content" tabIndex={0}>Перейти к содержимому</a>
        {children}
      </body>
    </html>
  );
}
