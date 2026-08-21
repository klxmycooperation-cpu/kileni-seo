import type { Metadata } from "next";
import { LegalPage } from "@/src/components/pages/StaticPages";
export const metadata: Metadata = { title: "Согласие на обработку данных", alternates: { canonical: "/consent", languages: { ru: "/consent", en: "/en/consent", "x-default": "/consent" } } };
export default function Page() { return <LegalPage locale="ru" kind="consent"/>; }
