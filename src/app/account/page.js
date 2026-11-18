import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";
import { shortName } from "@/components/accountItems";
import AvatarForm from "./profile/AvatarForm";
import DetailsForm from "./profile/DetailsForm";
import { dismissAlert } from "../products/notify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mera Account" };

const greeting = () => {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
};

export default async function Account() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "buyer") redirect("/seller");
  const c = (t) => one(`SELECT COUNT(*) c FROM ${t} WHERE user_id = ?`, user.id).c;
  const recent = all("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 3", user.id);
  const first = shortName(user.name);
  // "Notify me when back" wale products jo wapas aa gaye
  const back = all(
    "SELECT a.id, p.id AS pid, p.name FROM stock_alerts a JOIN products p ON p.id = a.product_id WHERE a.user_id = ? AND a.status = 'waiting' AND p.stock > 0 AND p.status = 'Active'",
    user.id
  );

  return (
    <>
      <h1 style={{ fontSize: 26, margin: 0 }}>{greeting()}{first === "My Account" ? "" : `, ${first}`}!</h1>
      <div className="ac-stats">
        <Link href="/account/orders" className="ac-stat"><b>{c("orders")}</b><span style={{ color: "var(--mut)" }}>Orders</span></Link>
        <Link href="/account/wishlist" className="ac-stat"><b>{c("wishlist")}</b><span style={{ color: "var(--mut)" }}>Wishlist</span></Link>
        <Link href="/account/addresses" className="ac-stat"><b>{c("addresses")}</b><span style={{ color: "var(--mut)" }}>Addresses</span></Link>
      </div>

      {back.map((b) => (
        <div className="ac-banner" key={b.id} role="status">
          <span><b>{b.name}</b> wapas stock mein aa gaya hai.</span>
          <Link href={`/products/${b.pid}`} className="btn a s" style={{ minHeight: 44 }}>Dekhein</Link>
          <form action={dismissAlert}><input type="hidden" name="id" value={b.id} /><button className="btn o s" style={{ minHeight: 44 }}>Theek hai</button></form>
        </div>
      ))}

      <AvatarForm current={user.avatar} name={user.name} shape={user.avatar_shape || "circle"} />
      <div style={{ marginTop: 16 }}>
        <DetailsForm user={{ name: user.name, mobile: user.mobile, email: user.email }} />
      </div>

      <div className="sec"><h2>Recent Orders</h2><Link href="/account/orders" style={{ textDecoration: "underline" }}>Sab dekhein →</Link></div>
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
