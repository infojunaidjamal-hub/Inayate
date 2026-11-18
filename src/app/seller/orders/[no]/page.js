import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate, NEXT_STATUS } from "@/lib/format";
import SellerNav from "@/components/SellerNav";
import OrderUpdateForm from "./OrderUpdateForm";
import RefundForm from "@/components/RefundForm";
import { shipLabel } from "@/lib/checkout";
import HoldForm from "./HoldForm";
import { checkRules, eventsOf, parseList, HOLD_LABEL, slaOf, RTO_STEPS } from "@/lib/orderFlow";
import { rtoNext } from "../../logistics/actions";
import ShipPanel from "./ShipPanel";
import { loadPartners, pincodeListExists, servedBy, parcelOfItems, shipmentOf, shipEvents, costRecord } from "@/lib/logistics";
import { LOGI } from "@/lib/shipMath";

export const dynamic = "force-dynamic";

export default async function SellerOrder({ params, searchParams }) {
  const user = await requirePerm("orders");
  const { no } = await params;
  const { err, ok } = await searchParams;
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o) notFound();
  const items = all("SELECT * FROM order_items WHERE order_id = ?", o.id);
  const ret = one("SELECT * FROM returns WHERE order_id = ?", o.id);
  const allowed = (NEXT_STATUS[o.status] || []).filter((s) => (s !== "Cancelled" || can(user.role, "cancel")) && (s !== "Delivered" || can(user.role, "deliver")));
  const rules = ["On Hold", "Placed"].includes(o.status) ? checkRules(o) : [];
  const holdWhy = parseList(o.hold_reasons);
  const events = eventsOf(o.id);
  const sla = slaOf(o);
  const online = o.pay_method !== "COD" && !!o.razorpay_payment_id;
  const shipment = shipmentOf(o.id);
  const sEvents = shipment ? shipEvents(shipment.id) : [];
  const cost = costRecord(o.id);
  const showShip = ["Packed", "Ready to ship"].includes(o.status);
  const pin = (String(o.ship_address || "").match(/(\d{6})\s*$/) || [])[1] || "";
  const served = showShip && pincodeListExists() ? servedBy(pin) : null;
  const partners = showShip ? loadPartners() : [];
  const parcel = showShip ? parcelOfItems(items) : null;
  const zoneGuess = (served && Object.values(served)[0]?.zone) || LOGI.defaultZone;

  return (
    <>
      <SellerNav />
      <h2>Order {o.order_no}</h2>
      {err && <p className="err">{err}</p>}
      {ok && <p className="ok">{ok}</p>}
      <p className="mut" style={{ marginTop: -8 }}>{fmtDate(o.created_at)}</p>
      <p>
        <span className={`tag ${statusClass(o.status)}`}>{o.status}</span>{" "}
        <span className="tag y">{o.pay_method}: {o.pay_status}</span>
        {sla && <> <span className={`tag ${sla.tone === "late" ? "x" : sla.tone === "soon" ? "y" : "g"}`}>{sla.tone === "late" ? "■" : sla.tone === "soon" ? "▲" : "●"} {sla.label}</span></>}
      </p>
      {["On Hold", "Placed"].includes(o.status) && (
        <div className="card pad" style={{ marginTop: 14, borderColor: "#d9a441" }}>
          <h3>On Hold: verify karna hai</h3>
          <table style={{ width: "100%", fontSize: 14, marginBottom: 10 }}>
            <tbody>
              {rules.map((r) => (
                <tr key={r.code}><td>{r.flag ? "▲" : "●"} {r.label}</td><td className="mut">{r.detail}</td><td><b>{r.flag ? "Flag" : "OK"}</b></td></tr>
              ))}
              {holdWhy.includes("cod_unconfirmed") && <tr><td>▲ {HOLD_LABEL.cod_unconfirmed}</td><td className="mut">Buyer ne COD link se confirm nahi kiya</td><td><b>Flag</b></td></tr>}
            </tbody>
          </table>
          <HoldForm orderNo={o.order_no} canDecide={can(user.role, "verify")} />
        </div>
      )}
      {o.cod_token && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>COD confirmation</h3>
          <p style={{ margin: 0, fontSize: 14, wordBreak: "break-all" }}>
            {o.cod_confirmed_at ? <>Buyer ne confirm kar diya ({fmtDate(o.cod_confirmed_at)}).</> : <>Abhi confirm nahi hua. Buyer ka link: <Link href={`/cod/${o.cod_token}`} style={{ textDecoration: "underline" }}>/cod/{o.cod_token}</Link> (Message outbox mein bhi hai)</>}
          </p>
        </div>
      )}
      {o.status === "NDR" && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Delivery fail (NDR): koshish {o.ndr_attempts} of {o.ndr_max || 3}</h3>
          <p style={{ margin: 0 }}>Wajah: {o.ndr_reason || "-"}. Buyer ko message <Link href="/seller/ndr" style={{ textDecoration: "underline" }}>NDR page</Link> se bhejein, phir re-attempt karein.</p>
        </div>
      )}
      {o.rto_stage && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>RTO: order wapas aa raha hai</h3>
          <p style={{ margin: "0 0 8px" }}>Abhi: <b>{(RTO_STEPS.find(([c]) => c === o.rto_stage) || [])[1] || "-"}</b>{o.rto_qc ? ` · ${o.rto_qc === "good" ? "Restocked" : "Written off"}` : ""}</p>
          {!["qc", "restocked"].includes(o.rto_stage) && (
            <form action={rtoNext}><input type="hidden" name="order_no" value={o.order_no} />
              <button className="btn a">Agla step: {(RTO_STEPS[RTO_STEPS.findIndex(([c]) => c === o.rto_stage) + 1] || [])[1]}</button></form>
          )}
          {o.rto_stage === "qc" && <p className="mut" style={{ margin: 0 }}>Quality check ka result <Link href="/seller/returns?tab=rto" style={{ textDecoration: "underline" }}>Returns &gt; RTO</Link> mein darj karein.</p>}
        </div>
      )}
      <div className="two">
        <div className="card pad">
          <h3>Items</h3>
          {items.map((i) => (
            <div className="row" key={i.id}><span>{i.name}{i.variant_label ? ` (${i.variant_label})` : ""} × {i.qty}</span><span>{inr(i.price * i.qty)}</span></div>
          ))}
          <div className="row"><span>Shipping{o.ship_method ? ` (${shipLabel(o.ship_method)})` : ""}</span><span>{o.shipping ? inr(o.shipping) : "FREE"}</span></div>
          {o.cod_fee > 0 && <div className="row"><span>COD fee</span><span>{inr(o.cod_fee)}</span></div>}
          {o.coupon_discount > 0 && <div className="row"><span>Coupon ({o.coupon})</span><span>-{inr(o.coupon_discount)}</span></div>}
          {o.online_discount > 0 && <div className="row"><span>Online payment discount</span><span>-{inr(o.online_discount)}</span></div>}
          <div className="row" style={{ border: 0 }}><b>Total{o.pay_method === "COD" ? " (COD: customer se lena hai)" : ""}</b><b>{inr(o.total)}</b></div>
        </div>
        <div className="card pad">
          <h3>Customer / Delivery</h3>
          <p style={{ margin: 0 }}>{o.ship_name}<br />{o.ship_address}<br />📞 {o.ship_mobile}</p>
          {o.ship_method === "express" && <p style={{ marginBottom: 0 }}><span className="tag y">Express delivery</span></p>}
          {o.gift ? <p style={{ marginBottom: 0 }}>🎁 <b>Gift order</b></p> : null}
          {o.order_note && <p style={{ marginBottom: 0 }}>Customer note: <b>{o.order_note}</b></p>}
          {(o.courier || o.awb) && <p style={{ marginBottom: 0 }}>Courier: <b>{o.courier || "-"}</b> · Tracking: <b>{o.awb || "-"}</b></p>}
        </div>
      </div>

      {ret && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Return request</h3>
          <p style={{ margin: 0 }}>Wajah: {ret.reason}<br />Status: <b>{ret.status}</b>{can(user.role, "returns") && <> · <Link href="/seller/returns" style={{ textDecoration: "underline" }}>Returns page par decide karein</Link></>}</p>
        </div>
      )}

      {can(user.role, "payments") && (o.razorpay_payment_id || o.razorpay_refund_id || o.refund_note) && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Payment details</h3>
          <p style={{ margin: 0, fontSize: 13, wordBreak: "break-all" }}>
            {o.razorpay_payment_id && <>Razorpay payment ID: <b>{o.razorpay_payment_id}</b><br /></>}
            {o.razorpay_refund_id && <>Refund ID: <b>{o.razorpay_refund_id}</b><br /></>}
            {o.refunded_at && <>Refund date: <b>{fmtDate(o.refunded_at)}</b><br /></>}
            {o.refund_note && <>Refund reference: <b>{o.refund_note}</b></>}
          </p>
        </div>
      )}

      {can(user.role, "refund") && o.pay_status === "Refund Initiated" && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Refund baaki hai: {inr(o.total)}</h3>
          <RefundForm orderNo={o.order_no} online={online} amount={o.total} />
        </div>
      )}

      {showShip && (
        <ShipPanel orderNo={o.order_no} status={o.status} cod={o.pay_method === "COD"} express={o.ship_method === "express"} collected={o.shipping || 0}
          partners={partners} served={served} zoneGuess={zoneGuess} parcel={parcel} shipment={shipment} pin={pin} />
      )}
      {shipment && !showShip && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Shipment</h3>
          <p style={{ margin: 0 }}>{shipment.courier_name} · {shipment.awb} · {shipment.charged_kg} kg · freight {inr(shipment.freight)}{o.pay_method === "COD" ? ` · COD fee ${inr(shipment.cod_fee)}` : ""}</p>
          {sEvents.map((e) => <div className="row" key={e.id}><span>{e.label}{e.detail ? <span className="mut"> · {e.detail}</span> : null}</span><span className="mut">{fmtDate(e.created_at)}</span></div>)}
          <p style={{ marginBottom: 0 }}><Link href={`/seller/orders/${o.order_no}/label`} target="_blank" style={{ textDecoration: "underline" }}>Print label</Link></p>
        </div>
      )}
      {cost && (cost.return_freight > 0 || cost.rto_charge > 0 || o.rto_stage) && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Shipping cost record</h3>
          <div className="row"><span>Forward freight</span><span>{inr(cost.freight)}</span></div>
          <div className="row"><span>COD fee</span><span>{inr(cost.cod_fee)}</span></div>
          <div className="row"><span>Return freight (RTO)</span><span>{inr(cost.return_freight)}</span></div>
          <div className="row"><span>RTO charge</span><span>{inr(cost.rto_charge)}</span></div>
          <div className="row" style={{ border: 0 }}><b>Total</b><b>{inr(cost.total)}</b></div>
        </div>
      )}
      <div className="card pad" style={{ marginTop: 14 }}>
        <h3>Order update</h3>
        {o.status === "On Hold" ? (
          <p className="mut" style={{ margin: 0 }}>Pehle upar Verify ya Reject karein.</p>
        ) : allowed.length > 0 || ["Packed", "Ready to ship", "Shipped"].includes(o.status) ? (
          <OrderUpdateForm orderNo={o.order_no} allowed={allowed} courier={o.courier} awb={o.awb} />
        ) : (
          <p className="mut" style={{ margin: 0 }}>Is order mein ab koi badlav nahi ho sakta.</p>
        )}
      </div>
      <div className="card pad" style={{ marginTop: 14 }}>
        <h3>History</h3>
        {events.map((e) => (
          <div className="row" key={e.id}>
            <span>{e.label}{e.detail ? <span className="mut"> · {e.detail}</span> : null}<span className="mut"> · {e.by_name || "System"}</span></span>
            <span className="mut">{fmtDate(e.created_at)}</span>
          </div>
        ))}
        {events.length === 0 && <p className="mut" style={{ margin: 0 }}>Koi history nahi.</p>}
      </div>
      <p><Link href="/seller/orders">← Saari orders</Link></p>
    </>
  );
}
