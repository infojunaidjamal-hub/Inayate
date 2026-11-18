import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate, NEXT_STATUS } from "@/lib/format";
import { RANGES } from "@/lib/reports";
import { PER_PAGE, TODO, parseOrderFilters, orderWhere, orderUrl } from "@/lib/orderList";
import OrdersTable from "./OrdersTable";
import "./orders.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders – Seller Panel" };


export default async function SellerOrders({ searchParams }) {
  await requirePerm("orders");
  const f = parseOrderFilters(await searchParams);
  const { where, params } = orderWhere(f);

  // pages
  const stat = one(`SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN o.status NOT IN ('Cancelled','Refunded') THEN o.total END), 0) s FROM orders o ${where}`, ...params);
  const pages = Math.max(1, Math.ceil(stat.n / PER_PAGE));
  const page = Math.min(f.page, pages);
  const orders = all(`SELECT o.* FROM orders o ${where} ORDER BY o.id DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`, ...params);
  const items = orders.length ? all(`SELECT order_id, name, qty FROM order_items WHERE order_id IN (${orders.map(() => "?").join(",")}) ORDER BY id`, ...orders.map((o) => o.id)) : [];
  const itemText = (id) => {
    const t = items.filter((i) => i.order_id === id).map((i) => `${i.name} ×${i.qty}`).join(", ");
    return t.length > 70 ? t.slice(0, 68) + "…" : t;
  };

  // tabs ke counts (sab orders ke) aur filter ke options (jo database mein hain wahi)
  const counts = Object.fromEntries(all("SELECT status, COUNT(*) c FROM orders GROUP BY status").map((r) => [r.status, r.c]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const todo = TODO.reduce((a, s) => a + (counts[s] || 0), 0);
  const payOptions = all("SELECT DISTINCT pay_status p FROM orders WHERE pay_status IS NOT NULL ORDER BY 1").map((r) => r.p);
  const statuses = Object.keys(counts).sort();
  const tabs = [["", "Sab", total], ["todo", "Action chahiye", todo], ...["On Hold", "Confirmed", "Packed", "Ready to ship", "Picked up", "In transit", "Out for delivery", "Delivered", "NDR", "RTO", "Cancelled"].map((s) => [s, s, counts[s] || 0])];
  if (counts["Awaiting Payment"]) tabs.splice(2, 0, ["Awaiting Payment", "Awaiting Payment", counts["Awaiting Payment"]]);
  const retN = ["Return Requested", "Return Approved"].reduce((a, s) => a + (counts[s] || 0), 0);
  if (retN) tabs.push(["Return Requested", "Return Requested", counts["Return Requested"] || 0]);

  const rows = orders.map((o) => ({
    no: o.order_no, date: fmtDate(o.created_at), name: o.ship_name, mobile: o.ship_mobile, items: itemText(o.id),
    method: o.pay_method, payStatus: o.pay_status, status: o.status, cls: statusClass(o.status), total: inr(o.total),
    can: o.status === "On Hold" ? [] : ["Confirmed", "Packed"].filter((to) => (NEXT_STATUS[o.status] || []).includes(to)),
  }));
  const hasFilter = f.q || f.status || f.pay || f.method || f.city || f.range !== "all";
  const extraOpen = f.pay || f.method || f.city || f.range !== "all";

  return (
    <>
      <h1 style={{ margin: 0 }}>Orders</h1>
      <p className="mut" style={{ margin: "4px 0 16px" }}><Link href="/seller/process" style={{ textDecoration: "underline" }}>Order process</Link> (verify, pack, ship) alag page par hai. Yahan dhoondhein, filter karein, kai orders ek saath aage badhayein aur packing slip print karein.</p>

      <form action="/seller/orders" className="od-bar" role="search">
        <label className="grow">Search
          <input type="search" name="q" defaultValue={f.q} placeholder="Order no, naam, mobile, address, tracking ID ya product…" />
        </label>
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <button className="btn a">Search</button>
      </form>

      <details className="od-more" open={!!extraOpen}>
        <summary>Aur filters (payment, date, city)</summary>
        <form action="/seller/orders" className="od-bar">
          <input type="hidden" name="q" value={f.q} />
          {f.status && <input type="hidden" name="status" value={f.status} />}
          <label>Payment status
            <select name="pay" defaultValue={f.pay}><option value="">Sab</option>{payOptions.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <label>COD / Online
            <select name="method" defaultValue={f.method}><option value="">Sab</option><option>COD</option><option>Online</option></select>
          </label>
          <label>City / pincode<input name="city" defaultValue={f.city} placeholder="jaise Surat" /></label>
          <label>Date
            <select name="range" defaultValue={f.range}>{RANGES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
          </label>
          <label>Se (sirf &quot;Apni date&quot;)<input type="date" name="from" defaultValue={f.rawFrom} /></label>
          <label>Tak<input type="date" name="to" defaultValue={f.rawTo} /></label>
          <button className="btn a">Filter lagayein</button>
        </form>
      </details>

      <div className="od-tabs" role="group" aria-label="Status">
        {tabs.map(([v, t, n]) => (
          <Link key={v || "all"} href={orderUrl(f, { status: v, page: "" })} className={(f.status === v || (!f.status && v === "")) ? "on" : ""}>{t}<em>{n}</em></Link>
        ))}
        {f.status && !tabs.some(([v]) => v === f.status) && statuses.includes(f.status) && <Link href={orderUrl(f, { status: f.status })} className="on">{f.status}</Link>}
      </div>

      <div className="od-sum">
        <span><b>{stat.n}</b> {stat.n === 1 ? "order" : "orders"} mile · kul {inr(stat.s)} (cancelled / refunded chhodkar)</span>
        {hasFilter && <Link href="/seller/orders" style={{ textDecoration: "underline" }}>Saare filter hatayein</Link>}
      </div>

      {rows.length === 0 ? (
        <div className="card pad"><p className="mut" style={{ margin: 0 }}>{hasFilter ? "In filters mein koi order nahi mila." : "Abhi tak koi order nahi aaya."}</p></div>
      ) : (
        <OrdersTable rows={rows} key={`${page}-${rows.map((r) => r.no + r.status).join()}`} />
      )}

      {pages > 1 && (
        <nav className="od-pages" aria-label="Pages">
          {page > 1 && <Link href={orderUrl(f, { page: page - 1 > 1 ? page - 1 : "" })}>‹ Prev</Link>}
          {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, page - 4), page + 3).map((n) => (
            <Link key={n} href={orderUrl(f, { page: n > 1 ? n : "" })} className={n === page ? "on" : ""} aria-current={n === page ? "page" : undefined}>{n}</Link>
          ))}
          {page < pages && <Link href={orderUrl(f, { page: page + 1 })}>Next ›</Link>}
        </nav>
      )}
    </>
  );
}
