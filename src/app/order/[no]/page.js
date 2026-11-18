import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate, CANCEL_REASONS } from "@/lib/format";
import { cancelOrder } from "@/app/account/actions";
import ReturnForm from "./ReturnForm";
import RefundChoice from "./RefundChoice";
import { invoiceOf, creditNotesOf } from "@/lib/invoices";
import { returnItems, refundPreview, destsFor, destLabel, maskAccount } from "@/lib/returns";
import { returnWindowOpen, returnLastDate } from "@/lib/orders";
import { checkPayment } from "@/app/pay/actions";
import { SITE } from "@/lib/site";
import { shipLabel } from "@/lib/checkout";
import { itemsByOrder } from "@/lib/orderThumbs";
import { eventsOf, forwardSteps, returnSteps, rtoSteps, estimateDelivery } from "@/lib/orderFlow";
import OrderTimeline from "@/components/OrderTimeline";
import CopyText from "@/components/CopyText";
import "@/components/flow.css";
import { STATUS_HEADING as HEADING } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";

const CAN_CANCEL = ["Awaiting Payment", "Placed", "On Hold", "Confirmed", "Packed", "Ready to ship"];

export default async function OrderPage({ params, searchParams }) {
  const { no } = await params;
  const { placed, msg } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  // sirf order ka maalik ya seller dekh sakta hai
  if (!o || (o.user_id !== user.id && user.role === "buyer")) notFound();
  const items = all("SELECT * FROM order_items WHERE order_id = ?", o.id);
  const thumbs = itemsByOrder([o.id])[o.id] || [];
  const ret = one("SELECT * FROM returns WHERE order_id = ?", o.id);
  const mine = o.user_id === user.id;
  const events = eventsOf(o.id);
  const fwd = forwardSteps(o, events);
  const crSteps = returnSteps(ret, events);
  const rto = rtoSteps(o, events);
  const eta = ["Confirmed", "Packed", "Ready to ship", "Picked up", "In transit", "Out for delivery", "NDR", "Shipped"].includes(o.status) ? estimateDelivery(o) : null;
  const showFwd = !["Awaiting Payment", "Cancelled", "On Hold", "Placed"].includes(o.status);
  const retPhotos = (() => { try { return JSON.parse(ret?.photos || "[]"); } catch { return []; } })();
  // Phase 5: return ke items, refund ka chunav, invoice aur credit note
  const retItems = ret ? returnItems(ret.id) : [];
  const preview = ret && ret.status === "Approved" ? refundPreview(o, ret) : null;
  const inv = invoiceOf(o.id);
  const cns = creditNotesOf(o.id);
  const formItems = items.map((i) => ({ id: i.id, name: i.name, variant_label: i.variant_label, qty: i.qty, price: i.price, image: (thumbs.find((t) => t.item_id === i.id) || {}).image || null }));

  return (
    <>
      {placed ? (
        <div className="card pad" style={{ background: "#cfe8d3", color: "#2a2623", marginBottom: 18 }}>
          <h2 style={{ margin: 0 }}>🎉 Order place ho gaya!</h2>
          <p style={{ margin: "6px 0 0" }}>Order number: <b>{o.order_no}</b></p>
        </div>
      ) : (
        <h2>Order {o.order_no}</h2>
      )}
      <p className="mut" style={{ marginTop: placed ? 0 : -8 }}>{fmtDate(o.created_at)}</p>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Items in this order</h3>
        <div className="fl-items">
          {items.map((i, k) => {
            const t = thumbs[k] || {};
            return (
              <div className="fl-it" key={i.id}>
                {t.image ? <img src={t.image} alt="" /> : <span className="ph" />}
                <span style={{ flex: 1 }}><b>{i.name}</b><span className="mut">{i.variant_label ? `${i.variant_label} · ` : ""}Qty {i.qty}</span></span>
                <span>{inr(i.price * i.qty)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <p className="fl-head">{HEADING[o.status] || o.status}</p>
        <p className="fl-eta">
          <span className={`tag ${statusClass(o.status)}`}>{o.status}</span>{" "}
          <span className="tag y">{o.pay_method}: {o.pay_status}</span>
        </p>
        {eta && <p className="fl-eta" style={{ marginTop: 8 }}>Expected delivery by <b>{fmtDate(eta.toISOString().slice(0, 19).replace("T", " "))}</b></p>}
        {o.status === "On Hold" && <p className="mut" style={{ marginBottom: 0 }}>We are doing a quick check on your order. We will message you soon.</p>}
        {o.status === "NDR" && <p className="mut" style={{ marginBottom: 0 }}>Courier could not deliver{o.ndr_reason ? ` (${o.ndr_reason})` : ""}. We will try again, please keep your phone on.</p>}
        {o.status === "Cancelled" && o.cancel_reason && <p className="mut" style={{ marginBottom: 0 }}>Reason: {o.cancel_reason}{o.pay_status === "Refund Initiated" ? ` · Refund will reach you in ${SITE.refundDays}.` : ""}</p>}
      </div>

      {crSteps.length > 0 && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <OrderTimeline title="Return progress" steps={crSteps} />
          {retPhotos.length > 0 && <div className="rf-photos">{retPhotos.map((u) => <img key={u} src={u} alt="Return photo" />)}</div>}
          {ret?.reason && <p className="mut" style={{ marginBottom: 0 }}>Reason: {ret.reason}</p>}
          {retItems.length > 0 && <p className="mut" style={{ marginBottom: 0 }}>Items: {retItems.map((r) => `${r.name}${r.variant_label ? ` (${r.variant_label})` : ""} × ${r.qty}`).join(", ")}</p>}
          {ret?.status === "Rejected" && ret.reject_reason && <p style={{ marginBottom: 0 }}><b>Seller ka jawab:</b> {ret.reject_reason}{ret.reject_note ? `. ${ret.reject_note}` : ""}</p>}
          {mine && ret?.status === "Approved" && (
            <div style={{ marginTop: 12 }}>
              <RefundChoice orderNo={o.order_no} options={destsFor(o)} current={ret.refund_dest || ""} amountHint={preview ? `(lagbhag ${inr(preview.gross)}, quality check ke baad tay hoga)` : ""} />
              {ret.refund_dest === "upi" && <p className="mut" style={{ fontSize: 12 }}>Abhi chuna hua UPI: {ret.refund_upi}</p>}
              {ret.refund_dest === "bank" && (() => { try { const b = JSON.parse(ret.refund_bank || "{}"); return <p className="mut" style={{ fontSize: 12 }}>Abhi chuna hua bank: {b.holder}, {maskAccount(b.account)}, {b.ifsc}</p>; } catch { return null; } })()}
            </div>
          )}
          {ret?.status === "Refunded" && <p style={{ marginBottom: 0 }}><b>Refund:</b> {inr(ret.refund_amount || o.total)} · {destLabel(ret.refund_dest || (ret.refund_method === "razorpay" ? "original" : ""))}{ret.deduction > 0 ? ` (${inr(ret.deduction)} pickup fee kata gaya)` : ""}</p>}
        </div>
      )}
      {rto.length > 0 && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <OrderTimeline title="Return to seller progress" steps={rto} />
        </div>
      )}

      {showFwd && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <OrderTimeline title="Delivery progress" steps={fwd} />
        </div>
      )}

      {o.courier && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <p style={{ margin: 0 }}>Courier: <b>{o.courier}</b></p>
          {o.awb && <p className="fl-copy" style={{ margin: "6px 0 0" }}>Tracking ID: <b>{o.awb}</b> <CopyText text={o.awb} /></p>}
        </div>
      )}

      <div className="two">
        <div className="card pad">
          <h3>Items</h3>
          {items.map((i) => (
            <div className="row" key={i.id}><span>{i.name} × {i.qty}</span><span>{inr(i.price * i.qty)}</span></div>
          ))}
          <div className="row"><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
          <div className="row"><span>Shipping{o.ship_method ? ` (${shipLabel(o.ship_method)})` : ""}</span><span>{o.shipping ? inr(o.shipping) : "FREE"}</span></div>
          {o.cod_fee > 0 && <div className="row"><span>COD fee</span><span>{inr(o.cod_fee)}</span></div>}
          {o.coupon_discount > 0 && <div className="row"><span>Coupon ({o.coupon})</span><span>-{inr(o.coupon_discount)}</span></div>}
          {o.online_discount > 0 && <div className="row"><span>Online payment discount</span><span>-{inr(o.online_discount)}</span></div>}
          <div className="row" style={{ border: 0 }}><b>Total</b><b>{inr(o.total)}</b></div>
        </div>
        <div className="card pad">
          <h3>Delivery</h3>
          <p style={{ margin: 0 }}>{o.ship_name}<br />{o.ship_address}<br />{o.ship_mobile}</p>
          {o.gift ? <p style={{ marginBottom: 0 }}>This order is marked as a gift.</p> : null}
          {o.order_note && <p style={{ marginBottom: 0 }}>Your note: <span className="mut">{o.order_note}</span></p>}
        </div>
      </div>

      {mine && o.status === "Awaiting Payment" && (
        <p style={{ marginTop: 14 }}>
          <Link href={`/pay/${o.order_no}`} className="btn a">💳 Ab payment karein · {inr(o.total)}</Link>
        </p>
      )}
      {msg && <p className="ok" style={{ marginTop: 14 }}>{msg}</p>}
      {mine && o.status === "Awaiting Payment" && o.razorpay_order_id && (
        <form action={checkPayment} style={{ marginTop: 8 }}>
          <input type="hidden" name="order_no" value={o.order_no} />
          <button className="btn o s">Paisa kat gaya par order pending hai? Payment check karein</button>
        </form>
      )}
      {mine && CAN_CANCEL.includes(o.status) && (
        <details className="card pad" style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer" }}>Order cancel karna hai?</summary>
          <form action={cancelOrder} className="fl-reasons" style={{ marginTop: 10 }}>
            <input type="hidden" name="order_no" value={o.order_no} />
            <p className="mut" style={{ marginTop: 0 }}>Courier ko dene se pehle tak cancel ho sakta hai. Wajah chuniye:</p>
            {CANCEL_REASONS.map((r, i) => <label key={r}><input type="radio" name="reason" value={r} defaultChecked={i === 0} />{r}</label>)}
            <input name="comment" maxLength={200} placeholder="Comment (zaroori agar Other chuna)" style={{ marginTop: 6 }} />
            <button className="btn a" style={{ marginTop: 10 }}>Haan, order cancel karein</button>
          </form>
        </details>
      )}
      {mine && o.status === "Delivered" && !ret && !returnWindowOpen(o) && (
        <p className="mut" style={{ marginTop: 14 }}>Return ki {SITE.returnDays} din ki seema khatam ho chuki hai.</p>
      )}
      {mine && o.status === "Delivered" && !ret && returnWindowOpen(o) && (
        <details className="card pad" style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer" }}>Return karna hai?{returnLastDate(o) ? ` (${returnLastDate(o)} tak)` : ""}</summary>
          <div style={{ marginTop: 10 }}><ReturnForm orderNo={o.order_no} items={formItems} /></div>
        </details>
      )}

      {mine && (inv || cns.length > 0) && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <b>Documents</b>
          <p style={{ margin: "8px 0 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {inv && <Link href={`/order/${o.order_no}/invoice`} className="btn o s" style={{ minHeight: 44 }}>Invoice {inv.no} (PDF)</Link>}
            {cns.map((c) => <Link key={c.id} href={`/order/${o.order_no}/credit-note/${c.id}`} className="btn o s" style={{ minHeight: 44 }}>Credit note {c.no}</Link>)}
          </p>
        </div>
      )}

      <p style={{ marginTop: 18 }}>
        <Link href={mine ? "/account/orders" : "/seller"} className="btn o">{mine ? "← Meri saari orders" : "← Seller panel"}</Link>{" "}
        <Link href="/products" className="btn o">Aur shopping karein</Link>
      </p>
    </>
  );
}
