import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role === "seller") redirect("/seller");
  const count = (table) => one(`SELECT COUNT(*) c FROM ${table} WHERE user_id = ?`, user.id).c;
  const recent = all("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 3", user.id);

  return (
    <>
      <h2>Hello, {user.name}</h2>
      <p className="mut" style={{ marginTop: -8 }}>Mobile: {user.mobile}</p>
      <div className="stats">
        <Link href="/account/orders" className="card"><b>{count("orders")}</b><br /><small>Orders</small></Link>
        <Link href="/account/wishlist" className="card"><b>{count("wishlist")}</b><br /><small>Wishlist</small></Link>
        <Link href="/account/addresses" className="card"><b>{count("addresses")}</b><br /><small>Addresses</small></Link>
      </div>
      <div className="sec"><h2>Recent Orders</h2><Link href="/account/orders">Sab dekhein →</Link></div>
      {recent.length === 0 && <p className="mut">Abhi koi order nahi hai. <Link href="/products" style={{ textDecoration: "underline" }}>Shopping shuru karein</Link></p>}
      {recent.map((o) => (
        <Link key={o.id} href={`/order/${o.order_no}`} className="row" style={{ color: "inherit" }}>
          <span><b>{o.order_no}</b> <span className="mut">· {fmtDate(o.created_at)}</span></span>
          <span><span className={`tag ${statusClass(o.status)}`}>{o.status}</span> <b style={{ marginLeft: 8 }}>{inr(o.total)}</b></span>
        </Link>
      ))}
    </>
  );
}
