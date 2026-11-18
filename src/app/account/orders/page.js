import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";
import { itemsByOrder } from "@/lib/orderThumbs";
import BagArt from "@/components/BagArt";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders – Inayate Bags" };

const SHOW = 4; // kitni chhoti photo dikhani hain

export default async function Orders() {
  const user = await getUser();
  if (!user) redirect("/login");
  const orders = all("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", user.id);
  const byOrder = itemsByOrder(orders.map((o) => o.id));
  return (
    <>
      <h2>My Orders</h2>
      {orders.length === 0 && <p className="mut">Abhi koi order nahi hai. <Link href="/products" style={{ textDecoration: "underline" }}>Shopping shuru karein</Link></p>}
      {orders.map((o) => {
        const items = byOrder[o.id] || [];
        return (
          <Link key={o.id} href={`/order/${o.order_no}`} className="card pad" style={{ display: "block", marginBottom: 12 }} aria-label={`Order ${o.order_no}, ${o.status}`}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <span><b>{o.order_no}</b> <span className="mut">· {fmtDate(o.created_at)}</span></span>
              <span className={`tag ${statusClass(o.status)}`}>{o.status}</span>
            </div>
            <div className="ot-row">
              {items.slice(0, SHOW).map((i, n) => (
                <span className="ot" key={n} title={i.name}>
                  {i.image ? <img src={i.image} alt={i.name} loading="lazy" /> : <BagArt main={i.colour_main} dark={i.colour_dark} />}
                  {i.qty > 1 && <i>×{i.qty}</i>}
                </span>
              ))}
              {items.length > SHOW && <span className="ot-more">+ {items.length - SHOW} more</span>}
            </div>
            <p className="ot-names">{items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
            <p style={{ margin: "6px 0 0" }}><b>{inr(o.total)}</b> <span className="mut">· {o.pay_method}: {o.pay_status}</span></p>
          </Link>
        );
      })}
    </>
  );
}
