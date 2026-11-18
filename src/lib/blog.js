// Blog ka data: seller panel mein likhe posts database (blog_posts) se aate hain.
import { all, one } from "@/lib/db";
import { withCovers } from "@/lib/images";

export const wordCount = (md) => String(md || "").replace(/\{\{product:\d+\}\}/g, "").split(/\s+/).filter(Boolean).length;
export const readMins = (md) => Math.max(1, Math.round(wordCount(md) / 200));
export const fmtPostDate = (d) =>
  new Date(String(d).slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const PUB = "status = 'Published' AND date(published_at) <= date('now')";

export const listPosts = (cat) =>
  cat
    ? all(`SELECT * FROM blog_posts WHERE ${PUB} AND category = ? ORDER BY published_at DESC, id DESC`, cat)
    : all(`SELECT * FROM blog_posts WHERE ${PUB} ORDER BY published_at DESC, id DESC`);
export const categories = () => all(`SELECT DISTINCT category FROM blog_posts WHERE ${PUB} ORDER BY category`).map((r) => r.category);
export const getPostBySlug = (slug) => one("SELECT * FROM blog_posts WHERE slug = ?", String(slug));
export const getPostById = (id) => one("SELECT * FROM blog_posts WHERE id = ?", Number(id));
export const isLive = (p) => p.status === "Published" && String(p.published_at || "").slice(0, 10) <= new Date().toISOString().slice(0, 10);

export const linkedProductIds = (postId) =>
  all("SELECT product_id FROM blog_post_products WHERE post_id = ? ORDER BY position, product_id", postId).map((r) => r.product_id);

// Post se juda products (sirf Active wale shop mein dikhte hain)
export function productsByIds(ids, onlyActive = true) {
  if (!ids.length) return [];
  const rows = all(`SELECT * FROM products WHERE id IN (${ids.map(() => "?").join(",")})${onlyActive ? " AND status = 'Active'" : ""}`, ...ids);
  const by = Object.fromEntries(withCovers(rows).map((r) => [r.id, r]));
  return ids.map((i) => by[i]).filter(Boolean);
}

export function relatedPosts(post, n = 3) {
  const live = listPosts().filter((p) => p.id !== post.id);
  return [...live.filter((p) => p.category === post.category), ...live.filter((p) => p.category !== post.category)].slice(0, n);
}

export const allBlogCategories = () => all("SELECT DISTINCT category FROM blog_posts ORDER BY category").map((r) => r.category);
export const productPickerList = () => withCovers(all("SELECT id, name, sku, category, price, status FROM products ORDER BY id DESC"));
