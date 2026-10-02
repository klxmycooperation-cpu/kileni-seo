import type { NextConfig } from "next";

const libsqlTraceIncludes = process.env.VERCEL
  ? ["./node_modules/@libsql/**/*", "./node_modules/libsql/**/*"]
  : [
      "./node_modules/@libsql/**/*",
      "./node_modules/libsql/**/*",
      "./node_modules/.pnpm/@libsql+*/node_modules/@libsql/**/*",
      "./node_modules/.pnpm/libsql@*/node_modules/**/*",
    ];

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep the supervised localhost preview visually identical to the site.
  // Compile and runtime errors still surface in the terminal and error overlay.
  devIndicators: false,
  // The desktop preview may open the same local server through 127.0.0.1.
  // Allow that origin so client bundles and HMR do not get blocked with 403.
  allowedDevOrigins: ["127.0.0.1"],
  // Route modules initialize the local SQLite fallback while Next collects
  // build metadata. Keep that phase single-worker so parallel collectors do
  // not race over the same temporary database file in clean Docker builds.
  experimental: {
    cpus: 1,
  },
  outputFileTracingIncludes: {
    // Vercel traces the installed packages directly. Expanding pnpm's
    // internal symlinks there makes the Lambda packager treat a link as a
    // directory. Docker keeps the explicit pnpm paths used by standalone.
    "/*": libsqlTraceIncludes,
    "/api/audits/[token]/report.pdf": ["./public/fonts/Bounded-Variable.ttf"],
    "/api/admin/audits/[id]/export": ["./public/fonts/Bounded-Variable.ttf"],
  },
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
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
    ];
  },
};

export default nextConfig;
