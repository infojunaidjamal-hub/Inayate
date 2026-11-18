import { all } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { VISIBLE_SQL } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default function sitemap() {
  const base = siteUrl();
  const pages = ["", "/products", "/about", "/blog", "/contact", "/shipping", "/terms", "/privacy"].map((p) => ({ url: base + p, changeFrequency: "weekly" }));
  const products = all(`SELECT id, created_at FROM products WHERE status = 'Active' AND ${VISIBLE_SQL}`).map((p) => {
    const d = new Date(String(p.created_at || "").replace(" ", "T") + "Z");
    return { url: `${base}/products/${p.id}`, ...(isNaN(d) ? {} : { lastModified: d }), changeFrequency: "weekly" };
  });
  const posts = all("SELECT slug, updated_at FROM blog_posts WHERE status = 'Published' AND date(published_at) <= date('now')").map((p) => {
    const d = new Date(String(p.updated_at || "").replace(" ", "T") + "Z");
    return { url: `${base}/blog/${p.slug}`, ...(isNaN(d) ? {} : { lastModified: d }), changeFrequency: "monthly" };
  });
  return [...pages, ...products, ...posts];
}
