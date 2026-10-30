import Link from "next/link";
import { getUser } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller Panel" };

function Landing() {
  return (
    <div className="hero" style={{ marginTop: 10 }}>
      <div>
        <h1>Apna store yahin se sambhalein</h1>
        <p>Products add karein, orders ship karein aur returns manage karein. Sab ek jagah.</p>
        <p style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 0 }}>
          <Link href="/seller/login" className="btn o">Login</Link>
          <Link href="/seller/register" className="btn a">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default async function SellerHome() {
  const user = await getUser();
  // login nahi hai (ya seller nahi hai) to sirf landing page dikhao
  if (!user || user.role !== "seller") return <Landing />;

  const c = (sql) => one(sql).c;
  const pending = c("SELECT COUNT(*) c FROM orders WHERE status IN ('Placed','Confirmed')");
  const returns = c("SELECT COUNT(*) c FROM returns WHERE status = 'Requested'");
  const sales = one("SELECT COALESCE(SUM(total),0) s FROM orders WHERE pay_status = 'Paid' AND status NOT IN ('Cancelled','Refunded')").s;
  const codDue = one("SELECT COALESCE(SUM(total),0) s FROM orders WHERE pay_status = 'COD Pending' AND status NOT IN ('Cancelled','Refunded')").s;
  const refundDue = c("SELECT COUNT(*) c FROM orders WHERE pay_status = 'Refund Initiated'");
  const products = c("SELECT COUNT(*) c FROM products");
  const low = all("SELECT * FROM products WHERE status = 'Active' AND stock <= 5 ORDER BY stock, id");
  const recent = all("SELECT * FROM orders ORDER BY id DESC LIMIT 5");

  return (
    <>
      <h2>Namaste, {user.name}</h2>
      <div className="stats">
        <Link href="/seller/orders" className="card"><b>{pending}</b><br /><small>Naye orders (action chahiye)</small></Link>
        <Link href="/seller/returns" className="card"><b>{returns}</b><br /><small>Return requests</small></Link>
        <div className="card"><b>{inr(sales)}</b><br /><small>Mila hua paisa (paid orders)</small></div>
        <div className="card"><b>{inr(codDue)}</b><br /><small>COD ka paisa aana baaki</small></div>
        <Link href="/seller/orders" className="card"><b>{refundDue}</b><br /><small>Refund dena baaki</small></Link>
        <Link href="/seller/products" className="card"><b>{products}</b><br /><small>Products</small></Link>
      </div>

      <div className="sec"><h2>Recent Orders</h2><Link href="/seller/orders">Sab dekhein →</Link></div>
      {recent.map((o) => (
        <Link key={o.id} href={`/seller/orders/${o.order_no}`} className="row" style={{ color: "inherit" }}>
          <span><b>{o.order_no}</b> <span className="mut">· {o.ship_name} · {fmtDate(o.created_at)}</span></span>
          <span><span className={`tag ${statusClass(o.status)}`}>{o.status}</span> <b style={{ marginLeft: 8 }}>{inr(o.total)}</b></span>
        </Link>
      ))}

      <div className="sec"><h2>Kam stock wale products</h2></div>
      {low.length === 0 && <p className="mut">Sab products ka stock theek hai.</p>}
      {low.map((p) => (
        <Link key={p.id} href={`/seller/products/${p.id}`} className="row" style={{ color: "inherit" }}>
          <span>{p.name}</span>
          <span className={`tag ${p.stock === 0 ? "x" : "y"}`}>{p.stock === 0 ? "Out of stock" : `Sirf ${p.stock} bache`}</span>
        </Link>
      ))}
    </>
  );
}
