import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { destLabel } from "@/lib/returns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Returns & Refunds" };

const STEPS = ["Requested", "Approved", "Refunded"];

export default async function Returns() {
  const user = await getUser();
  if (!user) redirect("/login");
  const list = all(
    `SELECT r.*, o.order_no, o.total, o.pay_status, o.refunded_at AS order_refunded_at,
       (SELECT name FROM order_items WHERE order_id = o.id LIMIT 1) AS item,
       (SELECT GROUP_CONCAT(oi.name || ' × ' || ri.qty, ', ') FROM return_items ri JOIN order_items oi ON oi.id = ri.order_item_id WHERE ri.return_id = r.id) AS items,
       (SELECT id FROM credit_notes WHERE return_id = r.id) AS cn_id
     FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.user_id = ? ORDER BY r.id DESC`,
    user.id
  );
  const wallet = one("SELECT COALESCE(SUM(amount), 0) AS s FROM wallet_ledger WHERE user_id = ?", user.id).s;
  return (
    <>
      <h2>Returns &amp; Refunds</h2>
      {wallet > 0 && <p className="ac-banner" role="status"><span>Aapke <b>wallet</b> mein <b>{inr(wallet)}</b> hai (return ke refund se). Ise checkout par use karne ki suvidha jald aa rahi hai.</span></p>}
      {list.length === 0 && <p className="mut">Abhi koi return request nahi hai. Delivered order ke baad {SITE.returnDays} din ke andar <Link href="/account/orders" style={{ textDecoration: "underline" }}>My Orders</Link> se return kar sakte hain.</p>}
      {list.map((r) => {
        const rejected = r.status === "Rejected";
        const at = STEPS.indexOf(r.status);
        const when = r.refunded_at || r.order_refunded_at;
        return (
          <div className="card pad" key={r.id} style={{ marginBottom: 12 }}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <span><Link href={`/order/${r.order_no}`}><b>{r.order_no}</b></Link>{(r.items || r.item) ? <span className="mut"> · {r.items || r.item}</span> : null}</span>
              <span className={`tag ${rejected ? "x" : r.status === "Refunded" ? "g" : "b"}`}>{r.status}</span>
            </div>
            <p className="mut" style={{ margin: "6px 0" }}>Wajah: {r.reason} · {fmtDate(r.created_at)}</p>
            {!rejected && (
              <>
                <div className="tl">{STEPS.map((_, k) => <i key={k} className={k <= at ? "d" : ""} />)}</div>
                <div className="tls">{STEPS.map((s) => <span key={s}>{s}</span>)}</div>
              </>
            )}
            {r.status === "Approved" && (
              <p style={{ marginBottom: 0 }}>
                Aapka return accept ho gaya hai.{" "}
                {r.refund_dest ? <>Refund jayega: <b>{destLabel(r.refund_dest)}</b>. </> : <b>Refund kahan chahiye, ye abhi chuniye. </b>}
                <Link href={`/order/${r.order_no}`} style={{ textDecoration: "underline" }}>{r.refund_dest ? "Badlein" : "Chuniye"}</Link>
              </p>
            )}
            {r.status === "Refunded" && (
              <p style={{ marginBottom: 0 }}>
                Refund <b>{inr(r.refund_amount ?? r.total)}</b> ho chuka hai{when ? ` (${fmtDate(when)})` : ""} · {destLabel(r.refund_dest || (r.refund_method === "razorpay" ? "original" : r.refund_method === "wallet" ? "wallet" : ""))}.
                {r.refund_method === "razorpay" ? ` Aane mein ${SITE.refundDays} lag sakte hain.` : ""}
                {r.cn_id ? <> <Link href={`/order/${r.order_no}/credit-note/${r.cn_id}`} style={{ textDecoration: "underline" }}>Credit note dekhein</Link></> : null}
              </p>
            )}
            {rejected && <p style={{ marginBottom: 0 }}><b>Ye return accept nahi hua.</b> {r.reject_reason ? `Wajah: ${r.reject_reason}${r.reject_note ? `. ${r.reject_note}` : ""}.` : ""} Zyada jaankari ke liye humse WhatsApp par baat karein.</p>}
          </div>
        );
      })}
    </>
  );
}
