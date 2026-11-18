import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { abs } from "@/lib/seo";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/perms";
import { getPostBySlug, isLive, linkedProductIds, productsByIds, relatedPosts, fmtPostDate, readMins } from "@/lib/blog";
import { parseBlocks, productIdsIn } from "@/lib/mdlite";
import { BLOG_CSS, Cover } from "@/components/BlogShared";
import BlogBody from "@/components/BlogBody";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || !isLive(post)) return { title: `Post not found – ${SITE.name}`, robots: { index: false } };
  const title = post.meta_title || post.title;
  const desc = (post.meta_desc || post.excerpt || "").trim();
  return {
    title: `${title} – ${SITE.name}`,
    description: desc,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title, description: desc, type: "article", url: `/blog/${post.slug}`,
      publishedTime: post.published_at, modifiedTime: String(post.updated_at).replace(" ", "T") + "Z",
      images: post.cover_url ? [{ url: abs(post.cover_url) }] : [],
    },
    twitter: { card: post.cover_url ? "summary_large_image" : "summary", title, description: desc },
  };
}

export default async function BlogPost({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const live = isLive(post);
  if (!live) {
    // Draft ya aage ki date wala post sirf staff ko preview mein dikhta hai
    const user = await getUser();
    if (!user || !can(user.role, "blog")) notFound();
  }

  const linked = linkedProductIds(post.id);
  const embedIds = productIdsIn(post.body);
  const shown = productsByIds([...new Set([...linked, ...embedIds])]);
  const byId = Object.fromEntries(shown.map((p) => [p.id, p]));
  const shelf = linked.map((i) => byId[i]).filter(Boolean);
  const toc = parseBlocks(post.body).filter((b) => b.t === "h2");
  const related = relatedPosts(post);

  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_desc || post.excerpt || undefined,
    image: post.cover_url ? [abs(post.cover_url)] : undefined,
    datePublished: post.published_at,
    dateModified: String(post.updated_at).replace(" ", "T") + "Z",
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: abs(`/blog/${post.slug}`),
  };

  return (
    <div className="bl">
      <style>{BLOG_CSS}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />

      <article className="bl-post">
        <Link href="/blog" className="bl-back">← All posts</Link>
        {!live && <p className="bl-draft">Preview: ye post abhi customers ko nahi dikh raha ({post.status === "Published" ? "scheduled hai" : "draft hai"}).</p>}
        <div>
          <span className="bl-tag" style={{ margin: 0 }}>{post.category.toUpperCase()}</span>
          <h1>{post.title}</h1>
          <span className="bl-meta">{post.published_at ? `${fmtPostDate(post.published_at)} · ` : ""}{readMins(post.body)} min read</span>
        </div>
        <Cover post={post} />

        {toc.length >= 3 && (
          <nav className="bl-toc" aria-label="In this post">
            <b>IN THIS POST</b>
            <ol>{toc.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
          </nav>
        )}

        <BlogBody md={post.body} products={byId} />

        {shelf.length > 0 && (
          <section className="bl-shop" aria-labelledby="shop-story">
            <h2 id="shop-story">Shop the story</h2>
            <p>Bags and picks mentioned in this post.</p>
            <div className="grid-p">{shelf.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
        )}

        <div className="bl-end">
          <h2>Find your everyday bag</h2>
          <p>Browse the {SITE.name} collection and pick the one that fits your day.</p>
          <Link href="/products" className="btn a">Shop the collection</Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="bl-related">
          <h2>Keep reading</h2>
          <div className="bl-grid">
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="bl-card">
                <Cover post={p} />
                <div className="bl-card-t">
                  <span className="bl-tag" style={{ margin: 0 }}>{p.category.toUpperCase()}</span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <span className="bl-meta">{fmtPostDate(p.published_at)} · {readMins(p.body)} min read</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
