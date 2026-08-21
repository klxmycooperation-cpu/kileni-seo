import { siteContent } from "@/src/content/site";

export function BrandManifesto() {
  return (
    <section className="manifesto section-shell" aria-labelledby="manifesto-title">
      <div className="manifesto__index">
        <span>K</span>
        <span>Как устроен каталог</span>
      </div>
      <div className="manifesto__content">
        <h2 id="manifesto-title">
          Каждый аромат —
          <br />
          <em>отдельная позиция.</em>
        </h2>
        <p>{siteContent.manifesto}</p>
      </div>
    </section>
  );
}
