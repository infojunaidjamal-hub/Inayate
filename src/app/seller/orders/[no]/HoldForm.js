"use client";
import { useActionState } from "react";
import { holdDecision } from "../../actions";

// On Hold order: Verify ya Reject (reject ki wajah zaroori)
export default function HoldForm({ orderNo, canDecide }) {
  const [s, action, busy] = useActionState(holdDecision, null);
  if (!canDecide) return <p className="mut" style={{ margin: 0 }}>Verify / Reject sirf Owner ya Manager kar sakta hai.</p>;
  return (
    <form action={action}>
      <input type="hidden" name="order_no" value={orderNo} />
      <label htmlFor="hn">Note (Reject karne par wajah zaroori)</label>
      <input id="hn" name="note" placeholder="jaise: buyer ko call kiya, address theek hai" maxLength={200} />
      {s?.error && <p className="err">{s.error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn a" name="decision" value="verify" disabled={busy}>Verify (Confirm karein)</button>
        <button className="btn o" name="decision" value="reject" disabled={busy}>Reject (Cancel karein)</button>
      </div>
    </form>
  );
}
