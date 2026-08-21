import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "KILENI SEO", short_name: "KILENI", description: "SEO-аудит, внедрение, продвижение и разработка", start_url: "/", display: "standalone", background_color: "#0B0D10", theme_color: "#0B0D10", icons: [{ src: "/favicon.svg", sizes: "64x64", type: "image/svg+xml" }] }; }
