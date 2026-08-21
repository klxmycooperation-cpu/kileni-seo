import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/audits/[token]/report.pdf": ["./public/fonts/Bounded-Variable.ttf"],
    "/api/admin/audits/[id]/export": ["./public/fonts/Bounded-Variable.ttf"],
  },
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async headers() {
    const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    return [
      { source: "/audit/:path*", headers: noIndex },
      { source: "/en/audit/:path*", headers: noIndex },
    ];
  },
  async redirects() {
    return [
      { source: "/collection", destination: "/services", permanent: true },
      { source: "/fragrance/:path*", destination: "/services", permanent: true },
      { source: "/where-to-buy", destination: "/contacts", permanent: true },
      { source: "/articles", destination: "/blog", permanent: true },
      { source: "/articles/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/en/articles", destination: "/en/blog", permanent: true },
      { source: "/en/articles/:slug", destination: "/en/blog/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
