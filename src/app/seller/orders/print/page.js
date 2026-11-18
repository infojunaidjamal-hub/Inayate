import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import PrintButton from "../PrintButton";
import "../orders.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packing slips – Seller Panel" };

// /seller/orders/print?nos=MB1050,MB1051  (ek page par do-teen slip)
export default async function PrintSlips({ searchParams }) {
  await requirePerm("ship");
  const sp = await searchParams;
  const nos = [...new Set(String(Array.isArray(sp.nos) ? sp.nos[0] : sp.nos || "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 50);
  const orders = nos.length ? all(`SELECT * FROM orders WHERE order_no IN (${nos.map(() => "?").join(",")}) ORDER BY id`, ...nos) : [];
  const items = orders.length ? all(`SELECT * FROM order_items WHERE order_id IN (${orders.map(() => "?").join(",")}) ORDER BY id`, ...orders.map((o) => o.id)) : [];

  return (
    <>
      <div className="sp-noprint" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Packing slips</h1>
        {orders.length > 0 && <PrintButton />}
        <Link href="/seller/orders" style={{ textDecoration: "underline" }}>← Orders par wapas</Link>
      </div>
      {orders.length === 0 && <p className="mut">Koi order nahi mila.</p>}
      {orders.map((o) => {
        const cod = o.pay_method === "COD" && o.pay_status === "COD Pending";
        return (
          <section className="sl" key={o.id}>
            <div className="sl-head"><b>{SITE.name}</b><span>{[SITE.phone, SITE.email].filter(Boolean).join(" · ")}</span></div>
            <div className="sl-row"><span>Order <b>{o.order_no}</b></span><span>{fmtDate(o.created_at)}</span></div>
            <div className="sl-ship">
              <small>SHIP TO</small>
              <b>{o.ship_name}</b><br />{o.ship_address}<br />Mobile: {o.ship_mobile}
            </div>
            <table>
              <thead><tr><th>Item</th><th style={{ width: 50 }}>Qty</th></tr></thead>
              <tbody>{items.filter((i) => i.order_id === o.id).map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.qty}</td></tr>)}</tbody>
            </table>
            <div className={"sl-pay" + (cod ? " cod" : "")}>{cod ? `COD: customer se ${inr(o.total)} lena hai` : o.pay_method === "COD" ? "COD (paisa mil chuka hai)" : "PREPAID: paisa nahi lena"}</div>
            {(o.courier || o.awb) && <div style={{ marginBottom: 6 }}>Courier: <b>{o.courier || "-"}</b> · Tracking: <b>{o.awb || "-"}</b></div>}
            <div className="sl-foot">Wapsi ka pata: {SITE.address}</div>
          </section>
        );
      })}
    </>
  );
}
