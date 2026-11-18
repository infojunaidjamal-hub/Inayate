"use client";
import { useActionState, useState } from "react";
import { confirmSetup, finishSetup } from "./actions";

export default function SetupForm({ svg, secret, viaPre }) {
  const [s, action, busy] = useActionState(confirmSetup, null);
  const [msg, setMsg] = useState("");
  const pretty = secret.match(/.{1,4}/g).join(" ");
  const text = (s?.codes || []).join("\n");

  if (s?.ok) {
    return (
      <div>
        <div className="st-ok">Setup ho gaya! Ye <b>8 backup codes</b> abhi sambhal kar rakh lein. Phone kho jaye to inse login hoga (har code sirf ek baar chalta hai). Ye dobara nahi dikhenge.</div>
        <div className="st-codes">{s.codes.map((c) => <span key={c}>{c}</span>)}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="st-btn st-btn-o" onClick={async () => { try { await navigator.clipboard.writeText(text); setMsg("Copy ho gaya"); } catch { setMsg("Copy nahi hua, haath se likh lein"); } }}>Copy</button>
          <button type="button" className="st-btn st-btn-o" onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
            a.download = "backup-codes.txt"; a.click();
          }}>Download</button>
        </div>
        {msg && <p className="st-sm">{msg}</p>}
        <form action={finishSetup}><button className="st-btn">{viaPre ? "Dashboard par jayein" : "Theek hai, aage badhein"}</button></form>
      </div>
    );
  }
  return (
    <form action={action}>
      {s?.error && <div className="st-err" role="alert">{s.error}</div>}
      <div className="st-card">
        <b>1.</b> Phone mein <b>Google Authenticator</b> ya <b>Microsoft Authenticator</b> kholein aur &quot;+&quot; dabayein.<br />
        <b>2.</b> Ye QR code scan karein:
        <div className="st-qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="st-sm st-mut" style={{ textAlign: "center" }}>QR nahi chal raha? Ye key haath se daalein:<br /><b style={{ fontFamily: "monospace", letterSpacing: 1 }}>{pretty}</b></div>
        <label htmlFor="sc">3. App mein dikha 6 digit code daalein</label>
        <input id="sc" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required placeholder="123456" />
      </div>
      <button className="st-btn" disabled={busy}>{busy ? "Ruko..." : "Code check karein"}</button>
    </form>
  );
}
