import Link from "next/link";
import BagArt from "@/components/BagArt";
import ProductCard from "@/components/ProductCard";
import HeroSlider from "@/components/HeroSlider";
import { all, inr } from "@/lib/db";
import { SITE } from "@/lib/site";
import { homePic, slug } from "@/lib/homePics";
import { withCovers } from "@/lib/images";

export const dynamic = "force-dynamic";

const CSS = `
.hm section{margin-top:54px}
.hm h1,.hm h2,.hm h3{margin:0}
.hm-title{text-align:center;margin-bottom:26px}
.hm-title small{display:block;letter-spacing:2px;font-size:11px;font-weight:500;color:var(--acc);margin-bottom:6px}
.hm-title h2{font-size:clamp(24px,4vw,34px);margin:0}
.hm-title:after{content:"";display:block;width:54px;height:3px;background:var(--acc);border-radius:2px;margin:12px auto 0}
.hm-row{display:flex;justify-content:space-between;align-items:center;margin-top:18px}


/* hero slider */
.hm-hero{position:relative;border-radius:24px;overflow:hidden;min-height:400px}
.hm-slide{position:absolute;inset:0;display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:20px;padding:34px 56px;opacity:0;pointer-events:none;transition:opacity .7s ease}
.hm-slide.on{opacity:1;pointer-events:auto}
.hm-tag{letter-spacing:2.5px;font-size:12px;font-weight:500;margin:0 0 10px;color:var(--acc)}
.hm-slide h1{font-size:clamp(30px,5vw,50px);line-height:1.12;margin-bottom:12px}
.hm-sub{font-size:16px;max-width:430px;margin:0 0 22px}
.hm-slide .btn{padding:12px 28px;font-size:14px}
.hm-slide-v{height:100%;display:grid;place-items:center}
.hm-slide-v svg{width:min(270px,85%);filter:drop-shadow(0 18px 24px #2a262326)}
.hm-slide-v img{width:100%;height:100%;max-height:340px;object-fit:cover;border-radius:20px}
.hm-arr{position:absolute;top:50%;transform:translateY(-50%);width:38px;height:38px;border-radius:50%;border:0;background:#ffffffcc;font-size:24px;line-height:1;cursor:pointer;color:var(--ink);z-index:2}
.hm-arr.l{left:12px}.hm-arr.r{right:12px}
.hm-dots{position:absolute;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:8px;z-index:2}
.hm-dots button{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:#2a262344;cursor:pointer}
.hm-dots button.on{background:var(--ink);width:24px;border-radius:6px}

/* trust strip */
.hm-trust{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px}
.hm-trust div{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.hm-trust i{flex:none;width:44px;height:44px;border-radius:50%;background:var(--rose);display:grid;place-items:center;font-size:20px;font-style:normal}
.hm-trust b{display:block;font-size:13.5px;font-weight:500}
.hm-trust small{color:var(--mut);font-size:12px}

/* categories */
.hm-cats{background:linear-gradient(180deg,#fbeee9,#f6e3da);border-radius:24px;padding:34px 20px 30px}
.hm-cats .hm-title{margin-bottom:22px}
.hm-catrow{display:flex;justify-content:center;gap:26px;flex-wrap:wrap}
.hm-cat{text-align:center;width:112px}
.hm-cat .c{width:104px;height:104px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;overflow:hidden;border:3px solid #fff;box-shadow:0 6px 16px #2a26231a;transition:transform .25s}
.hm-cat:hover .c{transform:translateY(-4px) scale(1.04)}
.hm-cat .c img{width:100%;height:100%;object-fit:cover}
.hm-cat .c svg{width:62%}
.hm-cat b{display:block;font-size:13px;font-weight:500}
.hm-cat small{color:var(--mut);font-size:11px}

/* reels / top deals */
.hm-reels{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.hm-reel{position:relative;display:block;aspect-ratio:9/14;border-radius:18px;overflow:hidden;color:var(--ink)}
.hm-reel .a{position:absolute;inset:0 0 70px 0;display:grid;place-items:center}
.hm-reel .a svg{width:58%;filter:drop-shadow(0 10px 14px #2a262322)}
.hm-reel .off{z-index:1;position:absolute;top:10px;left:10px;background:#1f8a4c;color:#fff;font-size:11px;padding:2px 9px;border-radius:10px}
.hm-reel .m{z-index:1;position:absolute;left:8px;right:8px;bottom:8px;background:#fffffff2;border-radius:12px;padding:8px 10px}
.hm-reel .m b{display:block;font:500 12.5px Poppins;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hm-reel .m span{font-size:12px;color:var(--mut)}

/* product grids */
.hm-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.hm-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}

/* banner */
.hm-banner{position:relative;border-radius:24px;overflow:hidden;background:linear-gradient(110deg,#2a2623,#4a3a2e);color:var(--bg);padding:44px 44px;display:grid;grid-template-columns:1.2fr .8fr;align-items:center;gap:20px}
.hm-banner small{letter-spacing:3px;font-size:12px;color:#f6e3a8}
.hm-banner h2{font-size:clamp(28px,4.5vw,42px);color:var(--bg);margin:6px 0 10px}
.hm-banner p{color:#e8dfd4;margin:0 0 20px;max-width:420px}
.hm-banner svg{width:min(210px,70%);margin:auto;display:block}

/* behind the scenes */
.hm-bts{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:30px}
.hm-bts-v{aspect-ratio:4/3;border-radius:18px;overflow:hidden;background:linear-gradient(135deg,#f3e3d3,#e9c9c0);display:grid;place-items:center}
.hm-bts-v img{width:100%;height:100%;object-fit:cover}
.hm-bts-v svg{width:42%}
.hm-bts small{letter-spacing:2px;font-size:11px;font-weight:500;color:var(--acc)}
.hm-bts h2{font-size:clamp(24px,3.6vw,32px);margin:6px 0 10px}
.hm-bts p{color:var(--mut);margin:0 0 18px}
.hm-flow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.hm-flow span{background:var(--bg);border:1px solid var(--line);border-radius:20px;padding:6px 14px;font-size:12.5px}

/* instagram */
.hm-insta{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.hm-insta a{aspect-ratio:1;border-radius:14px;overflow:hidden;display:grid;place-items:center;position:relative}
.hm-insta img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.hm-insta svg{width:52%}
.hm-insta a:hover{opacity:.9}
.hm-follow{text-align:center;margin-top:18px}

@media(max-width:900px){
  .hm-trust{grid-template-columns:1fr 1fr}
  .hm-grid4{grid-template-columns:1fr 1fr}
  .hm-reels{grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:46%;overflow-x:auto;padding-bottom:6px}
  .hm-insta{grid-template-columns:repeat(3,1fr)}
  .hm-banner,.hm-bts{grid-template-columns:1fr;padding:28px 22px}
  .hm-banner svg{display:none}
}
@media(max-width:700px){
  .hm-hero{min-height:500px}
  .hm-slide{grid-template-columns:1fr;grid-template-rows:auto 150px;align-content:center;padding:28px 22px 44px;gap:10px}
  .hm-slide-v svg{width:130px}
  .hm-slide-v img{max-height:150px}
  .hm-arr{display:none}
  .hm-two{grid-template-columns:1fr 1fr;gap:10px}
}
@media(max-width:480px){.hm-trust{grid-template-columns:1fr}}
`;

const HERO = [
  { tag: "NEW ARRIVALS", title: "Carry your story in style", text: "Handbags for every day, every occasion. Fresh designs, made to be loved.", cta: "Shop Now", href: "/products", bg: "linear-gradient(120deg,#e9c9c0,#f3e3d3)", c1: "#b8865b", c2: "#8a5d3a", img: homePic("hero-1") },
  { tag: "BEST SELLERS", title: "The bags everyone is ordering", text: "Our most-loved styles, picked by customers like you.", cta: "See Best Sellers", href: "/products", bg: "linear-gradient(120deg,#f1e2cd,#ead2bd)", c1: "#c97b84", c2: "#9a4f58", img: homePic("hero-2") },
  { tag: "FREE SHIPPING", title: `Free shipping above ${inr(SITE.freeShippingAbove)}`, text: `Cash on Delivery available. Easy ${SITE.returnDays}-day returns on every order.`, cta: "Start Shopping", href: "/products", bg: "linear-gradient(120deg,#dde8dc,#f1e8dd)", c1: "#6f8f72", c2: "#4d6a50", img: homePic("hero-3") },
];

const INSTA_COLORS = [["#b8865b", "#8a5d3a"], ["#c97b84", "#9a4f58"], ["#6f8f72", "#4d6a50"], ["#7d94b5", "#566b8c"], ["#d9a441", "#a87a22"], ["#8a6a9e", "#634a76"]];
const INSTA_BG = ["#f3e3d3", "#f6dfe2", "#e3ede3", "#e1e9f3", "#f7ecd3", "#ece3f1"];

export default function Home() {
  const products = withCovers(all("SELECT * FROM products WHERE status = 'Active' ORDER BY id"));
  const discount = (p) => (p.mrp > p.price ? (p.mrp - p.price) / p.mrp : 0);

  // category ke gol icon: category ki photo > us category ke pehle product ki photo > drawing
  const catMap = new Map();
  for (const p of products) {
    if (!catMap.has(p.category)) catMap.set(p.category, { category: p.category, n: 0, image: null, colour_main: p.colour_main, colour_dark: p.colour_dark });
    const c = catMap.get(p.category);
    c.n += 1;
    if (!c.image && p.image) c.image = p.image;
  }
  const cats = [...catMap.values()].slice(0, 6);

  // best sellers: asli orders se (cancel hue orders ginti mein nahi)
  const soldRows = all(
    `SELECT oi.product_id, SUM(oi.qty) q FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status NOT IN ('Cancelled', 'Awaiting Payment') GROUP BY oi.product_id`
  );
  const sold = Object.fromEntries(soldRows.map((r) => [r.product_id, r.q]));
  const best = [...products].sort((a, b) => (sold[b.id] || 0) - (sold[a.id] || 0) || a.id - b.id).slice(0, 4);
  const deals = [...products].sort((a, b) => discount(b) - discount(a) || a.id - b.id).slice(0, 5);
  const fresh = [...products].sort((a, b) => b.id - a.id).slice(0, 2);

  const bts = homePic("bts");
  const ig = SITE.instagram;
  const igHref = ig ? `https://instagram.com/${ig}` : "/products";

  return (
    <div className="hm">
      <style>{CSS}</style>

      {/* 2. Hero slider */}
      <HeroSlider slides={HERO} />

      {/* 3. Trust strip */}
      <div className="hm-trust">
        <div><i>🚚</i><span><b>Fast Delivery</b><small>Dispatch in {SITE.dispatchDays}</small></span></div>
        <div><i>🔒</i><span><b>Safe Payment</b><small>UPI, Cards and COD</small></span></div>
        <div><i>💬</i><span><b>Customer Support</b><small>WhatsApp and email help</small></span></div>
        <div><i>↩️</i><span><b>Easy Returns</b><small>{SITE.returnDays}-day return window</small></span></div>
      </div>

      {/* 4. Shop by category */}
      {cats.length > 0 && (
        <section>
          <div className="hm-cats">
            <div className="hm-title"><small>EXPLORE</small><h2>Shop by Category</h2></div>
            <div className="hm-catrow">
              {cats.map((c) => {
                const img = homePic(`cat-${slug(c.category)}`) || c.image;
                return (
                  <Link key={c.category} href={`/products?cat=${encodeURIComponent(c.category)}`} className="hm-cat">
                    <div className="c" style={{ background: `${c.colour_main || "#b8865b"}33` }}>
                      {img ? <img src={img} alt={c.category} /> : <BagArt main={c.colour_main || "#b8865b"} dark={c.colour_dark || "#8a5d3a"} />}
                    </div>
                    <b>{c.category}</b>
                    <small>{c.n} {c.n === 1 ? "style" : "styles"}</small>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 5. Top deals (reel-style cards) */}
      {deals.length > 0 && (
        <section>
          <div className="hm-title"><small>HOT PICKS</small><h2>Top Deals</h2></div>
          <div className="hm-reels">
            {deals.map((p) => {
              const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
              const c = p.colour_main || "#b8865b";
              return (
                <Link key={p.id} href={`/products/${p.id}`} className="hm-reel" style={{ background: `linear-gradient(165deg,${c}22,${c}77)` }}>
                  {off > 0 && <span className="off">{off}% off</span>}
                  {p.image ? (
                    <img src={p.image} alt={p.name} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="a"><BagArt main={c} dark={p.colour_dark || "#8a5d3a"} /></div>
                  )}
                  <div className="m"><b>{p.name}</b><span>{inr(p.price)}</span></div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Best sellers */}
      {best.length > 0 && (
        <section>
          <div className="hm-title"><small>CUSTOMER FAVOURITES</small><h2>Best Sellers</h2></div>
          <div className="hm-grid4">{best.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          <div className="hm-follow"><Link href="/products" className="btn o">View all products</Link></div>
        </section>
      )}

      {/* 7. New arrival banner + 2 big cards */}
      <section>
        <div className="hm-banner">
          <div>
            <small>JUST LANDED</small>
            <h2>New Arrivals</h2>
            <p>Fresh designs and new colours, added to the store. Be the first to carry them.</p>
            <Link href="/products" className="btn a">Explore New Arrivals</Link>
          </div>
          <BagArt main="#e9c9c0" dark="#b8865b" />
        </div>
        {fresh.length > 0 && (
          <div className="hm-two" style={{ marginTop: 16 }}>
            {fresh.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* 8. Behind the scenes */}
      <section>
        <div className="hm-bts">
          <div className="hm-bts-v">{bts ? <img src={bts} alt="Behind the scenes" /> : <BagArt main="#b8865b" dark="#8a5d3a" />}</div>
          <div>
            <small>BEHIND THE SCENES</small>
            <h2>From our hands to your doorstep</h2>
            <p>Every bag goes through careful checks and neat packing before it leaves us. Here is a peek at how your order comes together.</p>
            <div className="hm-flow">
              <span>✏️ Design</span><span>🧵 Making</span><span>✅ Quality check</span><span>📦 Packing</span><span>🚚 Delivery</span>
            </div>
            <Link href="/about" className="btn o">About {SITE.name}</Link>
          </div>
        </div>
      </section>

      {/* 9. Instagram */}
      <section>
        <div className="hm-title"><small>@ SOCIAL</small><h2>Shop Instagram</h2></div>
        <div className="hm-insta">
          {INSTA_COLORS.map(([m, d], n) => {
            const img = homePic(`insta-${n + 1}`);
            return (
              <a key={n} href={igHref} target={ig ? "_blank" : undefined} rel="noopener noreferrer" style={{ background: INSTA_BG[n] }} aria-label="Instagram">
                {img ? <img src={img} alt="" /> : <BagArt main={m} dark={d} />}
              </a>
            );
          })}
        </div>
        {ig && <div className="hm-follow"><a href={igHref} target="_blank" rel="noopener noreferrer" className="btn o">Follow @{ig}</a></div>}
      </section>
    </div>
  );
}
