import { HomePage } from "@/src/components/home/HomePage";
import { buildPublicMetadata } from "@/src/config/seo-metadata";

export const metadata = buildPublicMetadata("ru", "");

export default function Home() {
  return <HomePage locale="ru"/>;
}
