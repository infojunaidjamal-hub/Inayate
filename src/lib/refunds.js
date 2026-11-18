// Refund: online order par Razorpay se asli refund, COD par manual (UPI/bank se bheja, reference likhna zaroori)
import Razorpay from "razorpay";
import { run } from "@/lib/db";

export async function refundOrder(o, note = "") {
  if (!o) return { error: "Order nahi mila." };
  if (!["Paid", "Refund Initiated"].includes(o.pay_status)) {
    return { error: `Is order ka payment status "${o.pay_status}" hai, isliye refund nahi ho sakta.` };
  }
  const online = o.pay_method !== "COD" && !!o.razorpay_payment_id;
  let refundId = o.razorpay_refund_id || null;

  if (online && !refundId) {
    const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return { error: ".env mein Razorpay keys nahi mili." };
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const r = await rzp.payments.refund(o.razorpay_payment_id, {
        amount: Math.round(o.total * 100), // paise mein
        speed: "normal",
        notes: { order_no: o.order_no },
        receipt: `${o.order_no}-R`,
      });
      refundId = r.id;
    } catch (e) {
      return { error: "Razorpay refund nahi hua: " + (e?.error?.description || e?.message || "pata nahi kya hua") };
    }
  } else if (!online) {
    if (String(note).trim().length < 3) return { error: "Manual refund ke liye UPI ya bank ka reference likhein (kaise aur kab bheja)." };
  }

  run(
    "UPDATE orders SET pay_status = 'Refunded', razorpay_refund_id = ?, refunded_at = datetime('now'), refund_note = ? WHERE id = ?",
    refundId, String(note).trim() || null, o.id
  );
  try { // refund ke khate mein bhi likho (Phase 5)
    run("INSERT INTO refunds (order_id, kind, amount, method, ref) VALUES (?,?,?,?,?)", o.id, "order", o.total, online ? "razorpay" : "manual", refundId || String(note).trim() || null);
  } catch (e) { console.error("refund ledger:", e.message); }
  return { ok: true, refundId };
}

// Phase 5: aanshik (partial) refund Razorpay se. amountRupees kam se kam 1 hona chahiye.
export async function refundPartial(o, amountRupees) {
  if (!o.razorpay_payment_id) return { error: "Is order ka Razorpay payment ID nahi hai." };
  const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { error: ".env mein Razorpay keys nahi mili." };
  try {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const r = await rzp.payments.refund(o.razorpay_payment_id, {
      amount: Math.round(Number(amountRupees) * 100), // paise mein
      speed: "normal",
      notes: { order_no: o.order_no },
      receipt: `${o.order_no}-R${Date.now().toString(36)}`.slice(0, 40),
    });
    return { id: r.id };
  } catch (e) {
    return { error: "Razorpay refund nahi hua: " + (e?.error?.description || e?.message || "pata nahi kya hua") };
  }
}
