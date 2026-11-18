import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { seoCheck } from "@/lib/blogSeo";
import { fmtPostDate, isLive } from "@/lib/blog";
import "./blog.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog – Seller Panel" };

export default async function SellerBlog() {
  await requirePerm("blog");
  const posts = all(
    `SELECT b.*, (SELECT COUNT(*) FROM blog_post_products x WHERE x.post_id = b.id) AS pcount FROM blog_posts b ORDER BY COALESCE(b.published_at, b.created_at) DESC, b.id DESC`
  );
  return (
    <>
      <div className="sec"><h2>Blog ({posts.length})</h2><Link href="/seller/blog/new" className="btn a">+ Naya post</Link></div>
      {posts.length === 0 && <p className="mut">Abhi koi post nahi hai. &quot;Naya post&quot; se pehla post likhein.</p>}
      {posts.map((p) => {
        const seo = seoCheck({ title: p.title, slug: p.slug, excerpt: p.excerpt || "", body: p.body, metaTitle: p.meta_title || "", metaDesc: p.meta_desc || "", kw: p.focus_kw || "", coverUrl: p.cover_url || "", coverAlt: p.cover_alt || "", products: p.pcount });
        const live = isLive(p);
        return (
          <div className="row" key={p.id}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <b>{p.title}</b><br />
              <span className="mut" style={{ fontSize: 12 }}>{p.category} · /blog/{p.slug}{p.published_at ? ` · ${fmtPostDate(p.published_at)}` : ""}</span>
            </span>
            <span className={`tag ${live ? "g" : p.status === "Published" ? "y" : ""}`}>{live ? "Published" : p.status === "Published" ? "Scheduled" : "Draft"}</span>
            <span className={`tag ${seo.score >= 80 ? "g" : seo.score >= 50 ? "y" : "x"}`} title="SEO score">SEO {seo.score}</span>
            <span className="mut" style={{ fontSize: 12 }}>{p.pcount} product{p.pcount === 1 ? "" : "s"}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <Link href={`/blog/${p.slug}`} className="btn o s" target="_blank">{live ? "View" : "Preview"}</Link>
              <Link href={`/seller/blog/${p.id}`} className="btn o s">Edit</Link>
            </span>
          </div>
        );
      })}
    </>
  );
}
