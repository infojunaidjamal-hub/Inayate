import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/perms";
import { lowStockProducts } from "@/lib/catalog";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store Admin" };

const RANGES = [[7, "7 din"], [30, "30 din"], [90, "90 din"]];
const DEAD = ["Cancelled", "Refunded"];

function greeting() {
  const h = Number(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })) % 24;
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

export default async function SellerHome({ searchParams }) {
  const user = await requireStaff();
  const R = user.role;
  const sp = await searchParams;
  const asked = Number(Array.isArray(sp.range) ? sp.range[0] : sp.range);
  const days = RANGES.some(([d]) => d === asked) ? asked : 7;

  // --- abhi kya karna hai (date se bandha nahi) ---
  const c = (sql) => one(sql).c;
  const pending = c("SELECT COUNT(*) c FROM orders WHERE status IN ('On Hold','Placed','Confirmed')");
  const returns = c("SELECT COUNT(*) c FROM returns WHERE status = 'Requested'");
  const refundDue = c("SELECT COUNT(*) c FROM orders WHERE pay_status = 'Refund Initiated'");
  const codDue = one("SELECT COALESCE(SUM(total),0) s FROM orders WHERE pay_status = 'COD Pending' AND status NOT IN ('Cancelled','Refunded')").s;
  const low = lowStockProducts(); // simple: stock < 3, variants wale: koi bhi variant < 3

  // --- chune hue din ka hisaab (India ke samay ke hisaab se) ---
  const start = one(`SELECT date('now','+330 minutes','-${days - 1} days') d`).d;
  const rows = all("SELECT date(created_at,'+330 minutes') d, status, pay_status, total FROM orders WHERE date(created_at,'+330 minutes') >= ?", start);
  const live = rows.filter((r) => !DEAD.includes(r.status));
  const paid = live.filter((r) => r.pay_status === "Paid");
  const sales = paid.reduce((s, r) => s + r.total, 0);
  const aov = live.length ? Math.round(live.reduce((s, r) => s + r.total, 0) / live.length) : 0;
  const cancelled = rows.length - live.length;

  const perDay = new Map();
  for (const r of paid) perDay.set(r.d, (perDay.get(r.d) || 0) + r.total);
  const base = new Date(start + "T00:00:00Z");
  const bars = Array.from({ length: days }, (_, i) => {
    const dt = new Date(base.getTime() + i * 864e5);
    const key = dt.toISOString().slice(0, 10);
    return { key, v: perDay.get(key) || 0, label: dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }) };
  });
  const max = Math.max(1, ...bars.map((b) => b.v));
  const best = bars.reduce((a, b) => (b.v > a.v ? b : a), bars[0]);

  const top = all(
    `SELECT oi.name, SUM(oi.qty) q FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE date(o.created_at,'+330 minutes') >= ? AND o.status NOT IN ('Cancelled','Refunded')
      GROUP BY oi.name ORDER BY q DESC LIMIT 5`, start);
  const recent = all("SELECT * FROM orders ORDER BY id DESC LIMIT 6");

  return (
    <>
      <h1 style={{ margin: 0 }}>{greeting()}, {user.name}!</h1>
      {sp.denied && <p className="st-deny" style={{ marginTop: 10 }}>Is kaam ki ijazat aapke role ko nahi hai. Zaroorat ho to store ke Owner se kahein.</p>}
      <div className="sp-top">
        <form action="/seller/search" role="search">
          <label className="shp-sr" htmlFor="sq" style={{ position: "absolute", left: -9999 }}>Search</label>
          <input id="sq" type="search" name="q" placeholder="Order number, customer, mobile ya product dhoondhein…" />
        </form>
        {can(R, "products") && <Link href="/seller/products/new" className="btn a">+ Add product</Link>}
      </div>

      <h2 className="sp-h">Aaj ka kaam</h2>
      <div className="sp-g">
        <Link href="/seller/process" className={"sp-c" + (pending ? " hot" : "")}><b>{pending}</b><span>Naye orders (action chahiye)</span></Link>
        {can(R, "returns") && <Link href="/seller/returns" className={"sp-c" + (returns ? " hot" : "")}><b>{returns}</b><span>Return requests</span></Link>}
        {can(R, "refund") && <Link href="/seller/orders" className={"sp-c" + (refundDue ? " hot" : "")}><b>{refundDue}</b><span>Refund dena baaki</span></Link>}
        {can(R, "payments") && <Link href="/seller/payments" className="sp-c"><b>{inr(codDue)}</b><span>COD ka paisa aana baaki</span></Link>}
        {can(R, "products") && <Link href="/seller/products" className={"sp-c" + (low.length ? " hot" : "")}><b>{low.length}</b><span>Kam stock wale products</span></Link>}
      </div>

      {can(R, "payments") && (<>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h2 className="sp-h">Hisaab</h2>
        <div className="sp-range" role="group" aria-label="Kitne din ka hisaab">
          {RANGES.map(([d, t]) => <Link key={d} href={d === 7 ? "/seller" : `/seller?range=${d}`} className={d === days ? "on" : ""}>{t}</Link>)}
        </div>
      </div>
      <div className="sp-g">
        <div className="sp-c"><b>{inr(sales)}</b><span>Mila hua paisa (paid orders)</span></div>
        <div className="sp-c"><b>{live.length}</b><span>Orders mile</span></div>
        <div className="sp-c"><b>{inr(aov)}</b><span>Ek order ka average</span></div>
        <div className="sp-c"><b>{cancelled}</b><span>Cancelled / refunded</span></div>
      </div>

      <div className="sp-two">
        <div className="sp-c">
          <h2 className="sp-h" style={{ marginBottom: 0 }}>Paid sales, din ke hisaab se</h2>
          <div className="sp-bars" role="img" aria-label={`Pichhle ${days} din ki sales. Sabse zyada ${inr(best.v)}`}>
            {bars.map((b, i) => (
              <div key={b.key} className={b.v > 0 && b.key === best.key ? "max" : ""} style={{ height: `${Math.max(2, (b.v / max) * 100)}%` }} title={`${b.key}: ${inr(b.v)}`}>
                {(days === 7 || i === 0 || i === days - 1) && <i>{days === 7 ? b.label : b.key.slice(5)}</i>}
              </div>
            ))}
          </div>
        </div>
        <div className="sp-c">
          <h2 className="sp-h">Sabse zyada bikne wale</h2>
          {top.length === 0 && <p className="mut" style={{ margin: 0 }}>Is dauran koi order nahi.</p>}
          {top.map((t) => <div key={t.name} className="sp-li"><span>{t.name}</span><b>{t.q} pcs</b></div>)}
        </div>
      </div>

      </>)}

      <div className="sp-two">
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className="sp-h">Recent Orders</h2><Link href="/seller/orders">Sab dekhein →</Link>
          </div>
          <div className="sp-c sp-tw" style={{ padding: "4px 12px" }}>
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/seller/orders/${o.order_no}`}><b>{o.order_no}</b></Link></td>
                    <td>{o.ship_name}</td>
                    <td>{fmtDate(o.created_at)}</td>
                    <td><span className={`tag ${statusClass(o.status)}`}>{o.status}</span></td>
                    <td>{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {can(R, "products") && <div>
          <h2 className="sp-h">Kam stock</h2>
          <div className="sp-c">
            {low.length === 0 && <p className="mut" style={{ margin: 0 }}>Sab products ka stock theek hai.</p>}
            {low.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/seller/products/${p.id}`} className="sp-li">
                <span>{p.name}</span>
                <span className={`tag ${p.stock === 0 ? "x" : "y"}`}>{p.stock === 0 ? "Out of stock" : `Sirf ${p.stock}`}</span>
              </Link>
            ))}
          </div>
        </div>}
      </div>
    </>
  );
}
