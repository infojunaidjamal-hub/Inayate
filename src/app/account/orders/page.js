import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders – Inayate Bags" };

export default async function Orders() {
  const user = await getUser();
  if (!user) redirect("/login");
  const orders = all("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", user.id);
  return (
    <>
      <h2>My Orders</h2>
      {orders.length === 0 && <p className="mut">Abhi koi order nahi hai. <Link href="/products" style={{ textDecoration: "underline" }}>Shopping shuru karein</Link></p>}
      {orders.map((o) => {
        const items = all("SELECT name, qty FROM order_items WHERE order_id = ?", o.id);
        return (
          <Link key={o.id} href={`/order/${o.order_no}`} className="card pad" style={{ display: "block", marginBottom: 12 }}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <span><b>{o.order_no}</b> <span className="mut">· {fmtDate(o.created_at)}</span></span>
              <span className={`tag ${statusClass(o.status)}`}>{o.status}</span>
            </div>
            <p style={{ margin: "8px 0 0" }}>{items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
            <p style={{ margin: "4px 0 0" }}><b>{inr(o.total)}</b> <span className="mut">· {o.pay_method}: {o.pay_status}</span></p>
          </Link>
        );
      })}
    </>
  );
}
