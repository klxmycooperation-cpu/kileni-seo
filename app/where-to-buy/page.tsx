import type { Metadata } from "next";
import { InnerPageHero } from "@/src/components/InnerPageHero";
import { WhereToBuy } from "@/src/components/WhereToBuy";

export const metadata: Metadata = {
  title: "Где купить — KILENI",
  description: "Будущие официальные площадки покупки ароматов KILENI.",
};

export default function WhereToBuyPage() {
  return (
    <main className="inner-page where-page">
      <InnerPageHero
        index="↗"
        eyebrow="KILENI / ГДЕ КУПИТЬ"
        title={<>Где купить<br /><em>ароматы KILENI.</em></>}
        description="Официальные площадки и прямые ссылки появятся здесь после подтверждения. Сейчас активных ссылок на покупку нет."
      />
      <WhereToBuy page />
      <section className="availability-note section-shell">
        <span>ОФИЦИАЛЬНЫЕ ССЫЛКИ</span>
        <p>Мы опубликуем только подтверждённые площадки и ссылки на товары KILENI.</p>
      </section>
    </main>
  );
}
