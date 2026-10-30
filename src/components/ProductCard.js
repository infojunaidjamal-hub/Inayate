import Link from "next/link";
import BagArt from "./BagArt";
import { inr } from "@/lib/db";

export default function ProductCard({ p }) {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <Link href={`/products/${p.id}`} className="card" style={{ display: "block" }}>
      <div className="im">
        {p.image
          ? <img src={p.image} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <BagArt main={p.colour_main} dark={p.colour_dark} />}
        {p.stock === 0 && <span className="tag x" style={{ position: "absolute", top: 10, left: 10 }}>Out of stock</span>}
      </div>
      <div className="tx">
        <h3>{p.name}</h3>
        <div className="mut" style={{ fontSize: 12 }}>{p.category}</div>
        <div className="pr">
          <b>{inr(p.price)}</b>
          {off > 0 && <s>{inr(p.mrp)}</s>}
          {off > 0 && <span className="off" style={{ marginLeft: 6, fontSize: 12 }}>{off}% off</span>}
        </div>
      </div>
    </Link>
  );
}
