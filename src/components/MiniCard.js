import Link from "next/link";
import BagArt from "./BagArt";

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

// Chhota product card (Similar / Recently viewed carousel ke liye)
export default function MiniCard({ p, by }) {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <Link href={`/products/${p.id}`} className="pp-mini">
      <div className="pp-mim">
        {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <BagArt main={p.colour_main} dark={p.colour_dark} />}
        {p.rating && <span className="pp-rate">{p.rating} ★</span>}
      </div>
      <h4>{p.name}</h4>
      {off > 0 && <div className="pp-off">{off}% OFF</div>}
      <div>{p.mrp > p.price && <s className="pp-mut">{inr(p.mrp)}</s>} <b>{inr(p.price)}</b></div>
      {by && <div className="pp-mut" style={{ fontSize: 12 }}>Get it by {by}</div>}
    </Link>
  );
}
