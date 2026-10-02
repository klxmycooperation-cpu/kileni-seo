import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicContactLinks } from "../../src/components/contact/PublicContactLinks";
import { PlatformMark } from "../../src/components/pages/MarketplacePage";
import { MarketplaceMarks } from "../../src/components/pages/ServicesExplorer";
import { marketplacePlatforms } from "../../src/content/marketplaces";

describe("public contact and marketplace assets", () => {
  it("keeps the handset readable on dark headers and white contact cards", () => {
    const phoneSvg = readFileSync(new URL("../../public/contact-icons/phone.svg", import.meta.url), "utf8");

    expect(phoneSvg).toMatch(/<svg[^>]+width="40"[^>]+height="40"[^>]+viewBox="0 0 40 40"/u);
    expect(phoneSvg).toContain('fill="#fff"');
    expect(phoneSvg).toContain('stroke="#172033"');
    expect(phoneSvg).toContain('stroke-width="1.5"');
    expect(phoneSvg).toMatch(/<path[^>]+fill="#fff"[^>]+stroke="#172033"[^>]+stroke-linejoin="round"/u);
  });

  it("keeps the phone link and local phone image in every contact-card consumer", () => {
    for (const variant of ["cards", "compact", "footer"] as const) {
      const html = renderToStaticMarkup(createElement(PublicContactLinks, { locale: "ru", variant }));

      expect(html).toContain('href="tel:+79252256020"');
      expect(html).toContain('src="/contact-icons/phone.svg"');
      expect(html).toContain('width="40" height="40"');
      expect(html).toContain('loading="eager"');
      expect(html).toContain('decoding="async"');
    }
  });

  it("keeps both header phone consumers local and unfiltered", () => {
    const header = readFileSync(new URL("../../src/components/layout/SiteHeader.tsx", import.meta.url), "utf8");

    expect(header.match(/src="\/contact-icons\/phone\.svg"/gu)).toHaveLength(2);
    expect(header).toContain('width={16} height={16}');
    expect(header).toContain('width={18} height={18}');
    expect(header).not.toContain("filter:");
  });

  it("uses each official marketplace mark's intrinsic aspect ratio in the services block", () => {
    const html = renderToStaticMarkup(createElement(MarketplaceMarks, { locale: "ru" }));

    expect(html).toContain('src="/marketplaces/wildberries.svg"');
    expect(html).toContain('src="/marketplaces/ozon.svg"');
    expect(html).toContain('src="/marketplaces/yandex-market.svg"');
    expect(html).toContain('width="500" height="75"');
    expect(html).toContain('width="485" height="106"');
    expect(html).toContain('width="194" height="37"');
    expect(html.match(/loading="eager"/gu)).toHaveLength(3);
    expect(html.match(/decoding="async"/gu)).toHaveLength(3);
  });

  it("uses stable intrinsic dimensions for official marks on the marketplaces page", () => {
    const html = marketplacePlatforms.map((platform) => renderToStaticMarkup(createElement(PlatformMark, { platform, label: platform.name }))).join("");

    expect(html).toContain('src="/marketplaces/wildberries.svg"');
    expect(html).toContain('src="/marketplaces/ozon.svg"');
    expect(html).toContain('src="/marketplaces/yandex-market.svg"');
    expect(html).toContain('width="500" height="75"');
    expect(html).toContain('width="485" height="106"');
    expect(html).toContain('width="194" height="37"');
    expect(html.match(/loading="eager"/gu)).toHaveLength(3);
    expect(html.match(/decoding="async"/gu)).toHaveLength(3);
  });

  it("preloads the first mark and keeps an accessible fallback inside a reserved mark box", () => {
    const first = marketplacePlatforms[0];
    const html = renderToStaticMarkup(createElement(PlatformMark, { platform: first, label: first.name, preload: true }));
    const css = readFileSync(new URL("../../app/architecture-10.css", import.meta.url), "utf8");

    expect(html).toMatch(/fetchpriority="high"/iu);
    expect(html).toContain(`alt="${first.name}"`);
    expect(html).toContain(`aria-label="${first.name}"`);
    expect(css).toMatch(/\.platform-mark\{[^}]*aspect-ratio:1\/1/u);
  });
});
