// Seller ke Orders page ka search / filter / pages ka hisaab
import { parseFilters } from "@/lib/reports";

export const PER_PAGE = 25;
export const TODO = ["On Hold", "Placed", "Confirmed", "Packed", "Ready to ship", "NDR"]; // "action chahiye" wale orders
const g = (sp, k) => String(Array.isArray(sp[k]) ? sp[k][0] : sp[k] ?? "").trim();

export function parseOrderFilters(sp = {}) {
  const d = parseFilters({ ...sp, range: g(sp, "range") || "all" }); // date ki parsing v2 wali hi (default: sab)
  return {
    q: g(sp, "q").slice(0, 60), status: g(sp, "status").slice(0, 30), pay: g(sp, "pay").slice(0, 30),
    method: ["COD", "Online"].includes(g(sp, "method")) ? g(sp, "method") : "", city: g(sp, "city").slice(0, 40),
    range: d.range, from: d.from, to: d.to, rawFrom: d.rawFrom, rawTo: d.rawTo, label: d.label,
    page: Math.max(1, parseInt(g(sp, "page"), 10) || 1),
  };
}

export function orderWhere(f) {
  const w = [], p = [];
  if (f.q) {
    const l = `%${f.q}%`;
    w.push("(o.order_no LIKE ? OR o.ship_name LIKE ? OR o.ship_mobile LIKE ? OR o.ship_address LIKE ? OR o.awb LIKE ? OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.name LIKE ?))");
    p.push(l, l, l, l, l, l);
  }
  if (f.status === "todo") w.push(`o.status IN (${TODO.map((s) => `'${s}'`).join(",")})`);
  else if (f.status) { w.push("o.status = ?"); p.push(f.status); }
  if (f.pay) { w.push("o.pay_status = ?"); p.push(f.pay); }
  if (f.method === "COD") w.push("o.pay_method = 'COD'");
  if (f.method === "Online") w.push("o.pay_method != 'COD'");
  if (f.city) { w.push("o.ship_address LIKE ?"); p.push(`%${f.city}%`); }
  if (f.from) { w.push("date(o.created_at,'+330 minutes') >= ?"); p.push(f.from); }
  if (f.to) { w.push("date(o.created_at,'+330 minutes') <= ?"); p.push(f.to); }
  return { where: w.length ? "WHERE " + w.join(" AND ") : "", params: p };
}

// Page ke links ke liye URL banata hai (jo filter lage hain wo bane rehte hain)
export function orderUrl(f, over = {}) {
  const cur = { q: f.q, status: f.status, pay: f.pay, method: f.method, city: f.city, range: f.range === "all" ? "" : f.range, from: f.range === "custom" ? f.from : "", to: f.range === "custom" ? f.to : "", page: f.page > 1 ? f.page : "" };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...cur, ...over })) if (v !== "" && v != null) p.set(k, String(v));
  const s = p.toString();
  return "/seller/orders" + (s ? "?" + s : "");
}
