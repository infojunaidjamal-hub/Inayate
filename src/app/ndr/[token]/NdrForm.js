"use client";
import { useActionState, useState } from "react";
import { ndrReply } from "./actions";

export default function NdrForm({ token, address, phone, dates }) {
  const [s, action, busy] = useActionState(ndrReply, null);
  const [same, setSame] = useState(true);
  return (
    <form action={action} className="fl-reasons">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="same" value={same ? "1" : "0"} />
      <div className="card pad" style={{ marginBottom: 12 }}>
        <b>1. Is this address correct?</b>
        <p className="mut" style={{ margin: "6px 0" }}>{address}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={`btn s ${same ? "a" : "o"}`} onClick={() => setSame(true)}>Yes, same address</button>
          <button type="button" className={`btn s ${!same ? "a" : "o"}`} onClick={() => setSame(false)}>Change address</button>
        </div>
        {!same && (
          <div>
            <label htmlFor="nl">New address</label><input id="nl" name="line" maxLength={200} />
            <label htmlFor="np">Pincode</label><input id="np" name="pin" inputMode="numeric" maxLength={6} />
          </div>
        )}
      </div>
      <div className="card pad" style={{ marginBottom: 12 }}>
        <b>2. When should we try again?</b>
        {dates.map((d, i) => <label key={d.v}><input type="radio" name="date" value={d.v} defaultChecked={i === 0} />{d.t}</label>)}
      </div>
      <div className="card pad" style={{ marginBottom: 12 }}>
        <b>3. Phone number to reach you</b>
        <input name="phone" inputMode="numeric" defaultValue={phone} maxLength={12} />
      </div>
      {s?.error && <p className="err">{s.error}</p>}
      <button className="btn a" disabled={busy}>{busy ? "Sending..." : "Send my reply"}</button>
    </form>
  );
}
