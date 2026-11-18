import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { abs } from "@/lib/seo";
import { SITE } from "@/lib/site";
import SellerNav from "@/components/SellerNav";
import { markDone, markProductDone } from "./actions";
import { fmtDate } from "@/lib/format";
import { waTo } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Back-in-stock requests – Seller Panel" };

export default async function Alerts() {
  await requirePerm("products");
  const rows = all(
    `SELECT a.*, p.name, p.stock FROM stock_alerts a JOIN products p ON p.id = a.product_id
     WHERE a.status = 'waiting' ORDER BY (p.stock > 0) DESC, a.product_id, a.id`
  );
  const groups = [];
  for (const r of rows) {
    let g = groups[groups.length - 1];
    if (!g || g.id !== r.product_id) groups.push((g = { id: r.product_id, name: r.name, stock: r.stock, list: [] }));
    g.list.push(r);
  }
  return (
    <>
      <SellerNav />
      <div className="sec"><h2>Back-in-stock requests</h2></div>
      <p className="mut" style={{ fontSize: 13 }}>Customers who tapped &quot;Notify me when back&quot;. Jab product wapas aa jaye, WhatsApp ya email se unhe ek tap mein bata dein. Phir &quot;Done&quot; karein.</p>
      {groups.length === 0 && <p className="mut">Abhi koi request nahi hai.</p>}
      {groups.map((g) => {
        const msg = `Hi! "${g.name}" wapas stock mein aa gaya hai ${SITE.name} par: ${abs(`/products/${g.id}`)}`;
        return (
          <div key={g.id} className="card pad" style={{ marginBottom: 12 }}>
            <div className="row" style={{ border: 0, padding: 0, flexWrap: "wrap", gap: 8 }}>
              <span><b>{g.name}</b> <span className={`tag ${g.stock > 0 ? "g" : "y"}`}>{g.stock > 0 ? `Back in stock (${g.stock})` : "Still out of stock"}</span> <span className="mut" style={{ fontSize: 12 }}>· {g.list.length} waiting</span></span>
              <form action={markProductDone}><input type="hidden" name="id" value={g.id} /><button className="btn o s">All done</button></form>
            </div>
            {g.list.map((a) => (
              <div className="row" key={a.id} style={{ flexWrap: "wrap", gap: 8 }}>
                <span><b>{a.contact}</b><br /><span className="mut" style={{ fontSize: 12 }}>Asked on {fmtDate(a.created_at)}</span></span>
                <span style={{ display: "flex", gap: 8 }}>
                  {g.stock > 0 && (a.kind === "mobile"
                    ? <a className="btn a s" style={{ minHeight: 44 }} href={waTo(a.contact, msg)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    : <a className="btn a s" style={{ minHeight: 44 }} href={`mailto:${a.contact}?subject=${encodeURIComponent(`${g.name} is back in stock`)}&body=${encodeURIComponent(msg)}`}>Email</a>)}
                  <form action={markDone}><input type="hidden" name="id" value={a.id} /><button className="btn o s" style={{ minHeight: 44 }}>Done</button></form>
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
