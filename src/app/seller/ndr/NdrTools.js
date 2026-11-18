"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ndrAddress } from "../logistics/actions";

export default function NdrTools({ orderNo, wa, sms, tel, address, canReattempt, reattempt, next, max, done }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [s, action, busy] = useActionState(ndrAddress, null);
  const copy = () => { try { navigator.clipboard.writeText(sms); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <a className="btn o s" href={wa} target="_blank" rel="noreferrer">WhatsApp (opens chat)</a>
        <button type="button" className="btn o s" onClick={copy}>{copied ? "Copied" : "Copy SMS text"}</button>
        <a className="btn o s" href={`tel:${tel}`}>Call buyer</a>
        <button type="button" className="btn o s" onClick={() => setOpen((v) => !v)}>Change address</button>
        {canReattempt && <form action={reattempt}><input type="hidden" name="order_no" value={orderNo} /><button className="btn a s">Re-attempt (book attempt {next} of {max})</button></form>}
        {done && <Link className="btn o s" href="/seller/returns?tab=rto">View in Returns &gt; RTO →</Link>}
      </div>
      {open && (
        <form action={action} className="card pad" style={{ marginTop: 8 }}>
          <input type="hidden" name="order_no" value={orderNo} />
          <p className="mut" style={{ margin: 0, fontSize: 13 }}>Abhi: {address}</p>
          <label>Naya address (house, society, area, city)</label><input name="line" required minLength={5} />
          <label>Pincode</label><input name="pin" inputMode="numeric" maxLength={6} required style={{ maxWidth: 160 }} />
          {s?.error && <p className="err">{s.error}</p>}{s?.ok && <p className="ok">{s.ok}</p>}
          <button className="btn a s" disabled={busy} style={{ marginTop: 8 }}>Address save karein</button>
        </form>
      )}
    </div>
  );
}
