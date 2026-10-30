import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { fmtDate, statusClass } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments – Seller Panel" };

const FILTERS = {
  all: ["Sab", "1 = 1"],
  online: ["Online", "pay_method <> 'COD'"],
  cod: ["COD", "pay_method = 'COD'"],
  refund: ["Refund baaki", "pay_status = 'Refund Initiated'"],
  refunded: ["Refund ho chuke", "pay_status = 'Refunded'"],
};
const payClass = (s) => ({ Paid: "g", Refunded: "g", "COD Pending": "y", "Payment Pending": "y", "Refund Initiated": "x" })[s] || "";
const sum = (where) => one(`SELECT COALESCE(SUM(total), 0) s, COUNT(*) c FROM orders WHERE ${where}`);

export default async function Payments({ searchParams }) {
  await requireSeller();
  const { f = "all" } = await searchParams;
  const key = FILTERS[f] ? f : "all";
  const online = sum("pay_method <> 'COD' AND pay_status = 'Paid'");
  const cod = sum("pay_method = 'COD' AND pay_status = 'Paid'");
  const codDue = sum("pay_status = 'COD Pending' AND status NOT IN ('Cancelled')");
  const refundDue = sum("pay_status = 'Refund Initiated'");
  const refunded = sum("pay_status = 'Refunded'");
  const list = all(`SELECT * FROM orders WHERE ${FILTERS[key][1]} ORDER BY id DESC LIMIT 200`);

  return (
    <>
      <div className="sec"><h2>Payments</h2><a href="/seller/payments/export" className="btn o s">CSV download (Excel ke liye)</a></div>
      <div className="stats">
        <div className="card"><b>{inr(online.s + cod.s)}</b><br /><small>Kul mila hua paisa</small></div>
        <div className="card"><b>{inr(online.s)}</b><br /><small>Online ({online.c} orders)</small></div>
        <div className="card"><b>{inr(cod.s)}</b><br /><small>COD mila ({cod.c} orders)</small></div>
        <div className="card"><b>{inr(codDue.s)}</b><br /><small>COD aana baaki ({codDue.c})</small></div>
        <Link href="/seller/payments?f=refund" className="card"><b>{inr(refundDue.s)}</b><br /><small>Refund dena baaki ({refundDue.c})</small></Link>
        <div className="card"><b>{inr(refunded.s)}</b><br /><small>Refund ho chuka ({refunded.c})</small></div>
      </div>

      <div className="tabs">
        {Object.entries(FILTERS).map(([k, [label]]) => (
          <Link key={k} href={k === "all" ? "/seller/payments" : `/seller/payments?f=${k}`} className={k === key ? "on" : ""}>{label}</Link>
        ))}
      </div>

      <div className="tw">
        <table>
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Tareeka</th><th>Amount</th><th>Payment</th><th>Razorpay ID</th><th></th></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/seller/orders/${o.order_no}`}><b>{o.order_no}</b></Link><br /><span className={`tag ${statusClass(o.status)}`}>{o.status}</span></td>
                <td>{fmtDate(o.created_at)}</td>
                <td>{o.ship_name}</td>
                <td>{o.pay_method}</td>
                <td>{inr(o.total)}</td>
                <td><span className={`tag ${payClass(o.pay_status)}`}>{o.pay_status}</span></td>
                <td style={{ fontSize: 11, wordBreak: "break-all" }}>{o.razorpay_payment_id || "-"}{o.razorpay_refund_id ? <><br />Refund: {o.razorpay_refund_id}</> : null}</td>
                <td>{o.pay_status === "Refund Initiated" && <Link href={`/seller/orders/${o.order_no}`} className="btn a s">Refund karein</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && <p className="mut">Is filter mein koi order nahi hai.</p>}
      <p className="mut" style={{ fontSize: 12 }}>Sirf pichhle 200 orders dikhte hain. Poora hisaab CSV mein milega.</p>
    </>
  );
}
