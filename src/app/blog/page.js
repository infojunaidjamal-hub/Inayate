import Link from "next/link";
import { SITE } from "@/lib/site";
import { listPosts, categories as getCats, fmtPostDate, readMins } from "@/lib/blog";
import { BLOG_CSS, Cover } from "@/components/BlogShared";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Blog – ${SITE.name}`,
  description: `Style ideas, bag guides and care tips from ${SITE.name}.`,
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex({ searchParams }) {
  const { cat } = await searchParams;
  const cats = getCats();
  const list = listPosts(cat && cats.includes(cat) ? cat : null);
  const [first, ...rest] = list;

  return (
    <div className="bl">
      <style>{BLOG_CSS}</style>

      <div className="bl-hero">
        <span className="bl-tag">THE {SITE.name.toUpperCase()} BLOG</span>
        <h1>Bags, style and everyday ideas.</h1>
        <p>Guides, styling tips and care advice to help you carry your everyday a little better.</p>
      </div>

      {cats.length > 1 && (
        <nav className="bl-chips" aria-label="Blog categories">
          <Link href="/blog" className={!cat ? "on" : ""}>All</Link>
          {cats.map((c) => (
            <Link key={c} href={`/blog?cat=${encodeURIComponent(c)}`} className={cat === c ? "on" : ""}>{c}</Link>
          ))}
        </nav>
      )}

      {!first && <p className="bl-empty">No posts here yet. Check back soon.</p>}

      {first && (
        <Link href={`/blog/${first.slug}`} className="bl-feat">
          <Cover post={first} />
          <div className="bl-feat-t">
            <span className="bl-tag" style={{ margin: 0 }}>{first.category.toUpperCase()}</span>
            <h2>{first.title}</h2>
            <p>{first.excerpt}</p>
            <span className="bl-meta">{fmtPostDate(first.published_at)} · {readMins(first.body)} min read</span>
            <span className="bl-more">Read the post →</span>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <div className="bl-grid">
          {rest.map((p) => (
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
      )}
    </div>
  );
}
