import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { withCovers } from "@/lib/images";
import BagArt from "@/components/BagArt";
import SellerNav from "@/components/SellerNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products – Seller Panel" };

export default async function SellerProducts() {
  await requireSeller();
  const list = withCovers(all("SELECT * FROM products ORDER BY id DESC"));
  return (
    <>
      <SellerNav />
      <div className="sec"><h2>Products ({list.length})</h2><Link href="/seller/products/new" className="btn a">+ Naya product</Link></div>
      {list.map((p) => (
        <div className="row" key={p.id}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="th" style={{ cursor: "default", overflow: "hidden" }}>{p.image ? <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BagArt main={p.colour_main} dark={p.colour_dark} />}</span>
            <span><b>{p.name}</b><br /><span className="mut" style={{ fontSize: 12 }}>{p.sku} · {p.category}</span></span>
          </span>
          <span>{inr(p.price)} <s className="mut" style={{ fontSize: 12 }}>{p.mrp > p.price ? inr(p.mrp) : ""}</s></span>
          <span className={`tag ${p.stock === 0 ? "x" : p.stock <= 5 ? "y" : "g"}`}>Stock: {p.stock}</span>
          <span className={`tag ${p.status === "Active" ? "g" : ""}`}>{p.status}</span>
          <Link href={`/seller/products/${p.id}`} className="btn o s">Edit</Link>
        </div>
      ))}
      <p className="mut" style={{ fontSize: 12 }}>Product delete nahi hota (purane orders mein wo juda hai). Chhupana ho to Edit mein status "Draft" kar do.</p>
    </>
  );
}
