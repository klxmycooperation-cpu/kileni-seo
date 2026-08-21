import Link from "next/link";
import { fragrances } from "@/src/content/fragrances";

export function WhereToBuy({ page = false }: { page?: boolean }) {
  const links = fragrances
    .flatMap((fragrance) => fragrance.marketplaceLinks)
    .filter((link, index, all) => all.findIndex((item) => item.id === link.id) === index);

  return (
    <section className={`where-to-buy ${page ? "where-to-buy--page" : ""}`} aria-labelledby="buy-title">
      <div className="where-to-buy__heading">
        <p className="eyebrow">{page ? "СПОСОБЫ ПОКУПКИ" : "06 / ГДЕ КУПИТЬ"}</p>
        <h2 id="buy-title">
          Где купить
          <br />
          <em>ароматы KILENI</em>
        </h2>
        <p>
          Здесь будут только подтверждённые площадки и прямые ссылки на товары.
        </p>
      </div>
      {links.length > 0 ? (
        <div className="where-to-buy__links">
          {links.map((link, index) => (
            <Link key={link.id} id={page ? link.id : undefined} href={link.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{link.label}</strong>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="where-to-buy__empty" role="status">
          <span className="where-to-buy__empty-index" aria-hidden="true">—</span>
          <div>
            <strong>Подтверждённых ссылок пока нет</strong>
            <p>Мы добавим площадки сюда, когда будут доступны официальные страницы товаров.</p>
          </div>
        </div>
      )}
    </section>
  );
}
