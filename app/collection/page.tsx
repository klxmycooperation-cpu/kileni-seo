import type { Metadata } from "next";
import { CollectionSection } from "@/src/components/CollectionSection";
import { InnerPageHero } from "@/src/components/InnerPageHero";
import { FutureCollection } from "@/src/components/FutureCollection";

export const metadata: Metadata = {
  title: "Коллекция — KILENI",
  description: "Все доступные позиции каталога ароматов KILENI.",
};

export default function CollectionPage() {
  return (
    <main className="inner-page">
      <InnerPageHero
        index="K"
        eyebrow="KILENI / КОЛЛЕКЦИЯ"
        title={<>Каталог<br /><em>ароматов.</em></>}
        description="Все доступные позиции KILENI собраны здесь. Откройте аромат, чтобы посмотреть его отдельную страницу."
      />
      <CollectionSection compact />
      <FutureCollection />
    </main>
  );
}
