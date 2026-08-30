import { AboutPage } from "@/src/components/pages/StaticPages";
import { buildPublicMetadata } from "@/src/config/seo-metadata";

export const metadata = buildPublicMetadata("ru", "about");
export default function Page() { return <AboutPage locale="ru"/>; }
