"use client";
import { useState } from "react";
import { refundReturn } from "./actions";

const rupees = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Seller (Owner) ka refund form. Rakam server khud nikalta hai; yahan sirf deduction (jaise pickup fee) likhi ja sakti hai.
export default function ReturnRefundForm({ returnId, gross, goods, charges, destText, needsRef, blocked, skipQc }) {
  const [ded, setDed] = useState("");
  const d = Math.max(0, Math.round(Number(ded) || 0));
  const final = Math.max(0, gross - d);
  return (
    <form
      action={refundReturn}
      className="rr-form"
      onSubmit={(e) => { if (!window.confirm(`${rupees(final)} refund karna hai (${destText})? Ye wapas nahi ho sakta.`)) e.preventDefault(); }}
    >
      <input type="hidden" name="return_id" value={returnId} />
      {skipQc && <input type="hidden" name="skip_qc" value="1" />}
      <div className="rr-sum">
        <div><span>Maal ka refund</span><b>{rupees(goods)}</b></div>
        {charges > 0 && <div><span>Shipping + COD fee wapas</span><b>{rupees(charges)}</b></div>}
        {d > 0 && <div><span>Kata gaya</span><b>− {rupees(d)}</b></div>}
        <div className="rr-total"><span>Refund</span><b>{rupees(final)}</b></div>
      </div>
      {skipQc && (
        <>
          <label>Bina quality check ke refund kyun? (zaroori)</label>
          <input name="skip_note" required minLength={5} placeholder="jaise: parcel kho gaya, wapas nahi aaya" />
        </>
      )}
      <label htmlFor={`d${returnId}`}>Kuch kaatna hai (jaise return pickup fee, ₹)</label>
      <input id={`d${returnId}`} name="deduction" inputMode="numeric" value={ded} onChange={(e) => setDed(e.target.value.replace(/\D/g, ""))} placeholder="0" />
      {d > 0 && (<><label>Kyun kata? (zaroori)</label><input name="deduction_note" required minLength={3} placeholder="return pickup fee" /></>)}
      <p className="mut" style={{ margin: "6px 0" }}>Refund jayega: <b>{destText}</b></p>
      {needsRef && (<><label>UPI / bank mein bhejne ka reference (UTR) (zaroori)</label><input name="ref" required minLength={3} placeholder="UTR ya transaction ID" /></>)}
      {blocked ? <p className="err">{blocked}</p> : <button className="btn a s" style={{ minHeight: 44 }}>Refund karein aur credit note banayein</button>}
    </form>
  );
}
