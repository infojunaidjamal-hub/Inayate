import Link from "next/link";
import BagArt from "@/components/BagArt";
import CardActions from "./CardActions";
import { inr } from "@/lib/db";

// Shop page ka naya product card (purana ProductCard home aur wishlist ke liye jaisa tha waisa hi hai)
export default function ShopCard({ p, inWish }) {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const out = p.stock <= 0;
  return (
    <article className="shp-card">
      <div className="shp-im">
        <Link href={`/products/${p.id}`} className="shp-imlink" aria-label={p.name}>
          {p.image
            ? <img src={p.image} alt={p.name} loading="lazy" />
            : <BagArt main={p.colour_main} dark={p.colour_dark} />}
        </Link>
        {off > 0 && !out && <span className="shp-rib"><i>Sale</i></span>}
        {out && <span className="shp-oos">Out of stock</span>}
        <CardActions id={p.id} name={p.name} out={out} inWish={inWish} hasVariants={!!p.has_variants} />
      </div>
      <div className="shp-tx">
        <Link href={`/products/${p.id}`}><h3>{p.name}</h3></Link>
        <div className="shp-meta">
          {p.category}
          {p.rating && <span className="shp-star"> · ★ {p.rating} ({p.rating_count})</span>}
        </div>
        <div className="shp-pr">
          <b>{p.has_variants && p.price_max > p.price ? "From " : ""}{inr(p.price)}</b>
          {off > 0 && !(p.has_variants && p.price_max > p.price) && <s>{inr(p.mrp)}</s>}
          {off > 0 && <span className="shp-off">{off}% off</span>}
        </div>
      </div>
    </article>
  );
}
