import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/perms";
import { all, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search – Seller Panel" };

export default async function SellerSearch({ searchParams }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q || "").trim().slice(0, 60);
  const like = `%${q}%`;

  const orders = q ? all("SELECT * FROM orders WHERE order_no LIKE ? OR ship_name LIKE ? OR ship_mobile LIKE ? ORDER BY id DESC LIMIT 10", like, like, like) : [];
  const customers = q && can(me.role, "customers") ? all("SELECT id, name, mobile, email FROM users WHERE role = 'buyer' AND (name LIKE ? OR mobile LIKE ? OR email LIKE ?) ORDER BY id DESC LIMIT 10", like, like, like) : [];
  const products = q && can(me.role, "products") ? all("SELECT id, name, sku, stock, status FROM products WHERE name LIKE ? OR sku LIKE ? OR id IN (SELECT product_id FROM product_variants WHERE sku LIKE ?) ORDER BY id LIMIT 10", like, like, like) : [];
  const none = q && !orders.length && !customers.length && !products.length;

  return (
    <div className="sp-res">
      <h2 className="sp-h">Search</h2>
      <form action="/seller/search" role="search" style={{ margin: "0 0 10px" }}>
        <input name="q" defaultValue={q} placeholder="Order number, customer, mobile ya product dhoondhein…" autoFocus style={{ width: "100%", padding: "11px 16px", border: "1px solid var(--line)", borderRadius: 24, background: "var(--card)", font: "inherit" }} />
      </form>
      {!q && <p className="mut">Upar kuch likhkar Enter dabayein.</p>}
      {none && <p className="mut">&quot;{q}&quot; ke liye kuch nahi mila.</p>}

      {orders.length > 0 && <>
        <h3>Orders</h3>
        {orders.map((o) => (
          <Link key={o.id} href={`/seller/orders/${o.order_no}`} className="sp-li">
            <span><b>{o.order_no}</b> <span className="mut">· {o.ship_name} · {o.ship_mobile} · {fmtDate(o.created_at)}</span></span>
            <span><span className={`tag ${statusClass(o.status)}`}>{o.status}</span> <b style={{ marginLeft: 8 }}>{inr(o.total)}</b></span>
          </Link>
        ))}
      </>}

      {customers.length > 0 && <>
        <h3>Customers</h3>
        {customers.map((u) => (
          <Link key={u.id} href="/seller/customers" className="sp-li">
            <span><b>{u.name}</b></span>
            <span className="mut">{u.mobile}{u.email ? ` · ${u.email}` : ""}</span>
          </Link>
        ))}
      </>}

      {products.length > 0 && <>
        <h3>Products</h3>
        {products.map((p) => (
          <Link key={p.id} href={`/seller/products/${p.id}`} className="sp-li">
            <span><b>{p.name}</b> <span className="mut">· {p.sku}</span></span>
            <span className={`tag ${p.stock === 0 ? "x" : p.status === "Active" ? "g" : "y"}`}>{p.stock === 0 ? "Out of stock" : `${p.stock} stock · ${p.status}`}</span>
          </Link>
        ))}
      </>}
    </div>
  );
}
