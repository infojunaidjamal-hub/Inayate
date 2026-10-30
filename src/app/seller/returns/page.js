import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { fmtDate, statusClass } from "@/lib/format";
import RefundForm from "@/components/RefundForm";
import { decideReturn } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Returns – Seller Panel" };

function Btn({ id, decision, children, cls = "o" }) {
  return (
    <form action={decideReturn} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <button className={`btn ${cls} s`}>{children}</button>
    </form>
  );
}

export default async function SellerReturns({ searchParams }) {
  await requireSeller();
  const { err, ok } = await searchParams;
  const list = all(
    `SELECT r.*, o.order_no, o.ship_name, o.total, o.pay_method, o.pay_status, o.razorpay_payment_id
     FROM returns r JOIN orders o ON o.id = r.order_id ORDER BY r.id DESC`
  );
  return (
    <>
      <h2>Return Requests</h2>
      {err && <p className="err">{err}</p>}
      {ok && <p className="ok">{ok}</p>}
      {list.length === 0 && <p className="mut">Abhi koi return request nahi hai.</p>}
      {list.map((r) => {
        const online = r.pay_method !== "COD" && !!r.razorpay_payment_id;
        return (
          <div key={r.id} className="card pad" style={{ marginBottom: 12 }}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <span><Link href={`/seller/orders/${r.order_no}`}><b>{r.order_no}</b></Link> <span className="mut">· {r.ship_name} · {fmtDate(r.created_at)} · {inr(r.total)} · {r.pay_method}</span></span>
              <span className={`tag ${statusClass(r.status === "Requested" ? "Return Requested" : r.status)}`}>{r.status}</span>
            </div>
            <p style={{ margin: "8px 0" }}>Wajah: {r.reason}</p>
            {r.status === "Requested" && (<><Btn id={r.id} decision="approve" cls="a">Approve</Btn> <Btn id={r.id} decision="reject">Reject</Btn></>)}
            {r.status === "Approved" && ["Paid", "Refund Initiated"].includes(r.pay_status) && (
              <RefundForm orderNo={r.order_no} returnId={r.id} online={online} amount={r.total} />
            )}
            {r.status === "Approved" && !["Paid", "Refund Initiated"].includes(r.pay_status) && (
              <p className="mut" style={{ margin: 0 }}>Payment status "{r.pay_status}" hai, refund ka option nahi.</p>
            )}
          </div>
        );
      })}
    </>
  );
}
