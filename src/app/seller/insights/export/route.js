import { requirePerm } from "@/lib/auth";
import { insRange, overview, productsTable, eventsTable } from "@/lib/insights";
import { EVENTS, EVENT_INFO } from "@/lib/track";
import { makeWorkbook } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

const col = (key, header, width = 14, type = "text") => ({ key, header, width, type });
const pct = (v) => (v == null ? "" : Math.round(v * 1000) / 10);

// /seller/insights/export?range=30&q=tote&cat=Totes&sort=orders
export async function GET(req) {
  await requirePerm("insights");
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const r = insRange(sp);
  const o = overview(r);
  const k = o.kpis;
  const ev = eventsTable(r);
  const products = productsTable(r, { q: String(sp.q || ""), cat: String(sp.cat || ""), sort: String(sp.sort || "orders") });

  const sheets = [
    { name: "Summary", columns: [col("metric", "Metric", 26), col("value", "Value", 16), col("note", "Note", 40)], rows: [
      { metric: "Period", value: `${r.from} to ${r.to}`, note: `Last ${r.days} days` },
      { metric: "Orders", value: k.orders.v, note: "Cancelled and payment-pending orders are not counted" },
      { metric: "Revenue (INR)", value: k.revenue.v, note: "Cancelled, refunded and returned-to-origin orders are not counted" },
      { metric: "Conversion (%)", value: pct(k.conv.v), note: "Orders divided by product views" },
      { metric: "Return rate (%)", value: pct(k.ret.v), note: `${k.ret.a} returns / ${k.ret.b} delivered` },
      { metric: "RTO rate (%)", value: pct(k.rto.v), note: `${k.rto.a} RTO / ${k.rto.b} shipped` },
      { metric: "NDR success (%)", value: pct(k.ndr.v), note: `${k.ndr.a} delivered / ${k.ndr.b} orders with a failed attempt` },
      { metric: "COD orders", value: o.pay.cod, note: "" },
      { metric: "Prepaid orders", value: o.pay.prepaid, note: "" },
    ] },
    { name: "Daily orders", columns: [col("date", "Date", 14), col("orders", "Orders", 10, "int")], rows: o.daily.map((d) => ({ date: d.d, orders: d.n })) },
    { name: "Products", columns: [col("name", "Product", 30), col("sku", "SKU", 14), col("category", "Category", 16), col("imps", "Impressions", 12, "int"), col("views", "Views", 10, "int"), col("adds", "Add to cart", 12, "int"), col("checkouts", "Checkout", 10, "int"), col("orders", "Orders", 10, "int"), col("conv", "Conversion %", 13), col("revenue", "Revenue (INR)", 14, "money")],
      rows: products.map((p) => ({ ...p, conv: pct(p.conv) })) },
    { name: "Cities", columns: [col("city", "City", 22), col("orders", "Orders", 10, "int")], rows: o.cities.map(([city, n]) => ({ city, orders: n })) },
    { name: "Events", columns: [col("event", "Event", 20), col("meaning", "What it means", 44), col("count", "Count", 10, "int")], rows: EVENTS.map((e) => ({ event: e, meaning: EVENT_INFO[e], count: ev[e] || 0 })) },
  ];
  const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  return new Response(makeWorkbook(sheets), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="insights_last${r.days}days_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
