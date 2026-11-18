"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { storeImage, deleteStored } from "@/lib/images";
import { slugify } from "@/lib/blogSeo";

const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Blog post save (naya ya purana) ---------- */
export async function saveBlog(prev, form) {
  const me = await requirePerm("blog"); // har action mein check zaroori hai
  const id = Number(form.get("id") || 0);
  const g = (k) => String(form.get(k) ?? "").trim();
  const v = {
    title: g("title").slice(0, 150),
    slug: slugify(g("slug") || g("title")),
    excerpt: g("excerpt").slice(0, 300),
    body: String(form.get("body") ?? "").replace(/\r/g, "").slice(0, 60000),
    category: g("category").slice(0, 40) || "General",
    cover_alt: g("cover_alt").slice(0, 150),
    meta_title: g("meta_title").slice(0, 70),
    meta_desc: g("meta_desc").slice(0, 200),
    focus_kw: g("focus_kw").slice(0, 80),
    status: g("status"),
    published_at: g("published_at"),
  };
  const productIds = [...new Set(form.getAll("products").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 12);
  const fail = (error) => ({ error, values: { ...v, products: productIds } });

  if (v.title.length < 3) return fail("Post ka title likhein.");
  if (!v.slug) return fail("URL (slug) khali nahi ho sakta.");
  if (![ "Draft", "Published" ].includes(v.status)) return fail("Status chuniye.");
  if (v.status === "Published" && v.body.trim().length < 50) return fail("Publish karne se pehle post mein kuch text likhein.");
  if (v.published_at && !/^\d{4}-\d{2}-\d{2}$/.test(v.published_at)) return fail("Publish date sahi chuniye.");
  if (one("SELECT id FROM blog_posts WHERE slug = ? AND id <> ?", v.slug, id)) return fail("Ye URL (slug) kisi aur post ka hai. Alag likhein.");

  const old = id ? one("SELECT * FROM blog_posts WHERE id = ?", id) : null;
  if (id && !old) return fail("Post nahi mila.");

  // Cover photo
  let cover = old?.cover_url || null;
  const file = form.get("cover");
  if (file && typeof file !== "string" && file.size > 0) {
    const r = await storeImage(file, "blog-");
    if (r.error) return fail(r.error);
    if (cover) await deleteStored(cover);
    cover = r.url;
  } else if (form.get("remove_cover") && cover) {
    await deleteStored(cover);
    cover = null;
  }

  // Sirf wahi products jo sach mein hain
  const okIds = productIds.length
    ? all(`SELECT id FROM products WHERE id IN (${productIds.map(() => "?").join(",")})`, ...productIds).map((r) => r.id)
    : [];
  const ordered = productIds.filter((i) => okIds.includes(i));

  const pub = v.status === "Published" ? (v.published_at || old?.published_at || today()) : (v.published_at || old?.published_at || null);
  let pid = id;
  transaction(() => {
    if (id) {
      run(
        `UPDATE blog_posts SET slug=?, title=?, excerpt=?, body=?, category=?, cover_url=?, cover_alt=?, meta_title=?, meta_desc=?, focus_kw=?,
         status=?, published_at=?, updated_at=datetime('now') WHERE id=?`,
        v.slug, v.title, v.excerpt, v.body, v.category, cover, v.cover_alt, v.meta_title, v.meta_desc, v.focus_kw, v.status, pub, id
      );
    } else {
      run(
        `INSERT INTO blog_posts (slug, title, excerpt, body, category, cover_url, cover_alt, meta_title, meta_desc, focus_kw, status, author, published_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        v.slug, v.title, v.excerpt, v.body, v.category, cover, v.cover_alt, v.meta_title, v.meta_desc, v.focus_kw, v.status, me.name || "", pub
      );
      pid = Number(one("SELECT last_insert_rowid() AS i").i);
    }
    run("DELETE FROM blog_post_products WHERE post_id = ?", pid);
    ordered.forEach((prod, i) => run("INSERT INTO blog_post_products (post_id, product_id, position) VALUES (?,?,?)", pid, prod, i));
  });

  logAct(me, id ? "Blog badla" : "Blog likha", `${v.title} (${v.status})`);
  revalidatePath("/blog");
  revalidatePath(`/blog/${v.slug}`);
  if (old && old.slug !== v.slug) revalidatePath(`/blog/${old.slug}`);
  redirect(`/seller/blog/${pid}?saved=1`);
}

/* ---------- Blog post delete ---------- */
export async function deleteBlog(form) {
  const me = await requirePerm("blog");
  const id = Number(form.get("id") || 0);
  const p = one("SELECT * FROM blog_posts WHERE id = ?", id);
  if (!p) redirect("/seller/blog");
  run("DELETE FROM blog_posts WHERE id = ?", id);
  if (p.cover_url) await deleteStored(p.cover_url);
  logAct(me, "Blog hataya", p.title);
  revalidatePath("/blog");
  revalidatePath(`/blog/${p.slug}`);
  redirect("/seller/blog");
}
