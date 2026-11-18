"use client";
import { useActionState, useState } from "react";
import { chooseRefund } from "@/app/account/return-actions";
import "@/components/returns.css";

// Return accept hone ke baad: refund kahan chahiye. options = [[code, label, hint]]
export default function RefundChoice({ orderNo, options, current, amountHint }) {
  const [s, action, busy] = useActionState(chooseRefund, null);
  const [dest, setDest] = useState(current || options[0]?.[0] || "");
  return (
    <form action={action} className="rf-choice">
      <input type="hidden" name="order_no" value={orderNo} />
      <p style={{ margin: "0 0 8px" }}><b>Refund kahan chahiye?</b>{amountHint ? <span className="mut"> {amountHint}</span> : null}</p>
      {options.map(([c, label, hint]) => (
        <label key={c} className={`rf-opt${dest === c ? " on" : ""}`}>
          <input type="radio" name="dest" value={c} checked={dest === c} onChange={() => setDest(c)} />
          <span><b>{label}</b><br /><span className="mut" style={{ fontSize: 12 }}>{hint}</span></span>
        </label>
      ))}
      {dest === "upi" && (
        <div><label htmlFor="rf-upi">UPI ID</label><input id="rf-upi" name="upi" placeholder="naam@upi" autoComplete="off" required /></div>
      )}
      {dest === "bank" && (
        <div>
          <label htmlFor="rf-h">Account holder ka naam</label><input id="rf-h" name="holder" required />
          <label htmlFor="rf-a">Account number</label><input id="rf-a" name="account" inputMode="numeric" required />
          <label htmlFor="rf-i">IFSC code</label><input id="rf-i" name="ifsc" placeholder="SBIN0001234" autoCapitalize="characters" required />
        </div>
      )}
      {s?.error && <p className="err" role="alert">{s.error}</p>}
      {s?.ok && <p className="ok" role="status">{s.ok}</p>}
      <button className="btn a" disabled={busy} style={{ minHeight: 44 }}>{busy ? "Ruko..." : current ? "Badlav save karein" : "Pakka karein"}</button>
    </form>
  );
}
