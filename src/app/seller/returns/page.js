import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { all, one, inr } from "@/lib/db";
import { fmtDate, statusClass } from "@/lib/format";
import RefundForm from "@/components/RefundForm";
import { decideReturn, returnStage } from "../actions";
import { acceptReturn, rejectReturn, qcReturn } from "./actions";
import ReturnRefundForm from "./ReturnRefundForm";
import { itemsByOrder } from "@/lib/orderThumbs";
import { returnItems, refundPreview, remainingRefundable, destLabel, maskAccount, REJECT_REASONS } from "@/lib/returns";
import { rtoNext, rtoQcDecide } from "../logistics/actions";
import { CR_STEPS, RTO_STEPS, parseList } from "@/lib/orderFlow";
import { costRecord } from "@/lib/logistics";
import "@/components/flow.css";
import "./returns.css";

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

const NEXT_LABEL = { accepted: "Pickup scheduled", pickup: "Picked up by courier", picked: "In transit back", transit: "Received by seller", received: "Quality check done" };

function StageBtn({ r }) {
  if (r.status !== "Approved" || !NEXT_LABEL[r.stage]) return null;
  return (
    <form action={returnStage} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={r.id} />
      <button className="btn a s">Mark: {NEXT_LABEL[r.stage]}</button>
    </form>
  );
}

const TABS = [["rto", "RTO"], ["cr", "Customer returns (CR)"], ["refunds", "Refunds"]];

function RtoBoard({ me }) {
  const rows = all("SELECT * FROM orders WHERE rto_stage IS NOT NULL ORDER BY id DESC");
  const mayShip = true;
  return (
    <>
      <div className="rto-stage">
        {RTO_STEPS.map(([code, label], i) => (
          <div key={code}>
            <h4>{label}{code === "received" ? " (order cancelled)" : ""}</h4>
            {rows.filter((o) => o.rto_stage === code).map((o) => (
              <div className="card pad" key={o.id} style={{ marginBottom: 8 }}>
                <b><Link href={`/seller/orders/${o.order_no}`}>{o.order_no}</Link></b>
                <div className="mut" style={{ fontSize: 13 }}>{o.courier || "-"}{o.awb ? ` · ${o.awb}` : ""} · {o.pay_method === "COD" ? "COD" : "prepaid"}</div>
                {code === "received" && <span className="tag x">Order cancelled</span>}
                {code === "restocked" && <span className={`tag ${o.rto_qc === "damaged" ? "x" : "g"}`}>{o.rto_qc === "damaged" ? "Written off" : "Stock +1"}</span>}
                {["initiated", "transit"].includes(code) && mayShip && (
                  <form action={rtoNext}><input type="hidden" name="order_no" value={o.order_no} /><button className="btn o s" style={{ marginTop: 6 }}>Next step</button></form>
                )}
                {code === "received" && (
                  <form action={rtoNext}><input type="hidden" name="order_no" value={o.order_no} /><button className="btn a s" style={{ marginTop: 6 }}>Do quality check</button></form>
                )}
                {code === "qc" && (
                  <form action={rtoQcDecide} style={{ marginTop: 6 }}>
                    <input type="hidden" name="order_no" value={o.order_no} />
                    <select name="result" defaultValue="good"><option value="good">Good: restock</option><option value="damaged">Damaged: write off</option></select>
                    <input name="note" placeholder="Note (damaged ke liye zaroori)" style={{ marginTop: 4 }} />
                    <button className="btn a s" style={{ marginTop: 4 }}>Save quality check</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {rows.length === 0 && <p className="mut">Abhi koi RTO nahi hai.</p>}
      <div className="card pad" style={{ marginTop: 14 }}>
        <div className="row" style={{ border: 0, padding: 0 }}>
          <h3 style={{ margin: 0 }}>Shipping cost record</h3>
          <a className="btn o s" href="/seller/returns/costs">Export Excel</a>
        </div>
        <table className="rt-tab">
          <thead><tr><th>Order</th><th>Forward freight</th><th>COD fee</th><th>Return freight</th><th>RTO charge</th><th>Total loss</th><th>Note</th></tr></thead>
          <tbody>
            {rows.map((o) => {
              const c = costRecord(o.id);
              return c ? (
                <tr key={o.id}><td><b>{o.order_no}</b></td><td>{inr(c.freight)}</td><td>{inr(c.cod_fee)}</td><td>{inr(c.return_freight)}</td><td>{inr(c.rto_charge)}</td><td><b>{inr(c.total)}</b></td><td className="mut">{c.note || ""}</td></tr>
              ) : null;
            })}
          </tbody>
        </table>
        <p className="mut" style={{ marginBottom: 0, fontSize: 13 }}>Parcel RTO mein wapas aate hi order cancel ho jata hai. Stock sirf quality check ke baad wapas judta hai.</p>
      </div>
    </>
  );
}

function RefundsTab({ me }) {
  const rows = all(
    `SELECT o.*, (SELECT r.id FROM returns r WHERE r.order_id = o.id ORDER BY r.id DESC LIMIT 1) AS rid
     FROM orders o WHERE o.pay_status IN ('Refund Initiated','Refunded') OR (o.rto_stage IS NOT NULL AND o.pay_method = 'COD') ORDER BY o.id DESC LIMIT 100`
  );
  const type = (o) => (o.rto_stage ? `RTO (${o.pay_method === "COD" ? "COD" : "prepaid"})` : o.rid ? "CR" : "Cancelled");
  return (
    <div className="card pad">
      <table className="rt-tab">
        <thead><tr><th>Order</th><th>Type</th><th>Amount</th><th>Refund to</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((o) => {
            const nothing = o.pay_method === "COD" && o.pay_status !== "Refund Initiated" && o.pay_status !== "Refunded";
            const online = o.pay_method !== "COD" && !!o.razorpay_payment_id;
            return (
              <tr key={o.id}>
                <td><b><Link href={`/seller/orders/${o.order_no}`}>{o.order_no}</Link></b></td>
                <td>{type(o)}</td>
                <td>{nothing ? inr(0) : inr(o.total)}</td>
                <td>{nothing ? "No payment taken" : "Original payment method"}</td>
                <td>
                  {nothing ? <span className="tag g">Nothing to refund</span>
                    : o.pay_status === "Refunded" ? <span className="tag g">Refunded</span>
                    : can(me.role, "refund") ? <RefundForm orderNo={o.order_no} online={online} amount={o.total} />
                    : <span className="tag y">Refund pending (Owner karega)</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mut">Abhi koi refund baaki nahi hai.</p>}
      <p className="mut" style={{ marginBottom: 0, fontSize: 13 }}>Prepaid RTO ka refund parcel milte hi apne aap shuru hota hai. Agar Razorpay se nahi ho paya to yahan baaki dikhta hai.</p>
      <LedgerTable />
    </div>
  );
}

// Jitne bhi refund hue (poore ya aanshik), ek khata
function LedgerTable() {
  const rows = all("SELECT f.*, o.order_no FROM refunds f JOIN orders o ON o.id = f.order_id ORDER BY f.id DESC LIMIT 100");
  if (!rows.length) return null;
  const kind = { return: "Return", order: "Cancel / RTO" };
  return (
    <>
      <h3 style={{ margin: "18px 0 6px" }}>Refunds issued</h3>
      <table className="rt-tab">
        <thead><tr><th>Date</th><th>Order</th><th>Type</th><th>Amount</th><th>Method</th><th>Reference</th><th>By</th></tr></thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id}>
              <td>{fmtDate(f.created_at)}</td>
              <td><b><Link href={`/seller/orders/${f.order_no}`}>{f.order_no}</Link></b></td>
              <td>{kind[f.kind] || f.kind}</td>
              <td><b>{inr(f.amount)}</b></td>
              <td>{f.method === "razorpay" ? "Razorpay" : f.method === "wallet" ? "Wallet" : "Manual"}{f.dest ? ` · ${destLabel(f.dest)}` : ""}</td>
              <td className="mut">{f.ref || ""}</td>
              <td className="mut">{f.by_name || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default async function SellerReturns({ searchParams }) {
  const me = await requirePerm("returns");
  const sp = await searchParams;
  const { err, ok } = sp;
  const tab = TABS.some((t) => t[0] === sp.tab) ? sp.tab : "rto";
  const n = {
    rto: one("SELECT COUNT(*) c FROM orders WHERE rto_stage IS NOT NULL AND rto_stage <> 'restocked'").c,
    cr: one("SELECT COUNT(*) c FROM returns WHERE status = 'Requested'").c,
    refunds: one("SELECT COUNT(*) c FROM orders WHERE pay_status = 'Refund Initiated'").c,
  };
  return (
    <>
      <h2>Returns &amp; Refunds</h2>
      <p className="mut" style={{ marginTop: -8 }}>Jo bhi aapke paas wapas aata hai, ek jagah.</p>
      <div style={{ display: "flex", gap: 6, margin: "10px 0 14px", flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <Link key={id} href={`/seller/returns?tab=${id}`} className={`btn s ${tab === id ? "a" : "o"}`}>{label}{n[id] > 0 ? ` (${n[id]})` : ""}</Link>
        ))}
        <Link href="/seller/returns/reasons" className="btn s o">Return reasons report</Link>
      </div>
      {err && <p className="err">{err}</p>}
      {ok && <p className="ok">{ok}</p>}
      {tab === "rto" && <RtoBoard me={me} />}
      {tab === "refunds" && <RefundsTab me={me} />}
      {tab === "cr" && <CrList me={me} />}
    </>
  );
}

const RES_LABEL = { good: "Good, restock", not_resellable: "Not resellable", wrong_item: "Wrong item received" };

function RejectBox({ id }) {
  return (
    <details className="rr-rej">
      <summary className="btn o s">Reject</summary>
      <form action={rejectReturn}>
        <input type="hidden" name="id" value={id} />
        <label htmlFor={`rj${id}`}>Wajah (buyer ko dikhegi)</label>
        <select id={`rj${id}`} name="reason" required defaultValue="">
          <option value="" disabled>Wajah chuniye</option>
          {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <label htmlFor={`rn${id}`}>Buyer ko message (Other ke liye zaroori)</label>
        <textarea id={`rn${id}`} name="note" rows={2} maxLength={300} placeholder="jaise: please damage ki saaf photo bhejein" />
        <button className="btn s" style={{ background: "#fff", color: "#a63a30", border: "1.5px solid #a63a30", minHeight: 44 }}>Reject return</button>
      </form>
    </details>
  );
}

function QcBox({ r, items, thumbOf }) {
  return (
    <form action={qcReturn} className="rr-qc">
      <input type="hidden" name="id" value={r.id} />
      <b>Quality check</b>
      {items.map((it) => (
        <div className="rr-qrow" key={it.id}>
          <span className="rr-th">{thumbOf(it.order_item_id)}</span>
          <span style={{ flex: 1, minWidth: 140 }}><b>{it.name}</b>{it.variant_label ? ` (${it.variant_label})` : ""} <span className="mut">× {it.qty}</span></span>
          <select name={`res_${it.id}`} defaultValue="good" aria-label={`Result for ${it.name}`}>
            {Object.entries(RES_LABEL).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
          </select>
          <input name={`rq_${it.id}`} type="number" min="0" max={it.qty} defaultValue={it.qty} aria-label={`Restock quantity for ${it.name}`} style={{ width: 70 }} title="Kitne piece stock mein wapas" />
        </div>
      ))}
      <label htmlFor={`qn${r.id}`}>Note (jo item restock nahi ho raha uske liye zaroori)</label>
      <input id={`qn${r.id}`} name="qc_note" maxLength={300} placeholder="jaise: strap fata hua, bechne layak nahi" />
      <button className="btn a s" style={{ minHeight: 44 }}>Save quality check</button>
    </form>
  );
}

async function CrList({ me }) {
  const list = all(
    `SELECT r.*, o.order_no, o.ship_name, o.total AS order_total FROM returns r JOIN orders o ON o.id = r.order_id ORDER BY r.id DESC`
  );
  const thumbs = itemsByOrder(list.map((r) => r.order_id));
  const mayRefund = can(me.role, "refund");
  return (
    <>
      {list.length === 0 && <p className="mut">Abhi koi return request nahi hai.</p>}
      {list.map((r) => {
        const o = one("SELECT * FROM orders WHERE id = ?", r.order_id);
        const items = returnItems(r.id);
        const byItem = new Map((thumbs[r.order_id] || []).map((t) => [t.item_id, t]));
        const thumbOf = (id) => { const t = byItem.get(id); return t && t.image ? <img src={t.image} alt="" /> : null; };
        const showStep = r.status === "Approved" && r.stage && r.stage !== "qc";
        const cn = r.status === "Refunded" ? one("SELECT id, no FROM credit_notes WHERE return_id = ?", r.id) : null;
        let bank = null;
        try { bank = r.refund_bank ? JSON.parse(r.refund_bank) : null; } catch {}
        const pv = r.status === "Approved" ? refundPreview(o, r) : null;
        const prepaid = o.pay_method !== "COD" && !!o.razorpay_payment_id;
        const dest = r.refund_dest || (prepaid ? "original" : null);
        const left = remainingRefundable(o);
        const blocked = !dest ? "COD order: buyer ne abhi refund ka tarika nahi chuna. Unse chunne ko kahein." : left <= 0 ? "Is order ka paisa pehle hi wapas ho chuka hai." : "";
        const destText = dest ? destLabel(dest) + (dest === "upi" && r.refund_upi ? ` (${r.refund_upi})` : dest === "bank" && bank ? ` (${bank.holder}, ${bank.account}, ${bank.ifsc})` : "") : "-";
        return (
          <div key={r.id} className="card pad" style={{ marginBottom: 12 }}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <span><Link href={`/seller/orders/${r.order_no}`}><b>{r.order_no}</b></Link> <span className="tag b">CR</span> <span className="mut">· {r.ship_name} · {fmtDate(r.created_at)} · order {inr(r.order_total)} · {o.pay_method}</span></span>
              <span className={`tag ${statusClass(r.status === "Requested" ? "Return Requested" : r.status)}`}>{r.status}</span>
            </div>
            <div className="rr-items">
              {items.map((it) => (
                <div className="rr-item" key={it.id}>
                  <span className="rr-th">{thumbOf(it.order_item_id)}</span>
                  <span><b>{it.name}</b>{it.variant_label ? ` (${it.variant_label})` : ""} <span className="mut">× {it.qty} of {it.bought}</span>{it.qc_result ? <span className={`tag ${it.qc_result === "good" ? "g" : "x"}`} style={{ marginLeft: 6 }}>{RES_LABEL[it.qc_result]}{it.restock_qty ? ` (+${it.restock_qty} stock)` : ""}</span> : null}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: "8px 0" }}>Wajah: {r.reason}</p>
            {parseList(r.photos).length > 0 && (
              <div className="rf-photos">{parseList(r.photos).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Return photo" /></a>)}</div>
            )}
            {r.status === "Approved" && (
              <p className="mut" style={{ margin: "8px 0" }}>
                Step: <b>{(CR_STEPS.find(([c]) => c === r.stage) || [])[1] || r.stage}</b>{" "}
                {showStep && r.stage !== "received" && <StageBtn r={r} />}
                <br />Refund ka tarika (buyer ne chuna): <b>{r.refund_dest ? destLabel(r.refund_dest) : prepaid ? "abhi nahi chuna (original payment method use hoga)" : "abhi nahi chuna"}</b>
              </p>
            )}
            {r.status === "Requested" && (
              <div className="rr-acts">
                <form action={acceptReturn}><input type="hidden" name="id" value={r.id} /><button className="btn a s" style={{ minHeight: 44 }}>Accept</button></form>
                <RejectBox id={r.id} />
              </div>
            )}
            {r.status === "Approved" && r.stage === "received" && <QcBox r={r} items={items} thumbOf={thumbOf} />}
            {r.status === "Approved" && r.stage === "qc" && (
              mayRefund
                ? <ReturnRefundForm returnId={r.id} gross={pv.gross} goods={pv.goods} charges={pv.gross - pv.goods} destText={destText} needsRef={dest === "upi" || dest === "bank"} blocked={blocked} />
                : <p className="mut" style={{ margin: 0 }}>Refund sirf Owner kar sakta hai.</p>
            )}
            {r.status === "Approved" && r.stage !== "qc" && r.stage !== "received" && mayRefund && (
              <details className="rr-skip">
                <summary className="mut">Bina quality check ke refund karna hai?</summary>
                <ReturnRefundForm skipQc returnId={r.id} gross={pv.gross} goods={pv.goods} charges={pv.gross - pv.goods} destText={destText} needsRef={dest === "upi" || dest === "bank"} blocked={blocked} />
              </details>
            )}
            {r.status === "Rejected" && <p style={{ margin: "8px 0 0" }}><b>Reject:</b> {r.reject_reason || "-"}{r.reject_note ? `. ${r.reject_note}` : ""}</p>}
            {r.status === "Refunded" && (
              <p style={{ margin: "8px 0 0" }}>
                <b>Refund {inr(r.refund_amount ?? r.order_total)}</b> · {r.refund_method === "razorpay" ? "Razorpay" : r.refund_method === "wallet" ? "Wallet" : "Manual"}{r.refund_ref ? ` · ${r.refund_ref}` : ""}{r.refunded_at ? ` · ${fmtDate(r.refunded_at)}` : ""}
                {r.deduction > 0 ? <span className="mut"> · {inr(r.deduction)} kata ({r.deduction_note})</span> : null}
                {cn ? <> · <Link href={`/seller/invoices/print?cn=${cn.id}`} target="_blank">Credit note {cn.no}</Link></> : null}
                {bank ? <span className="mut"> · {maskAccount(bank.account)}</span> : null}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
