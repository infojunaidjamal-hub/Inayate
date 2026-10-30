import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import DeliveryBox from "@/components/DeliveryBox";
import Carousel from "@/components/Carousel";
import MiniCard from "@/components/MiniCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import BagArt from "@/components/BagArt";
import { imagesOf, withCovers } from "@/lib/images";
import { withRatings } from "@/lib/ratings";
import { parseSpecs } from "@/lib/specs";
import { deliveryBy } from "@/lib/delivery";
import { SITE } from "@/lib/site";
import { abs } from "@/lib/seo";
import { all, one, inr } from "@/lib/db";
import BuyBox from "@/components/BuyBox";
import { getUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import ReviewForm from "./ReviewForm";
import "../../product.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = one("SELECT * FROM products WHERE id = ? AND status = 'Active'", Number(id));
  if (!p) return { title: "Product nahi mila" };
  const img = imagesOf(p.id)[0]?.url;
  const desc = (p.description || SITE.tagline).replace(/\s+/g, " ").trim().slice(0, 155);
  return {
    title: `${p.name} – ${SITE.name}`,
    description: desc,
    alternates: { canonical: `/products/${p.id}` },
    openGraph: { title: p.name, description: desc, url: `/products/${p.id}`, images: img ? [{ url: abs(img) }] : [] },
  };
}

const colourOf = (p) => (p.colours ? p.colours.split(",")[0].trim() : "") || "Default";

export default async function ProductDetail({ params }) {
  const { id } = await params;
  const p = one("SELECT * FROM products WHERE id = ? AND status = 'Active'", Number(id));
  if (!p) notFound();

  const reviews = all("SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC", p.id);
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const imgs = imagesOf(p.id).map((i) => i.url);
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  // colour variants: same group_key wale products
  const variants = p.group_key
    ? withCovers(all("SELECT * FROM products WHERE group_key = ? AND status = 'Active' ORDER BY id", p.group_key))
    : [];
  const similar = withRatings(withCovers(all(
    "SELECT * FROM products WHERE status = 'Active' AND id <> ? ORDER BY (category = ?) DESC, id DESC LIMIT 8", p.id, p.category
  )));

  // Specifications: system ki jaankari + seller ki likhi lines (same naam ho to seller ki chalti hai)
  const base = [
    ["Brand", SITE.name], ["Category", p.category], ["Material", p.material], ["Colour", p.colours],
    ["Size", p.size], ["Weight", p.weight_g ? `${p.weight_g} g` : ""], ["SKU", p.sku],
  ].filter(([, v]) => v).map(([k, v]) => ({ k, v }));
  const mine = parseSpecs(p.specs);
  const have = new Set(mine.map((r) => r.k.toLowerCase()));
  const specs = [...mine, ...base.filter((r) => !have.has(r.k.toLowerCase()))];
  const highlights = specs.slice(0, 8);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: (p.description || "").slice(0, 300),
    sku: p.sku,
    image: imgs.map(abs),
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      url: abs(`/products/${p.id}`),
      priceCurrency: "INR",
      price: String(p.price),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg, reviewCount: reviews.length } } : {}),
  };

  const user = await getUser();
  const buyer = user && user.role === "buyer" ? user : null;
  const inWish = buyer ? !!one("SELECT 1 x FROM wishlist WHERE user_id = ? AND product_id = ?", buyer.id, p.id) : false;
  const canReview = buyer
    && !!one(`SELECT 1 x FROM orders o JOIN order_items i ON i.order_id = o.id
              WHERE o.user_id = ? AND o.status = 'Delivered' AND i.product_id = ?`, buyer.id, p.id)
    && !one("SELECT id FROM reviews WHERE user_id = ? AND product_id = ?", buyer.id, p.id);
  const by = deliveryBy();
  const ask = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Mujhe "${p.name}" ke baare mein poochhna hai: ${abs(`/products/${p.id}`)}`)}`;
  const out = p.stock === 0;

  return (
    <div className="pp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="pp-crumb">
        <Link href="/">Home</Link> / <Link href="/products">Products</Link> / <Link href={`/products?cat=${encodeURIComponent(p.category)}`}>{p.category}</Link> / {p.name}
      </div>

      <div className="pp-grid">
        <ProductGallery images={imgs} name={p.name} main={p.colour_main} dark={p.colour_dark} productId={p.id} inWish={inWish} />

        <div className="pp-side">
          {variants.length > 1 && (
            <>
              <div className="pp-mut">Colour: <b style={{ color: "var(--ink)" }}>{colourOf(p)}</b></div>
              <div className="pp-sws">
                {variants.map((v) => (
                  <Link key={v.id} href={`/products/${v.id}`} className={"pp-sw" + (v.id === p.id ? " on" : "")} title={colourOf(v)} aria-label={colourOf(v)}>
                    {v.image ? <img src={v.image} alt={colourOf(v)} /> : <BagArt main={v.colour_main} dark={v.colour_dark} />}
                  </Link>
                ))}
              </div>
            </>
          )}

          <h1>{p.name}</h1>
          <p style={{ margin: "4px 0" }}>
            {avg ? <><span className="pp-rate">{avg} ★</span> <span className="pp-mut">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span> <span className="pp-blue" style={{ fontSize: 12 }}>✔ Verified Buyers</span></>
              : <span className="pp-mut">Abhi koi review nahi</span>}
          </p>
          <div>
            {off > 0 && <span className="pp-off">↓{off}% </span>}
            {off > 0 && <s className="pp-mut">{inr(p.mrp)} </s>}
            <span className="pp-price">{inr(p.price)}</span>
          </div>
          <div className="pp-mut" style={{ fontSize: 12 }}>
            Inclusive of all taxes · {out ? <b style={{ color: "#b8463c" }}>Out of stock</b> : p.stock <= 5 ? <b style={{ color: "#b8463c" }}>Only {p.stock} left</b> : <b style={{ color: "var(--pp-green)" }}>In stock</b>}
          </div>

          <div className="pp-box">
            <h3>Offers</h3>
            {off > 0 && <div className="pp-offer"><span>🏷️</span><span><b>{off}% ki chhoot</b> abhi laagu hai (MRP {inr(p.mrp)} se)</span></div>}
            <div className="pp-offer"><span>🚚</span><span><b>Free delivery</b> {inr(SITE.freeShippingAbove)} se upar ke orders par</span></div>
            <div className="pp-offer"><span>💵</span><span><b>Cash on Delivery</b> available hai</span></div>
            <div className="pp-offer"><span>↩️</span><span><b>{SITE.returnDays} din</b> mein aasaan return</span></div>
          </div>

          <DeliveryBox price={p.price} freeAbove={SITE.freeShippingAbove} fee={SITE.shippingFee} returnDays={SITE.returnDays} />

          {highlights.length > 0 && (
            <div className="pp-box">
              <h3>Product highlights</h3>
              <div className="pp-hl">{highlights.map((r) => <div key={r.k}><small>{r.k}</small>{r.v}</div>)}</div>
            </div>
          )}

          <div className="pp-box">
            <details open>
              <summary>All details</summary>
              <div style={{ marginTop: 10 }}>
                {specs.map((r) => <div className="pp-spec" key={r.k}><span>{r.k}</span><span>{r.v}</span></div>)}
                {p.description && <><h3 style={{ margin: "14px 0 6px" }}>Description</h3><p style={{ margin: 0, whiteSpace: "pre-line" }}>{p.description}</p></>}
                <p className="pp-mut" style={{ fontSize: 12, marginBottom: 0 }}>Sales package: 1 handbag · GST {p.gst_percent}%</p>
              </div>
            </details>
          </div>

          <div className="pp-box">
            <h3>Ratings and reviews</h3>
            {reviews.length === 0 ? <p className="pp-mut" style={{ margin: 0 }}>Abhi koi review nahi hai. Order milne ke baad aap pehla review de sakte hain.</p> : (
              <>
                <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div><span style={{ fontSize: 34, fontWeight: 600 }}>{avg}</span> <span className="pp-rate">★</span><br /><span className="pp-mut" style={{ fontSize: 12 }}>{reviews.length} {reviews.length === 1 ? "rating" : "ratings"}</span></div>
                  <div className="pp-bars">
                    {dist.map((d) => (
                      <div className="pp-bar" key={d.s}><span>{d.s}★</span><i><u style={{ width: `${(d.n / reviews.length) * 100}%` }} /></i><span>{Math.round((d.n / reviews.length) * 100)}%</span></div>
                    ))}
                  </div>
                </div>
                <div className="pp-car" style={{ marginTop: 12 }}>
                  {reviews.slice(0, 6).map((r) => (
                    <div className="pp-rv" key={r.id}>
                      <span className="pp-rate">{r.rating} ★</span> <b>{r.title}</b>
                      <p style={{ margin: "8px 0" }}>{r.body}</p>
                      <small className="pp-mut">{r.author} · ✔ Verified Buyer · {fmtDate(r.created_at)}</small>
                    </div>
                  ))}
                </div>
                <Link href={`/products/${p.id}/reviews`} className="pp-btn" style={{ marginTop: 10 }}>Show all reviews ›</Link>
              </>
            )}
            {canReview && <div style={{ marginTop: 12 }}><ReviewForm productId={p.id} /></div>}
          </div>

          <div className="pp-box">
            <h3>Kuch poochhna hai?</h3>
            <p className="pp-mut" style={{ margin: "0 0 10px" }}>Size, colour ya delivery ke baare mein seedha humse poochhein.</p>
            <a className="pp-btn" href={ask} target="_blank" rel="noopener noreferrer">WhatsApp par poochhein</a>
          </div>

          <BuyBox id={p.id} out={out} price={p.price} />
        </div>
      </div>

      {similar.length > 0 && <Carousel title="Similar Products">{similar.map((s) => <MiniCard key={s.id} p={s} by={by} />)}</Carousel>}
      <p className="pp-mut" style={{ margin: "16px 0 0" }}>Trending in</p>
      <Link href={`/products?cat=${encodeURIComponent(p.category)}`} className="pp-tag">#{p.category.replace(/\s+/g, "")}</Link>
      <RecentlyViewed currentId={p.id} />
    </div>
  );
}
