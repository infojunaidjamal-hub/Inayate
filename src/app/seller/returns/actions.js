"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run, transaction } from "@/lib/db";
import { inr } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { giveStock } from "@/lib/catalog";
import { addEvent, notifyReturn } from "@/lib/orderFlow";
import { refundPartial } from "@/lib/refunds";
import { issueCreditNote } from "@/lib/invoices";
import { REJECT_REASONS, returnItems, refundPreview, remainingRefundable, destLabel } from "@/lib/returns";
import { round2 } from "@/lib/gst";
import { SITE } from "@/lib/site";

const BACK = "/seller/returns?tab=cr";
const stop = (m) => redirect(`${BACK}&err=${encodeURIComponent(m)}`);
const done = (m) => { revalidatePath("/", "layout"); redirect(`${BACK}&ok=${encodeURIComponent(m)}`); };

export async function acceptReturn(form) {
  const me = await requirePerm("returns");
  const id = Number(form.get("id"));
  const r = one("SELECT * FROM returns WHERE id = ?", id);
  if (!r || r.status !== "Requested") stop("Ye return ab accept nahi ho sakta.");
  const o = one("SELECT * FROM orders WHERE id = ?", r.order_id);
  transaction(() => {
    run("UPDATE returns SET status = 'Approved', stage = 'accepted' WHERE id = ?", id);
    run("UPDATE orders SET status = 'Return Approved' WHERE id = ?", r.order_id);
    addEvent(r.order_id, { kind: "return", code: "accepted", label: "Accepted by seller", by: me, who: "seller" });
    notifyReturn(o, "Your return is accepted", `your return request for order ${o.order_no} is accepted. We will arrange the pickup. Please also choose where you want your refund.`);
  });
  logAct(me, "Return approve kiya", `Return #${id}`);
  done(`Return #${id} accept ho gaya.`);
}

// Reject: wajah likhna zaroori, buyer ko dikhti hai
export async function rejectReturn(form) {
  const me = await requirePerm("returns");
  const id = Number(form.get("id"));
  const reason = String(form.get("reason") || "");
  const note = String(form.get("note") || "").trim().slice(0, 300);
  if (!REJECT_REASONS.includes(reason)) stop("Reject karne ki wajah chuniye.");
  if (reason === "Other" && note.length < 5) stop("Other chuna hai to thoda likhiye ki kyun.");
  const r = one("SELECT * FROM returns WHERE id = ?", id);
  if (!r || r.status !== "Requested") stop("Ye return ab reject nahi ho sakta.");
  const o = one("SELECT * FROM orders WHERE id = ?", r.order_id);
  const why = note ? `${reason}: ${note}` : reason;
  transaction(() => {
    run("UPDATE returns SET status = 'Rejected', stage = 'rejected', reject_reason = ?, reject_note = ? WHERE id = ?", reason, note || null, id);
    run("UPDATE orders SET status = 'Return Rejected' WHERE id = ?", r.order_id);
    addEvent(r.order_id, { kind: "return", code: "rejected", label: "Not accepted by seller", detail: why, by: me, who: "seller" });
    notifyReturn(o, "Your return request", `we could not accept the return request for order ${o.order_no}. Reason: ${why}.`);
  });
  logAct(me, "Return reject kiya", `Return #${id}: ${why}`);
  done(`Return #${id} reject ho gaya.`);
}

// Parcel mil gaya: har item ka quality check. "good" ho to restock (stock wapas judta hai).
export async function qcReturn(form) {
  const me = await requirePerm("returns");
  const id = Number(form.get("id"));
  const r = one("SELECT * FROM returns WHERE id = ?", id);
  if (!r || r.status !== "Approved" || r.stage !== "received") stop("Quality check tabhi hota hai jab parcel mil chuka ho.");
  const o = one("SELECT * FROM orders WHERE id = ?", r.order_id);
  const items = returnItems(id);
  const RES = ["good", "not_resellable", "wrong_item"];
  const picked = [];
  for (const it of items) {
    const res = String(form.get(`res_${it.id}`) || "");
    if (!RES.includes(res)) stop(`"${it.name}" ka quality check result chuniye.`);
    const rq = res === "good" ? Math.max(0, Math.min(Number(form.get(`rq_${it.id}`) ?? it.qty) | 0, it.qty)) : 0;
    picked.push({ it, res, rq });
  }
  const note = String(form.get("qc_note") || "").trim().slice(0, 300);
  if (picked.some((p) => p.res !== "good") && note.length < 3) stop("Jo item restock nahi ho raha uske liye note likhein.");
  transaction(() => {
    for (const p of picked) {
      run("UPDATE return_items SET qc_result = ?, restock_qty = ? WHERE id = ?", p.res, p.rq, p.it.id);
      if (p.rq > 0) giveStock(p.it.product_id, p.it.variant_id, p.rq);
    }
    run("UPDATE returns SET stage = 'qc', qc_note = ?, received_at = COALESCE(received_at, datetime('now')) WHERE id = ?", note || null, id);
    const back = picked.reduce((a, p) => a + p.rq, 0);
    addEvent(r.order_id, { kind: "return", code: "qc", label: "Quality check", detail: `${back} piece restocked${note ? " · " + note : ""}`, by: me, who: "seller" });
    notifyReturn(o, "We received your return", `we received your return for order ${o.order_no} and checked it. Your refund will be issued soon.`);
  });
  logAct(me, "Return quality check", `Return #${id}`);
  done("Quality check save ho gaya. Ab refund kar sakte hain.");
}

// Refund: sirf Owner. Amount server khud nikalta hai (credit note wali rakam), seller sirf deduction (jaise pickup fee) likh sakta hai.
export async function refundReturn(form) {
  const me = await requirePerm("refund");
  const id = Number(form.get("return_id"));
  const r = one("SELECT * FROM returns WHERE id = ?", id);
  if (!r || r.status !== "Approved") stop("Pehle return accept karein.");
  const o = one("SELECT * FROM orders WHERE id = ?", r.order_id);
  const skip = form.get("skip_qc") === "1";
  const skipNote = String(form.get("skip_note") || "").trim();
  if (r.stage !== "qc") {
    if (!skip) stop("Pehle quality check karein.");
    if (skipNote.length < 5) stop("Bina quality check ke refund ke liye wajah likhein.");
  }
  const pv = refundPreview(o, r);
  const deduction = Math.max(0, Math.round(Number(form.get("deduction") || 0)));
  const dnote = String(form.get("deduction_note") || "").trim().slice(0, 200);
  if (deduction > 0 && dnote.length < 3) stop("Deduction kyun kaata, wo likhein (jaise pickup fee).");
  if (deduction >= pv.gross) stop("Deduction refund se kam honi chahiye.");
  const amount = round2(pv.gross - deduction);
  const left = remainingRefundable(o);
  if (amount > left + 0.001) stop(`Is order mein ab sirf ${inr(left)} wapas ho sakta hai.`);

  const dest = r.refund_dest || (o.pay_method !== "COD" && o.razorpay_payment_id ? "original" : null);
  if (!dest) stop("COD order: buyer ne abhi refund ka tarika nahi chuna. Unse chunne ko kahein.");
  let ref = String(form.get("ref") || "").trim();
  if (dest !== "original" && dest !== "wallet" && ref.length < 3) stop("UPI / bank ka reference (jaise UTR number) likhein, jisse paisa bheja.");

  // double refund se bachav: pehle taala lagao
  if (run("UPDATE returns SET refund_method = 'pending' WHERE id = ? AND status = 'Approved' AND refund_method IS NULL", id).changes !== 1) stop("Is return ka refund pehle se chal raha hai.");
  let method = "manual";
  let razorpayId = null;
  if (dest === "original") {
    const res = await refundPartial(o, amount);
    if (res.error) { run("UPDATE returns SET refund_method = NULL WHERE id = ?", id); stop(res.error); }
    method = "razorpay"; razorpayId = res.id; ref = res.id;
  } else if (dest === "wallet") method = "wallet";

  try {
    transaction(() => {
      run("INSERT INTO refunds (order_id, return_id, kind, amount, method, dest, ref, by_name) VALUES (?,?,?,?,?,?,?,?)", o.id, id, "return", amount, method, dest, ref || null, me.name);
      if (method === "wallet") run("INSERT INTO wallet_ledger (user_id, amount, reason, order_no, by_name) VALUES (?,?,?,?,?)", o.user_id, amount, `Refund for return #${id}`, o.order_no, me.name);
      const paid = one("SELECT COALESCE(SUM(amount), 0) s FROM refunds WHERE order_id = ?", o.id).s;
      const full = paid + 0.001 >= Number(o.total);
      run(
        `UPDATE returns SET status = 'Refunded', stage = 'refunded', refund_amount = ?, deduction = ?, deduction_note = ?, refund_method = ?, refund_ref = ?,
           refunded_at = datetime('now'), refunded_by = ?, qc_skipped = ? WHERE id = ?`,
        amount, deduction, dnote || null, method, ref || null, me.name, r.stage === "qc" ? 0 : 1, id
      );
      run(
        `UPDATE orders SET status = 'Refunded', refunded_at = datetime('now'), refund_note = ?, razorpay_refund_id = COALESCE(?, razorpay_refund_id)${full ? ", pay_status = 'Refunded'" : ""} WHERE id = ?`,
        ref || null, razorpayId, o.id
      );
      addEvent(o.id, { kind: "return", code: "refunded", label: "Refund issued", detail: `${inr(amount)} · ${destLabel(dest)}${skip ? " · without quality check: " + skipNote : ""}`, by: me, who: "seller" });
      issueCreditNote({ orderId: o.id, returnId: id, sel: returnItems(id).map((x) => ({ order_item_id: x.order_item_id, qty: x.qty })), withCharges: pv.withCharges, reason: r.reason });
      notifyReturn(o, "Your refund", `your refund of ${inr(amount)} for order ${o.order_no} is issued to ${destLabel(dest)}.${dest === "original" ? ` It reaches you in ${SITE.refundDays}.` : dest === "wallet" ? " It is in your wallet now." : ""}`);
    });
  } catch (e) {
    // paisa ja chuka par record nahi bana: taala laga rehne do, taaki dobara refund na ho
    console.error("refundReturn record:", e, ref);
    stop(`Paisa wapas ho gaya (${ref || method}) par record nahi ban paya. Dobara refund mat karein, ye ID likh lein aur humein batayein.`);
  }
  logAct(me, "Refund kiya", `Return #${id} · ${o.order_no} · ${inr(amount)} · ${destLabel(dest)}`);
  done(`Refund ho gaya: ${inr(amount)} (${destLabel(dest)}). Credit note ban gaya.`);
}
