import type { Metadata } from "next";
import { ContactsPage } from "@/src/components/pages/StaticPages";
export const metadata: Metadata = { title: "Контакты", alternates: { canonical: "/contacts", languages: { ru: "/contacts", en: "/en/contacts", "x-default": "/contacts" } } };
export default function Page() { return <ContactsPage locale="ru"/>; }
