import Image from "next/image";
import Link from "next/link";
import type { Fragrance } from "@/src/content/fragrances";

type FragrancePageTemplateProps = {
  fragrance: Fragrance;
  nextFragrance: Fragrance;
};

export function FragrancePageTemplate({ fragrance, nextFragrance }: FragrancePageTemplateProps) {
  return (
    <main
      className="fragrance-page"
      style={
        {
          "--fragrance-ink": fragrance.palette.ink,
          "--fragrance-deep": fragrance.palette.deep,
          "--fragrance-mid": fragrance.palette.mid,
          "--fragrance-pale": fragrance.palette.pale,
          "--fragrance-mist": fragrance.palette.mist,
        } as React.CSSProperties
      }
    >
      <section className="fragrance-detail-hero" aria-labelledby="fragrance-title">
        <div className="fragrance-detail-hero__number" aria-hidden="true">
          {fragrance.id}
        </div>
        <div className="fragrance-detail-hero__vertical" aria-hidden="true">
          KILENI / КАТАЛОГ / {fragrance.id}
        </div>
        <div className="fragrance-detail-hero__copy">
          <p className="eyebrow">АРОМАТ / {fragrance.id}</p>
          <h1 id="fragrance-title">KILENI {fragrance.id}</h1>
          <p>{fragrance.heroPhrase}</p>
          <div className="fragrance-detail-hero__actions">
            <a className="button button--dark" href="#buy-fragrance">
              Где купить <span aria-hidden="true">↓</span>
            </a>
            <Link className="button button--line" href="/collection">
              Вся коллекция <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="fragrance-detail-hero__media">
          <Image
            src={fragrance.image}
            alt={fragrance.imageAlt}
            unoptimized
            fill
            priority
            sizes="(max-width: 767px) 84vw, 48vw"
            className="object-contain"
          />
        </div>
        <div className="fragrance-detail-hero__meta">
          <span>Аромат {fragrance.id}</span>
          <span>Информация готовится</span>
          <span>Каталог KILENI</span>
        </div>
      </section>

      <section className="fragrance-description section-shell" aria-labelledby="description-title">
        <div className="fragrance-description__lead">
          <p className="eyebrow">01 / ОПИСАНИЕ</p>
          <h2 id="description-title">
            Описание
            <br />
            <em>аромата.</em>
          </h2>
        </div>
        <div className="fragrance-description__body">
          <p>{fragrance.fullDescription}</p>
          <p className="fragrance-description__note">
            Текст будет обновлён из единого файла с контентом после утверждения названия и описания.
          </p>
        </div>
      </section>

      <section className="fragrance-notes" aria-labelledby="notes-title">
        <div className="fragrance-notes__heading">
          <p className="eyebrow">02 / СТРУКТУРА</p>
          <h2 id="notes-title">Ноты аромата</h2>
          <p>Нейтральная структура для будущего наполнения.</p>
        </div>
        <div className="fragrance-notes__list">
          {[
            ["01", "Начало", fragrance.notes.opening],
            ["02", "Сердце", fragrance.notes.heart],
            ["03", "Шлейф", fragrance.notes.trail],
          ].map(([index, label, value]) => (
            <div key={label}>
              <span>{index}</span>
              <strong>{label}</strong>
              <p>{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="fragrance-characteristics section-shell" aria-labelledby="characteristics-title">
        <div>
          <p className="eyebrow">03 / ХАРАКТЕРИСТИКИ</p>
          <h2 id="characteristics-title">Детали будут добавлены</h2>
        </div>
        <dl>
          <div>
            <dt>Название</dt>
            <dd>{fragrance.realTitle ?? "Будет указано"}</dd>
          </div>
          <div>
            <dt>Объём</dt>
            <dd>{fragrance.volume ?? "Будет указан"}</dd>
          </div>
          <div>
            <dt>Статус информации</dt>
            <dd>Готовится к публикации</dd>
          </div>
        </dl>
      </section>

      <section className="fragrance-gallery" aria-label={`Фотография KILENI ${fragrance.id}`}>
        <div className="fragrance-gallery__word" aria-hidden="true">
          KILENI
        </div>
        <div className="fragrance-gallery__image">
          <Image
            src={fragrance.image}
            alt={fragrance.imageAlt}
            unoptimized
            fill
            sizes="(max-width: 767px) 92vw, 62vw"
            className="object-contain"
          />
        </div>
        <div className="fragrance-gallery__caption">
          <span>KILENI {fragrance.id}</span>
          <span>Продукт / упаковка</span>
        </div>
      </section>

      <section id="buy-fragrance" className="fragrance-buy" aria-labelledby="fragrance-buy-title">
        <div>
          <p className="eyebrow">04 / ГДЕ КУПИТЬ</p>
          <h2 id="fragrance-buy-title">
            Способы покупки
            <br />
            <em>KILENI {fragrance.id}</em>
          </h2>
          <p>Здесь появятся только подтверждённые ссылки на официальные страницы товара.</p>
        </div>
        {fragrance.marketplaceLinks.length > 0 ? (
          <div className="fragrance-buy__links">
            {fragrance.marketplaceLinks.map((marketplace, index) => (
              <Link key={marketplace.id} href={marketplace.href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {marketplace.label}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="fragrance-buy__empty" role="status">
            <span aria-hidden="true">—</span>
            <div>
              <strong>Ссылки пока не опубликованы</strong>
              <p>Официальные площадки будут добавлены после подтверждения.</p>
            </div>
          </div>
        )}
      </section>

      <Link
        className="next-fragrance"
        href={`/fragrance/${nextFragrance.slug}`}
        style={
          {
            "--next-deep": nextFragrance.palette.deep,
            "--next-mist": nextFragrance.palette.mist,
          } as React.CSSProperties
        }
      >
        <span className="eyebrow">СЛЕДУЮЩИЙ АРОМАТ</span>
        <strong>KILENI {nextFragrance.id}</strong>
        <span aria-hidden="true">→</span>
      </Link>

      <a className="fragrance-page__sticky-buy" href="#buy-fragrance">
        Где купить KILENI {fragrance.id} <span aria-hidden="true">↑</span>
      </a>
    </main>
  );
}
