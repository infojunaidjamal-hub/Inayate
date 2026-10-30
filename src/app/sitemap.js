import { all } from "@/lib/db";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function sitemap() {
  const base = siteUrl();
  const pages = ["", "/products", "/about", "/contact", "/shipping", "/terms", "/privacy"].map((p) => ({ url: base + p, changeFrequency: "weekly" }));
  const products = all("SELECT id, created_at FROM products WHERE status = 'Active'").map((p) => {
    const d = new Date(String(p.created_at || "").replace(" ", "T") + "Z");
    return { url: `${base}/products/${p.id}`, ...(isNaN(d) ? {} : { lastModified: d }), changeFrequency: "weekly" };
  });
  return [...pages, ...products];
}
