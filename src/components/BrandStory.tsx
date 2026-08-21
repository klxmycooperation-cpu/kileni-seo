import Link from "next/link";
import { siteContent } from "@/src/content/site";

export function BrandStory() {
  return (
    <section className="brand-story section-shell" aria-labelledby="brand-story-title">
      <div className="brand-story__art" aria-hidden="true">
        <div className="brand-story__disc" />
        <div className="brand-story__axis">
          <span>BRAND</span>
          <span>PRODUCT</span>
          <span>CATALOG</span>
        </div>
        <div className="brand-story__monogram">K</div>
        <span className="brand-story__vertical">KILENI / ABOUT / 001</span>
      </div>
      <div className="brand-story__copy">
        <p className="eyebrow">05 / О БРЕНДЕ</p>
        <h2 id="brand-story-title">
          Знакомство
          <br />
          <em>с KILENI.</em>
        </h2>
        <p>{siteContent.brandDescription}</p>
        <Link className="text-link" href="/about">
          История бренда <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
