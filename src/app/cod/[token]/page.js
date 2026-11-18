import { notFound } from "next/navigation";
import { all, one, inr } from "@/lib/db";
import { FLOW, ts } from "@/lib/orderFlow";
import { CANCEL_REASONS } from "@/lib/format";
import { itemsByOrder } from "@/lib/orderThumbs";
import { SITE } from "@/lib/site";
import { codConfirm, codCancel } from "./actions";
import "@/components/flow.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm your COD order", robots: { index: false, follow: false } };

const mask = (s) => { const t = String(s || "").trim(); return t ? t.slice(0, 1) + "•".repeat(Math.max(2, t.length - 1)) : ""; };

export default async function CodPage({ params }) {
  const { token } = await params;
  const o = /^[a-f0-9]{32}$/.test(token) ? one("SELECT * FROM orders WHERE cod_token = ?", token) : null;
  if (!o) notFound();
  const items = itemsByOrder([o.id])[o.id] || [];
  const pin = (String(o.ship_address || "").match(/(\d{6})\s*$/) || [])[1] || "";
  const left = ts(o.cod_sent_at) ? ts(o.cod_sent_at) + FLOW.codConfirmHours * 3600e3 - Date.now() : null;
  const hrs = left == null ? null : Math.max(0, Math.floor(left / 3600e3));
  const mins = left == null ? null : Math.max(0, Math.floor((left % 3600e3) / 60e3));
  const closed = o.status === "Cancelled";
  const live = ["On Hold", "Confirmed", "Packed", "Ready to ship"].includes(o.status);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h2>Confirm your order</h2>
      <p className="mut" style={{ marginTop: -8 }}>Order <b>{o.order_no}</b> · {SITE.name}</p>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <div className="fl-items">
          {items.map((i, k) => (
            <div className="fl-it" key={k}>
              {i.image ? <img src={i.image} alt="" /> : <span className="ph" />}
              <span><b>{i.name}</b><span className="mut">{i.variant_label ? `${i.variant_label} · ` : ""}Qty {i.qty}</span></span>
            </div>
          ))}
        </div>
        <p style={{ margin: "12px 0 0" }}>Pay on delivery: <b>{inr(o.total)}</b></p>
        <p className="mut" style={{ margin: "4px 0 0" }}>Deliver to {mask(o.ship_name)}{pin ? `, PIN ${pin}` : ""}</p>
      </div>

      {closed ? (
        <p className="err">This order is cancelled.</p>
      ) : o.cod_confirmed_at ? (
        <p className="ok">Thank you! Your order is confirmed. We will ship it soon.</p>
      ) : live ? (
        <>
          {hrs != null && <p className="mut">{left > 0 ? `Please confirm within ${hrs}h ${mins}m, otherwise the order may be put on hold.` : "The confirmation time is over, but you can still confirm now."}</p>}
          <form action={codConfirm}>
            <input type="hidden" name="token" value={token} />
            <button className="btn a">Yes, confirm my order</button>
          </form>
          <details className="card pad" style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer" }}>I want to cancel this order</summary>
            <form action={codCancel} className="fl-reasons" style={{ marginTop: 10 }}>
              <input type="hidden" name="token" value={token} />
              {CANCEL_REASONS.map((r, i) => <label key={r}><input type="radio" name="reason" value={r} defaultChecked={i === 0} />{r}</label>)}
              <button className="btn o" style={{ marginTop: 8 }}>Cancel order</button>
            </form>
          </details>
        </>
      ) : (
        <p className="mut">This order has already moved ahead (status: {o.status}).</p>
      )}
    </div>
  );
}
