import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate, NEXT_STATUS } from "@/lib/format";
import SellerNav from "@/components/SellerNav";
import OrderUpdateForm from "./OrderUpdateForm";
import RefundForm from "@/components/RefundForm";

export const dynamic = "force-dynamic";

export default async function SellerOrder({ params, searchParams }) {
  await requireSeller();
  const { no } = await params;
  const { err, ok } = await searchParams;
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o) notFound();
  const items = all("SELECT * FROM order_items WHERE order_id = ?", o.id);
  const ret = one("SELECT * FROM returns WHERE order_id = ?", o.id);
  const allowed = NEXT_STATUS[o.status] || [];
  const online = o.pay_method !== "COD" && !!o.razorpay_payment_id;

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
      </p>
      <div className="two">
        <div className="card pad">
          <h3>Items</h3>
          {items.map((i) => (
            <div className="row" key={i.id}><span>{i.name} × {i.qty}</span><span>{inr(i.price * i.qty)}</span></div>
          ))}
          <div className="row"><span>Shipping</span><span>{o.shipping ? inr(o.shipping) : "FREE"}</span></div>
          <div className="row" style={{ border: 0 }}><b>Total{o.pay_method === "COD" ? " (COD: customer se lena hai)" : ""}</b><b>{inr(o.total)}</b></div>
        </div>
        <div className="card pad">
          <h3>Customer / Delivery</h3>
          <p style={{ margin: 0 }}>{o.ship_name}<br />{o.ship_address}<br />📞 {o.ship_mobile}</p>
          {(o.courier || o.awb) && <p style={{ marginBottom: 0 }}>Courier: <b>{o.courier || "-"}</b> · Tracking: <b>{o.awb || "-"}</b></p>}
        </div>
      </div>

      {ret && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Return request</h3>
          <p style={{ margin: 0 }}>Wajah: {ret.reason}<br />Status: <b>{ret.status}</b> · <Link href="/seller/returns" style={{ textDecoration: "underline" }}>Returns page par decide karein</Link></p>
        </div>
      )}

      {(o.razorpay_payment_id || o.razorpay_refund_id || o.refund_note) && (
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

      {o.pay_status === "Refund Initiated" && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <h3>Refund baaki hai: {inr(o.total)}</h3>
          <RefundForm orderNo={o.order_no} online={online} amount={o.total} />
        </div>
      )}

      <div className="card pad" style={{ marginTop: 14 }}>
        <h3>Order update</h3>
        {allowed.length > 0 || ["Packed", "Shipped"].includes(o.status) ? (
          <OrderUpdateForm orderNo={o.order_no} allowed={allowed} courier={o.courier} awb={o.awb} />
        ) : (
          <p className="mut" style={{ margin: 0 }}>Is order mein ab koi badlav nahi ho sakta.</p>
        )}
      </div>
      <p><Link href="/seller/orders">← Saari orders</Link></p>
    </>
  );
}
