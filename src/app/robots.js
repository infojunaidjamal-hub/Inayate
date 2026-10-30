import { siteUrl } from "@/lib/seo";

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/seller", "/account", "/cart", "/checkout", "/pay", "/order", "/api", "/login"] }],
    sitemap: siteUrl() + "/sitemap.xml",
  };
}
