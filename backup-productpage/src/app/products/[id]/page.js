import Link from "next/link";
import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import { imagesOf } from "@/lib/images";
import { SITE } from "@/lib/site";
import { abs } from "@/lib/seo";
import { all, one, inr } from "@/lib/db";
import { addToCart, buyNow } from "@/app/cart/actions";
import { toggleWishlist } from "@/app/account/actions";
import { getUser } from "@/lib/auth";
import ReviewForm from "./ReviewForm";

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

export default async function ProductDetail({ params }) {
  const { id } = await params;
  const p = one("SELECT * FROM products WHERE id = ? AND status = 'Active'", Number(id));
  if (!p) notFound();

  const reviews = all("SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC", p.id);
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const imgs = imagesOf(p.id).map((i) => i.url);
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
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <p className="mut" style={{ fontSize: 12 }}>
        <Link href="/">Home</Link> / <Link href="/products">Products</Link> / {p.category} / {p.name}
      </p>
      <div className="pd">
        <Gallery images={imgs} name={p.name} main={p.colour_main} dark={p.colour_dark} />
        <div>
          <h1 style={{ marginBottom: 6 }}>{p.name}</h1>
          {avg && <p><span className="rate">★ {avg}</span> <span className="mut">({reviews.length} reviews)</span></p>}
          <p style={{ fontSize: 24, margin: "8px 0" }}>
            <b>{inr(p.price)}</b>
            {off > 0 && (
              <>
                <s className="mut" style={{ fontSize: 15, marginLeft: 10 }}>{inr(p.mrp)}</s>
                <span className="off" style={{ fontSize: 15, marginLeft: 10 }}>{off}% off</span>
              </>
            )}
          </p>
          <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>Inclusive of all taxes. Free shipping above ₹1,999.</p>
          <p>
            {p.stock === 0 ? <span className="tag x">Out of stock</span>
              : p.stock <= 5 ? <span className="tag y">Only {p.stock} left</span>
              : <span className="tag g">In stock</span>}
          </p>
          <p>{p.description}</p>
          <div className="hl">
            <div><small>Material</small>{p.material}</div>
            <div><small>Size</small>{p.size}</div>
            <div><small>Weight</small>{p.weight_g} g</div>
            <div><small>SKU</small>{p.sku}</div>
          </div>
          <form className="buy">
            <input type="hidden" name="id" value={p.id} />
            <button className="btn o" formAction={addToCart} disabled={p.stock === 0}>Add to Cart</button>
            <button className="btn a" formAction={buyNow} disabled={p.stock === 0}>Buy Now</button>
          </form>
          <form action={toggleWishlist} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={p.id} />
            <button className="btn o">{inWish ? "♥ Wishlist mein hai (hatayein)" : "♡ Wishlist mein jodein"}</button>
          </form>
        </div>
      </div>

      <div className="sec"><h2>Customer Reviews</h2></div>
      {canReview && <ReviewForm productId={p.id} />}
      {reviews.length === 0 && <p className="mut">Abhi koi review nahi hai.</p>}
      {reviews.map((r) => (
        <div className="row" key={r.id} style={{ alignItems: "flex-start" }}>
          <div>
            <span className="rate">{r.rating} ★</span> <b>{r.title}</b>
            <div>{r.body}</div>
            <div className="mut" style={{ fontSize: 12 }}>{r.author}</div>
          </div>
        </div>
      ))}
    </>
  );
}
