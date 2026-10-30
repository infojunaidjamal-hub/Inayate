"use client";
import { refundAction } from "@/app/seller/actions";
import { inr } from "@/lib/money";

// online = true: Razorpay se asli refund. false (COD): seller khud bhejta hai, yahan reference likhta hai
export default function RefundForm({ orderNo, returnId, online, amount }) {
  return (
    <form
      action={refundAction}
      onSubmit={(e) => {
        const msg = online
          ? `${inr(amount)} Razorpay se customer ko wapas jayega. Pakka?`
          : `Kya aapne ${inr(amount)} customer ko bhej diya hai? Ye sirf record hoga.`;
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="order_no" value={orderNo} />
      {returnId ? <input type="hidden" name="return_id" value={returnId} /> : null}
      {!online && <input name="note" placeholder="UPI / bank reference (jaise UTR number)" required minLength={3} />}
      <button className="btn a s">{online ? `Razorpay se ${inr(amount)} refund karein` : "Refund bhej diya (record karein)"}</button>
      {!online && <p className="mut" style={{ fontSize: 12, marginBottom: 0 }}>COD ka paisa Razorpay se nahi jata. Aap apne UPI ya bank se customer ko bhejo, phir yahan reference likho.</p>}
    </form>
  );
}
