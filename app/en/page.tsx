import { HomePage } from "@/src/components/home/HomePage";
import { buildPublicMetadata } from "@/src/config/seo-metadata";

export const metadata = buildPublicMetadata("en", "");
export default function EnglishHome() { return <HomePage locale="en"/>; }
