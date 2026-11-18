import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { itemsByOrder } from "@/lib/orderThumbs";
import { slaOf, estimateDelivery, evaluateHold, parseList, HOLD_LABEL, FLOW, ts } from "@/lib/orderFlow";
import ProcessTable from "./ProcessTable";
import "../orders/orders.css";
import "./process.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order process – Seller Panel" };

const TABS = [
  { id: "verify", label: "To verify", st: ["On Hold", "Placed"], action: "Verify" },
  { id: "pack", label: "To pack", st: ["Confirmed"], bulk: "Mark packed", action: "Pack" },
  { id: "ready", label: "Ready to ship", st: ["Packed", "Ready to ship"], bulk: "Move to next step", action: "Open" },
  { id: "transit", label: "In transit", st: ["Picked up", "In transit", "Out for delivery"], bulk: "Move to next step", action: "Track" },
  { id: "ndr", label: "NDR", st: ["NDR"], action: "Open" },
  { id: "delivered", label: "Delivered", st: ["Delivered"], action: "View" },
  { id: "returns", label: "Returns", st: ["Return Requested", "Return Approved", "RTO"], action: "Open" },
];

export default async function ProcessPage({ searchParams }) {
  await requirePerm("orders");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab)) || TABS[0];

  const counts = Object.fromEntries(all("SELECT status, COUNT(*) c FROM orders GROUP BY status").map((r) => [r.status, r.c]));
  const n = (t) => t.st.reduce((a, s) => a + (counts[s] || 0), 0);

  const orders = all(`SELECT * FROM orders WHERE status IN (${tab.st.map(() => "?").join(",")}) ORDER BY id DESC LIMIT 100`, ...tab.st);
  const items = itemsByOrder(orders.map((o) => o.id));
  const now = Date.now();

  const rows = orders.map((o) => {
    const it = items[o.id] || [];
    const first = it[0] || {};
    let detail = "";
    if (tab.id === "verify") {
      const why = parseList(o.hold_reasons).map((c) => HOLD_LABEL[c] || c);
      detail = (why.length ? why : evaluateHold(o).map((r) => r.label)).join(", ") || "Check karein";
    } else if (tab.id === "pack") detail = `Confirmed ${fmtDate(o.confirmed_at || o.created_at)}`;
    else if (tab.id === "ready") detail = o.courier || o.awb ? `${o.courier || ""} ${o.awb || ""}`.trim() : "Courier + tracking ID chahiye";
    else if (tab.id === "transit") {
      const day = ts(o.picked_at) ? Math.max(1, Math.ceil((now - ts(o.picked_at)) / 864e5)) : 1;
      detail = `${o.status} · Day ${day} · ETA ${fmtDate(estimateDelivery(o).toISOString().slice(0, 10))}`;
    } else if (tab.id === "ndr") detail = `Koshish ${o.ndr_attempts} of ${FLOW.ndrMax}${o.ndr_reason ? `: ${o.ndr_reason}` : ""}`;
    else if (tab.id === "delivered") detail = fmtDate(o.delivered_at);
    else detail = o.status === "RTO" ? `RTO: ${o.rto_stage || "initiated"}` : o.status;
    return {
      no: o.order_no, name: o.ship_name, thumb: first.image || null, product: first.name || "(item)", more: Math.max(0, it.length - 1),
      qty: it.reduce((a, i) => a + i.qty, 0), method: o.pay_method, payStatus: o.pay_status, detail,
      sla: slaOf(o, now), action: tab.action,
      blocked: tab.id === "ready" && o.status === "Packed" && !(o.courier && o.awb), // courier + ID chahiye: order page se
    };
  });

  return (
    <>
      <h1 style={{ margin: 0 }}>Order process</h1>
      <p className="mut" style={{ margin: "4px 0 16px" }}>Har order ka agla kaam yahan hai. Timer: ● time hai, ▲ jaldi karein, ■ late. <Link href="/seller/orders" style={{ textDecoration: "underline" }}>Saare orders</Link></p>
      <div className="od-tabs" role="group" aria-label="Process">
        {TABS.map((t) => (
          <Link key={t.id} href={`/seller/process?tab=${t.id}`} className={t.id === tab.id ? "on" : ""}>{t.label}<em>{n(t)}</em></Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="card pad"><p className="mut" style={{ margin: 0 }}>Is tab mein abhi koi order nahi hai.</p></div>
      ) : (
        <ProcessTable key={tab.id + rows.map((r) => r.no).join()} rows={rows} bulkLabel={tab.bulk || null} tab={tab.id} />
      )}
      {tab.id === "ready" && <p className="mut" style={{ fontSize: 12 }}>Packed order ko "Ready to ship" karne ke liye courier aur tracking ID order page par daalni hoti hai.</p>}
    </>
  );
}
