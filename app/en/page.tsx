import type { Metadata } from "next";
import { HomePage } from "@/src/components/home/HomePage";
export const metadata: Metadata = { title: "KILENI — SEO, development and digital delivery", description: "A free SEO check for up to 10 key public pages with an overall score, clear risk areas and a practical next step.", alternates: { canonical: "/en", languages: { ru: "/", en: "/en", "x-default": "/" } } };
export default function EnglishHome() { return <HomePage locale="en"/>; }
