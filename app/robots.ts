import type { MetadataRoute } from "next";
import { siteConfig, siteIsInPrelaunchMode } from "@/src/config/site";

export default function robots(): MetadataRoute.Robots {
  if (siteIsInPrelaunchMode()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: new URL("/sitemap.xml", siteConfig.baseUrl).toString(),
  };
}
