import Link from "next/link";
import { existsSync } from "node:fs";
import { join } from "node:path";
import BagArt from "@/components/BagArt";
import ShopCard from "@/components/shop/ShopCard";
import ShopResults from "@/components/shop/ShopResults";
import PriceFilter from "@/components/shop/PriceFilter";
import { FilterClose, FilterApply, FilterBackdrop } from "@/components/shop/FilterButton";
import { all } from "@/lib/db";
import { withCovers } from "@/lib/images";
import { withRatings } from "@/lib/ratings";
import { VISIBLE_SQL, categoryTree, withVariantInfo } from "@/lib/catalog";
import { getUser } from "@/lib/auth";
import { shopQuery, PER_PAGE } from "@/lib/shopQuery";
import { SITE } from "@/lib/site";
import "./shop.css";

export const dynamic = "force-dynamic";
export const metadata = { title: `Products – ${SITE.name}` };

export default async function Products({ searchParams }) {
  const sp = await searchParams;
  const term = String(Array.isArray(sp.q) ? sp.q[0] : sp.q || "").trim().slice(0, 60);

  let sql = `SELECT * FROM products WHERE status = 'Active' AND ${VISIBLE_SQL}`;
  const params = [];
  if (term) {
    sql += " AND (name LIKE ? OR category LIKE ? OR material LIKE ? OR description LIKE ?)";
    const like = `%${term}%`;
    params.push(like, like, like, like);
  }
  sql += " ORDER BY id";
  const base = withVariantInfo(withRatings(withCovers(all(sql, ...params))));
  const tree = categoryTree({ onlyVisible: true });

  const s = shopQuery(base, sp, term, tree);

  const user = await getUser();
  const buyer = user && user.role === "buyer" ? user : null;
  const wish = new Set(buyer ? all("SELECT product_id FROM wishlist WHERE user_id = ?", buyer.id).map((r) => r.product_id) : []);

  // Banner par photo lagani ho to: public folder mein shop-banner.jpg rakh do
  const hasBanner = existsSync(join(process.cwd(), "public", "shop-banner.jpg"));
  const title = term ? `Results for "${term}"` : s.sub || (s.cat === "All" ? "Shop All Bags" : s.cat);

  // Category ke gol image: us category ke kisi product ki photo
  const sample = (c) => base.find((p) => (c === "All" || p.category === c) && p.image) || base.find((p) => c === "All" || p.category === c);
  const circle = (c) => {
    const photo = c === "All" ? null : tree.find((x) => x.name === c)?.photo; // seller ne category ki photo lagayi ho to wahi
    if (photo) return <img src={photo} alt="" loading="lazy" />;
    const p = sample(c);
    return p?.image ? <img src={p.image} alt="" loading="lazy" /> : <BagArt main={p?.colour_main} dark={p?.colour_dark} />;
  };

  const from = s.list.length ? (s.pageNo - 1) * PER_PAGE + 1 : 0;
  const to = Math.min(s.pageNo * PER_PAGE, s.list.length);
  const info = s.list.length ? `Showing ${from}–${to} of ${s.list.length} ${s.list.length === 1 ? "product" : "products"}` : "No products";

  return (
    <div className="shp-page">
      <section className={"shp-hero" + (hasBanner ? " has-img" : "")} style={hasBanner ? { backgroundImage: "linear-gradient(#0007,#0007), url(/shop-banner.jpg)" } : undefined}>
        <h1>{title}</h1>
        <nav className="shp-bc" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>›</span>
          {s.cat === "All" ? <b>Shop</b> : <><Link href="/products">Shop</Link><span>›</span>{s.sub ? <><Link href={s.href({ sub: "" })}>{s.cat}</Link><span>›</span><b>{s.sub}</b></> : <b>{s.cat}</b>}</>}
        </nav>
        {s.cats.length > 1 && (
          <div className="shp-circles">
            <Link href={s.href({ cat: "" })} className={"shp-circ" + (s.cat === "All" ? " on" : "")}><i>{circle("All")}</i><span>All Bags</span></Link>
            {s.cats.map((c) => (
              <Link key={c} href={s.href({ cat: c })} className={"shp-circ" + (s.cat === c ? " on" : "")}><i>{circle(c)}</i><span>{c}</span></Link>
            ))}
          </div>
        )}
      </section>

      <div className="shp">
        <FilterBackdrop />
        <aside className="shp-side" aria-label="Filters">
          <div className="shp-sidehead"><b>Filters</b><FilterClose /></div>

          <section>
            <h4 className="shp-h">Categories</h4>
            <ul className="shp-cat">
              <li><Link scroll={false} href={s.href({ cat: "" })} className={s.cat === "All" ? "on" : ""}>All Bags <em>{base.length}</em></Link></li>
              {s.cats.map((c) => (
                <li key={c}>
                  <Link scroll={false} href={s.href({ cat: c })} className={s.cat === c && !s.sub ? "on" : ""}>{c} <em>{s.catCount.get(c)}</em></Link>
                  {s.cat === c && s.subs.length > 0 && (
                    <ul className="shp-sub">
                      {s.subs.map((x) => <li key={x}><Link scroll={false} href={s.href({ sub: s.sub === x ? "" : x })} className={s.sub === x ? "on" : ""}>{x} <em>{s.subCount.get(x)}</em></Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {s.hi > s.lo && (
            <section>
              <h4 className="shp-h">Price</h4>
              <PriceFilter lo={s.lo} hi={s.hi} curLo={s.curLo} curHi={s.curHi} />
            </section>
          )}

          {s.colours.length > 0 && (
            <section>
              <h4 className="shp-h">Colour</h4>
              <div className="shp-sws">
                {s.colours.map((c) => {
                  const on = s.colour === c.name;
                  return <Link key={c.name} scroll={false} href={s.href({ colour: on ? "" : c.name })} className={"shp-sw" + (on ? " on" : "")} title={c.name} aria-label={c.name} style={{ background: c.hex }} />;
                })}
              </div>
            </section>
          )}

          {s.mats.length > 0 && (
            <section>
              <h4 className="shp-h">Material</h4>
              <div className="shp-chipsrow">
                {s.mats.map((m) => (
                  <Link key={m} scroll={false} href={s.href({ mat: s.mat === m ? "" : m })} className={s.mat === m ? "on" : ""}>{m}</Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="shp-h">Availability</h4>
            <Link scroll={false} href={s.href({ stock: s.stock ? "" : "1" })} className={"shp-check" + (s.stock ? " on" : "")}><i />In stock only</Link>
          </section>

          {s.chips.length > 0 && <Link className="shp-clear" href={s.clearAll} scroll={false}>Clear all filters</Link>}
          <FilterApply count={s.list.length} />
        </aside>

        <div className="shp-main">
          {term && (
            <p className="mut" style={{ margin: "0 0 12px" }}>
              {base.length} {base.length === 1 ? "product" : "products"} mile. <Link href="/products" style={{ textDecoration: "underline" }}>Search hatayein</Link>
            </p>
          )}
          {s.chips.length > 0 && (
            <div className="shp-chips">
              {s.chips.map((c) => <Link key={c.label} href={c.href} scroll={false}>{c.label} <span aria-hidden="true">✕</span></Link>)}
              <Link href={s.clearAll} scroll={false} className="all">Clear all</Link>
            </div>
          )}

          {s.list.length === 0 ? (
            <div className="shp-empty">
              <p>{term && !s.chips.length ? "Is naam ka koi product nahi mila. Kuch aur shabd try karein." : "In filters mein koi product nahi mila."}</p>
              {s.chips.length > 0 && <Link className="btn" href={s.clearAll}>Filters hatayein</Link>}
            </div>
          ) : (
            <ShopResults info={info} sort={s.sort}>
              {s.shown.map((p) => <ShopCard key={p.id} p={p} inWish={wish.has(p.id)} />)}
            </ShopResults>
          )}

          {s.pages > 1 && (
            <nav className="shp-pages" aria-label="Pages">
              {s.pageNo > 1 && <Link href={s.href({ page: s.pageNo - 1 })}>‹ Prev</Link>}
              {Array.from({ length: s.pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={s.href({ page: n > 1 ? n : "" })} className={n === s.pageNo ? "on" : ""} aria-current={n === s.pageNo ? "page" : undefined}>{n}</Link>
              ))}
              {s.pageNo < s.pages && <Link href={s.href({ page: s.pageNo + 1 })}>Next ›</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}