import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";
import { cancelOrder } from "@/app/account/actions";
import ReturnForm from "./ReturnForm";
import { returnWindowOpen, returnLastDate } from "@/lib/orders";
import { checkPayment } from "@/app/pay/actions";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const STEPS = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"];

export default async function OrderPage({ params, searchParams }) {
  const { no } = await params;
  const { placed, msg } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  // sirf order ka maalik ya seller dekh sakta hai
  if (!o || (o.user_id !== user.id && user.role !== "seller")) notFound();
  const items = all("SELECT * FROM order_items WHERE order_id = ?", o.id);
  const ret = one("SELECT * FROM returns WHERE order_id = ?", o.id);
  const mine = o.user_id === user.id;

  const idx = STEPS.indexOf(o.status);
  const afterDelivery = ["Return Requested", "Return Approved", "Return Rejected", "Refunded"].includes(o.status);

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
        <h3>Status</h3>
        {idx >= 0 || afterDelivery ? (
          <p style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {STEPS.map((s, i) => {
              const done = afterDelivery || i <= idx;
              return (
                <span key={s} className={`tag ${done ? "g" : ""}`} style={{ opacity: done ? 1 : 0.45 }}>{done ? "✓ " : ""}{s}</span>
              );
            })}
          </p>
        ) : null}
        <p style={{ margin: 0 }}>
          Abhi: <span className={`tag ${statusClass(o.status)}`}>{o.status}</span>{" "}
          <span className="tag y">{o.pay_method}: {o.pay_status}</span>
        </p>
        {o.courier && <p style={{ marginBottom: 0 }}>Courier: <b>{o.courier}</b>{o.awb ? <> · Tracking ID: <b>{o.awb}</b></> : null}</p>}
        {ret && <p style={{ marginBottom: 0 }}>Return request: <b>{ret.status}</b> <span className="mut">({ret.reason})</span></p>}
      </div>

      <div className="two">
        <div className="card pad">
          <h3>Items</h3>
          {items.map((i) => (
            <div className="row" key={i.id}><span>{i.name} × {i.qty}</span><span>{inr(i.price * i.qty)}</span></div>
          ))}
          <div className="row"><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
          <div className="row"><span>Shipping</span><span>{o.shipping ? inr(o.shipping) : "FREE"}</span></div>
          <div className="row" style={{ border: 0 }}><b>Total</b><b>{inr(o.total)}</b></div>
        </div>
        <div className="card pad">
          <h3>Delivery</h3>
          <p style={{ margin: 0 }}>{o.ship_name}<br />{o.ship_address}<br />{o.ship_mobile}</p>
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
      {mine && ["Placed", "Confirmed", "Awaiting Payment"].includes(o.status) && (
        <details className="card pad" style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer" }}>Order cancel karna hai?</summary>
          <form action={cancelOrder} style={{ marginTop: 10 }}>
            <input type="hidden" name="order_no" value={o.order_no} />
            <p className="mut" style={{ marginTop: 0 }}>Cancel karne par ye order wapas nahi aayega.</p>
            <button className="btn a">Haan, order cancel karein</button>
          </form>
        </details>
      )}
      {mine && o.status === "Delivered" && !ret && !returnWindowOpen(o) && (
        <p className="mut" style={{ marginTop: 14 }}>Return ki {SITE.returnDays} din ki seema khatam ho chuki hai.</p>
      )}
      {mine && o.status === "Delivered" && !ret && returnWindowOpen(o) && (
        <details className="card pad" style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer" }}>Return karna hai?{returnLastDate(o) ? ` (${returnLastDate(o)} tak)` : ""}</summary>
          <div style={{ marginTop: 10 }}><ReturnForm orderNo={o.order_no} /></div>
        </details>
      )}

      <p style={{ marginTop: 18 }}>
        <Link href={mine ? "/account/orders" : "/seller"} className="btn o">{mine ? "← Meri saari orders" : "← Seller panel"}</Link>{" "}
        <Link href="/products" className="btn o">Aur shopping karein</Link>
      </p>
    </>
  );
}
