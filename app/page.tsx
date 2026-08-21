import type { Metadata } from "next";
import { HomePage } from "@/src/components/home/HomePage";

export const metadata: Metadata = {
  title: "KILENI — SEO, разработка и digital-решения",
  description: "Бесплатная SEO-проверка до 10 ключевых публичных страниц: общая оценка, основные зоны риска и понятный следующий шаг.",
  alternates: { canonical: "/", languages: { ru: "/", en: "/en", "x-default": "/" } },
};

export default function Home() {
  return <HomePage locale="ru"/>;
}
