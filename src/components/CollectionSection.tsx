import Image from "next/image";
import Link from "next/link";
import { fragrances } from "@/src/content/fragrances";

export function CollectionSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="collection" className={`collection-section ${compact ? "collection-section--compact" : ""}`}>
      <div className="section-heading section-shell">
        <p className="eyebrow">КАТАЛОГ / АРОМАТЫ</p>
        <h2>
          Выберите аромат.
          <br />
          <span>У каждого — своя страница.</span>
        </h2>
      </div>

      <div className="collection-section__list">
        {fragrances.map((fragrance) => (
          <article
            key={fragrance.id}
            id={`fragrance-${fragrance.id}`}
            className="catalog-item"
            style={
              {
                "--panel-ink": fragrance.palette.ink,
                "--panel-deep": fragrance.palette.deep,
                "--panel-mid": fragrance.palette.mid,
                "--panel-pale": fragrance.palette.pale,
                "--panel-mist": fragrance.palette.mist,
              } as React.CSSProperties
            }
          >
            <Link
              className="catalog-item__media"
              href={`/fragrance/${fragrance.slug}`}
              aria-label={`Открыть страницу аромата KILENI ${fragrance.id}`}
            >
              <span className="catalog-item__number" aria-hidden="true">{fragrance.id}</span>
              <div className="catalog-item__image">
                <Image
                  src={fragrance.image}
                  alt={fragrance.imageAlt}
                  unoptimized
                  fill
                  sizes="(max-width: 767px) 88vw, (max-width: 1023px) 45vw, 30vw"
                  className="object-contain"
                  loading="lazy"
                />
              </div>
            </Link>
            <div className="catalog-item__content">
              <p className="eyebrow">АРОМАТ / {fragrance.id}</p>
              <h3>KILENI {fragrance.id}</h3>
              <p>{fragrance.shortDescription}</p>
              <Link className="text-link" href={`/fragrance/${fragrance.slug}`}>
                Подробнее об аромате <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
