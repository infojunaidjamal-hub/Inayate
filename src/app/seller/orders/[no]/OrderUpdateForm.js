"use client";
import { useActionState } from "react";
import { updateOrder } from "../../actions";

export default function OrderUpdateForm({ orderNo, allowed, courier, awb }) {
  const [s, action, busy] = useActionState(updateOrder, null);
  return (
    <form action={action}>
      <input type="hidden" name="order_no" value={orderNo} />
      <label htmlFor="os">Status badlein</label>
      <select id="os" name="status" defaultValue="">
        <option value="">(status nahi badalna)</option>
        {allowed.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <div className="two">
        <div><label htmlFor="oc">Courier ka naam</label><input id="oc" name="courier" defaultValue={courier || ""} placeholder="jaise Delhivery, India Post" /></div>
        <div><label htmlFor="oa">Tracking ID (AWB)</label><input id="oa" name="awb" defaultValue={awb || ""} /></div>
      </div>
      <label htmlFor="on">Wajah / note (Cancelled aur NDR ke liye zaroori)</label>
      <input id="on" name="note" maxLength={200} placeholder="jaise: buyer ne phone nahi uthaya" />
      <p className="mut" style={{ fontSize: 12 }}>"Ready to ship" ke liye courier aur tracking ID zaroori hain. "Cancelled" karne par stock wapas jud jata hai.</p>
      {s?.error && <p className="err">{s.error}</p>}
      <button className="btn a" disabled={busy}>{busy ? "Ruko..." : "Update karein"}</button>
    </form>
  );
}
