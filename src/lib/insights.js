// Phase 7: Insights ke saare numbers yahan se aate hain. SIRF SERVER par chalta hai.
// Samay India (IST) ke hisaab se. Orders aur revenue asli orders table se, shoppers ke events shop_events se.
import { all, one } from "@/lib/db";
import { ymd } from "@/lib/format";

const D = (e) => `date(${e},'+330 minutes')`;
const g = (sp, k) => String(Array.isArray(sp[k]) ? sp[k][0] : sp[k] ?? "").trim();

// Order kab ginti mein aata hai: cancel ya payment-pending order nahi. Revenue mein refund aur wapas aaye (RTO) order bhi nahi.
const ORD = "status NOT IN ('Cancelled','Awaiting Payment')";
const REV = "status NOT IN ('Cancelled','Awaiting Payment','Refunded','RTO','RTO Done')";

export const RANGE_DAYS = [7, 30, 90];
export function insRange(sp = {}) {
  const n = Number(g(sp, "range"));
  const days = RANGE_DAYS.includes(n) ? n : 30;
  const today = new Date(Date.now() + 330 * 60000);
  const day = (k) => ymd(new Date(today.getTime() - k * 864e5));
  return { days, from: day(days - 1), to: ymd(today), pfrom: day(2 * days - 1), pto: day(days) };
}

// from se to tak har din (zero wale din bhi)
const eachDay = (from, to) => {
  const out = [];
  for (let t = Date.parse(from + "T00:00:00Z"); t <= Date.parse(to + "T00:00:00Z"); t += 864e5) out.push(ymd(new Date(t)));
  return out;
};
const rate = (a, b) => (b > 0 ? a / b : null);

function period(from, to) {
  const orders = one(`SELECT COUNT(*) n FROM orders WHERE ${ORD} AND ${D("created_at")} BETWEEN ? AND ?`, from, to).n;
  const revenue = one(`SELECT COALESCE(SUM(total),0) r FROM orders WHERE ${REV} AND ${D("created_at")} BETWEEN ? AND ?`, from, to).r;
  const views = one(`SELECT COUNT(*) n FROM shop_events WHERE event = 'product_view' AND ${D("ts")} BETWEEN ? AND ?`, from, to).n;
  return { orders, revenue, views, conv: rate(orders, views) };
}
const delta = (cur, prev) => (prev > 0 ? (cur - prev) / prev : null);

// City: pata "line, city, state pincode" hai, city = aakhri se pehla tukda
const cityOf = (a) => {
  const p = String(a || "").split(",").map((x) => x.trim()).filter(Boolean);
  const c = p.length >= 3 ? p[p.length - 2] : p.length ? p[p.length - 1].replace(/\s*\d{5,6}\s*$/, "") : "";
  return c ? c.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : "Unknown";
};

export function overview(r) {
  const cur = period(r.from, r.to), prev = period(r.pfrom, r.pto);

  const dailyMap = Object.fromEntries(all(`SELECT ${D("created_at")} d, COUNT(*) n FROM orders WHERE ${ORD} AND ${D("created_at")} BETWEEN ? AND ? GROUP BY d`, r.from, r.to).map((x) => [x.d, x.n]));
  const daily = eachDay(r.from, r.to).map((d) => ({ d, n: dailyMap[d] || 0 }));

  const cod = one(`SELECT COALESCE(SUM(CASE WHEN pay_method = 'COD' THEN 1 ELSE 0 END),0) cod, COUNT(*) n FROM orders WHERE ${ORD} AND ${D("created_at")} BETWEEN ? AND ?`, r.from, r.to);

  const cityCount = {};
  for (const x of all(`SELECT ship_address a FROM orders WHERE ${ORD} AND ${D("created_at")} BETWEEN ? AND ?`, r.from, r.to)) { const c = cityOf(x.a); cityCount[c] = (cityCount[c] || 0) + 1; }
  const cities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 7);

  // Return, RTO, NDR (Phase 3 aur 5 ka asli data)
  const delivered = one(`SELECT COUNT(DISTINCT order_id) n FROM order_events WHERE kind = 'status' AND code = 'Delivered' AND ${D("created_at")} BETWEEN ? AND ?`, r.from, r.to).n;
  const returns = one(`SELECT COUNT(*) n FROM returns WHERE status != 'Rejected' AND ${D("created_at")} BETWEEN ? AND ?`, r.from, r.to).n;
  const ship = one(`SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN status IN ('RTO','RTO Done') THEN 1 ELSE 0 END),0) rto FROM orders WHERE picked_at IS NOT NULL AND ${D("picked_at")} BETWEEN ? AND ?`, r.from, r.to);
  const ndr = one(`SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END),0) ok FROM orders WHERE COALESCE(ndr_attempts,0) > 0 AND status IN ('Delivered','RTO','RTO Done') AND picked_at IS NOT NULL AND ${D("picked_at")} BETWEEN ? AND ?`, r.from, r.to);

  const ev = Object.fromEntries(all(`SELECT event, COUNT(*) n FROM shop_events WHERE ${D("ts")} BETWEEN ? AND ? GROUP BY event`, r.from, r.to).map((x) => [x.event, x.n]));
  const checkouts = one(`SELECT COUNT(DISTINCT COALESCE(visitor,'?') || '|' || ${D("ts")}) n FROM shop_events WHERE event = 'checkout_started' AND ${D("ts")} BETWEEN ? AND ?`, r.from, r.to).n;
  const adds = (ev.add_to_cart || 0) + (ev.buy_now || 0);
  const anyEvents = one("SELECT COUNT(*) n FROM shop_events").n > 0;

  return {
    kpis: {
      orders: { v: cur.orders, d: delta(cur.orders, prev.orders) },
      revenue: { v: cur.revenue, d: delta(cur.revenue, prev.revenue) },
      conv: { v: cur.conv, d: cur.conv != null && prev.conv ? delta(cur.conv, prev.conv) : null },
      ret: { v: rate(returns, delivered), a: returns, b: delivered },
      rto: { v: rate(ship.rto, ship.n), a: ship.rto, b: ship.n },
      ndr: { v: rate(ndr.ok, ndr.n), a: ndr.ok, b: ndr.n },
    },
    daily,
    pay: { cod: cod.cod, prepaid: cod.n - cod.cod },
    cities,
    funnel: [["Viewed a product", cur.views], ["Added to cart", adds], ["Started checkout", checkouts], ["Ordered", cur.orders]],
    anyEvents,
  };
}

export const categoriesList = () => all("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category").map((x) => x.category);

// Product ke hisaab se: views, add to cart, checkout (events) aur orders, revenue (asli orders)
export function productsTable(r, { q = "", cat = "", sort = "orders" } = {}) {
  const w = [], p = [];
  if (q) { w.push("(p.name LIKE ? OR p.sku LIKE ?)"); p.push(`%${q}%`, `%${q}%`); }
  if (cat) { w.push("p.category = ?"); p.push(cat); }
  const ev = (list) => `(SELECT COUNT(*) FROM shop_events e WHERE e.product_id = p.id AND e.event IN (${list}) AND ${D("e.ts")} BETWEEN ? AND ?)`;
  const ord = (sel) => `(SELECT ${sel} FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status NOT IN`;
  const rows = all(
    `SELECT p.id, p.name, p.sku, p.category, p.status,
       ${ev("'impression'")} AS imps, ${ev("'product_view'")} AS views, ${ev("'add_to_cart','buy_now'")} AS adds, ${ev("'checkout_line'")} AS checkouts,
       ${ord("COUNT(DISTINCT oi.order_id)")} ('Cancelled','Awaiting Payment') AND ${D("o.created_at")} BETWEEN ? AND ?) AS orders,
       ${ord("COALESCE(SUM(oi.qty * oi.price),0)")} ('Cancelled','Awaiting Payment','Refunded','RTO','RTO Done') AND ${D("o.created_at")} BETWEEN ? AND ?) AS revenue
     FROM products p ${w.length ? "WHERE " + w.join(" AND ") : ""}`,
    ...Array(6).fill([r.from, r.to]).flat(), ...p
  ).map((x) => ({ ...x, conv: rate(x.orders, x.views) }));
  const key = { orders: "orders", revenue: "revenue", conv: "conv", views: "views" }[sort] || "orders";
  return rows.sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1) || b.views - a.views || a.id - b.id);
}

export function productDetail(r, id) {
  const row = productsTable(r).find((x) => x.id === Number(id));
  if (!row) return null;
  const variants = all(
    `SELECT COALESCE(oi.variant_label, 'No variant') label, SUM(oi.qty) qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = ? AND o.status NOT IN ('Cancelled','Awaiting Payment') AND ${D("o.created_at")} BETWEEN ? AND ? GROUP BY label ORDER BY qty DESC LIMIT 8`,
    row.id, r.from, r.to
  );
  return { ...row, variants };
}

export function eventsTable(r) {
  const c = Object.fromEntries(all(`SELECT event, COUNT(*) n FROM shop_events WHERE ${D("ts")} BETWEEN ? AND ? GROUP BY event`, r.from, r.to).map((x) => [x.event, x.n]));
  return c;
}

/* ---------- Live activity: pichle 12 ghante ---------- */
// Group: 0 Viewed, 1 Added to cart, 2 Checkout started, 3 Ordered, 4 Payment failed
export const GROUP = { product_view: 0, add_to_cart: 1, buy_now: 1, checkout_started: 2, purchase: 3, payment_failed: 4 };
export function liveData() {
  const IST = 330 * 60000, now = Date.now();
  const hours = [];
  for (let i = 11; i >= 0; i--) {
    const t = new Date(now + IST - i * 3600000), hh = t.getUTCHours();
    hours.push({ key: t.toISOString().slice(0, 13).replace("T", " "), label: `${hh % 12 || 12} ${hh < 12 ? "AM" : "PM"}`, c: [0, 0, 0, 0, 0] });
  }
  const idx = Object.fromEntries(hours.map((h, i) => [h.key, i]));
  for (const x of all(`SELECT strftime('%Y-%m-%d %H', ts, '+330 minutes') h, event, COUNT(*) n FROM shop_events WHERE ts >= datetime('now','-14 hours') AND event IN ('product_view','add_to_cart','buy_now','checkout_started','purchase','payment_failed') GROUP BY h, event`)) {
    if (idx[x.h] != null) hours[idx[x.h]].c[GROUP[x.event]] += x.n;
  }
  const feed = all(
    `SELECT e.id, e.event k, e.visitor v, e.ts, e.value val, p.name n, o.order_no o
     FROM shop_events e LEFT JOIN products p ON p.id = e.product_id LEFT JOIN orders o ON o.id = e.order_id
     WHERE e.event IN ('product_view','add_to_cart','buy_now','checkout_started','purchase','payment_failed') ORDER BY e.id DESC LIMIT 10`
  ).map((x) => ({ id: x.id, k: x.k, v: String(x.v || "").slice(2) || "unknown", n: x.n || "", o: x.o || "", val: x.val || 0, t: Date.parse(String(x.ts).replace(" ", "T") + "Z") }));
  return { hours, feed };
}
