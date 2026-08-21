import type { Metadata } from "next";
import { LegalPage } from "@/src/components/pages/StaticPages";
export const metadata: Metadata = { title: "Политика обработки данных", alternates: { canonical: "/privacy", languages: { ru: "/privacy", en: "/en/privacy", "x-default": "/privacy" } } };
export default function Page() { return <LegalPage locale="ru" kind="privacy"/>; }
