import type { Metadata } from "next";
import { AboutPage } from "@/src/components/pages/StaticPages";
export const metadata: Metadata = { title: "О KILENI", alternates: { canonical: "/about", languages: { ru: "/about", en: "/en/about", "x-default": "/about" } } };
export default function Page() { return <AboutPage locale="ru"/>; }
