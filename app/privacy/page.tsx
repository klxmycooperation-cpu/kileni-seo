import { LegalPage } from "@/src/components/pages/StaticPages";
import { buildPublicMetadata } from "@/src/config/seo-metadata";

export const metadata = buildPublicMetadata("ru", "privacy");
export default function Page() { return <LegalPage locale="ru" kind="privacy"/>; }
