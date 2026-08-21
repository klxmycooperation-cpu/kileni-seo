import type { MetadataRoute } from "next";
import { siteConfig } from "@/src/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: new URL("/sitemap.xml", siteConfig.baseUrl).toString(),
    host: siteConfig.baseUrl,
  };
}
