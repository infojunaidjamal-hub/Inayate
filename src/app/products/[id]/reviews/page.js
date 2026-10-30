import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import "../../../product.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer reviews" };

const SORTS = { new: ["Naye pehle", "id DESC"], high: ["Sabse achhe", "rating DESC, id DESC"], low: ["Sabse kharab", "rating ASC, id DESC"] };

export default async function AllReviews({ params, searchParams }) {
  const { id } = await params;
  const { sort = "new" } = await searchParams;
  const p = one("SELECT id, name FROM products WHERE id = ? AND status = 'Active'", Number(id));
  if (!p) notFound();
  const key = SORTS[sort] ? sort : "new";
  const list = all(`SELECT * FROM reviews WHERE product_id = ? ORDER BY ${SORTS[key][1]}`, p.id);
  return (
    <div className="pp">
      <div className="pp-crumb"><Link href={`/products/${p.id}`}>← {p.name}</Link></div>
      <h2>Customer reviews ({list.length})</h2>
      <div className="tabs">
        {Object.entries(SORTS).map(([k, [label]]) => <Link key={k} href={`/products/${p.id}/reviews?sort=${k}`} className={k === key ? "on" : ""}>{label}</Link>)}
      </div>
      {list.length === 0 && <p className="pp-mut">Abhi koi review nahi hai.</p>}
      {list.map((r) => (
        <div className="row" key={r.id} style={{ alignItems: "flex-start" }}>
          <div>
            <span className="pp-rate">{r.rating} ★</span> <b>{r.title}</b>
            <p style={{ margin: "6px 0" }}>{r.body}</p>
            <small className="pp-mut">{r.author} · ✔ Verified Buyer · {fmtDate(r.created_at)}</small>
          </div>
        </div>
      ))}
    </div>
  );
}
