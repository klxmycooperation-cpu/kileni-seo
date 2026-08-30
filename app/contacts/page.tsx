import { ContactsPage } from "@/src/components/pages/StaticPages";
import { buildPublicMetadata } from "@/src/config/seo-metadata";

export const metadata = buildPublicMetadata("ru", "contacts");
export default function Page() { return <ContactsPage locale="ru"/>; }
