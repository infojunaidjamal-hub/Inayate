"use client";
import { useActionState, useEffect, useState } from "react";
import { saveName, startContactChange, confirmContactChange } from "./actions";

function NameForm({ name }) {
  const [s, action, busy] = useActionState(saveName, null);
  const [v, setV] = useState(name);
  return (
    <form action={action} style={{ marginBottom: 6 }}>
      <label htmlFor="pf1">Poora naam</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input id="pf1" name="name" value={v} onChange={(e) => setV(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" style={{ flex: "1 1 220px", margin: 0 }} />
        <button className="btn a s" style={{ minHeight: 44 }} disabled={busy || v.trim() === name.trim()}>{busy ? "Ruko..." : "Naam save karein"}</button>
      </div>
      <p className="mut" style={{ fontSize: 12, margin: "6px 0 0" }}>Naam aur photo badalne ke liye password ya code nahi chahiye.</p>
      {s?.error && <p className="err" role="alert" style={{ margin: "6px 0 0" }}>{s.error}</p>}
      {s?.ok && <p className="ok" role="status" style={{ margin: "6px 0 0" }}>{s.ok}</p>}
    </form>
  );
}

// Ek contact (mobile ya email): Change dabane par naya value + code
function ContactInner({ kind, label, value, onClose, onDone }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const [s1, a1, b1] = useActionState(startContactChange, null);
  const [s2, a2, b2] = useActionState(confirmContactChange, null);
  const verifying = s1?.step === "verify" && !s2?.done;
  useEffect(() => { if (s2?.done) onDone(s2.ok); }, [s2]); // eslint-disable-line react-hooks/exhaustive-deps
  const isMobile = kind === "mobile";

  if (!open) {
    return (
      <div className="ac-ct">
        <div><div className="mut" style={{ fontSize: 12 }}>{label}</div><b>{value || "Abhi nahi diya"}</b></div>
        <button type="button" className="btn o s" onClick={() => setOpen(true)}>{value ? "Change" : "Add"}</button>
      </div>
    );
  }
  return (
    <div className="ac-ct" style={{ display: "block" }}>
      <div className="mut" style={{ fontSize: 12 }}>{label}</div>
      {!verifying ? (
        <form action={a1}>
          <input type="hidden" name="kind" value={kind} />
          <label htmlFor={`nv-${kind}`}>{isMobile ? "Naya mobile number" : "Naya email"}</label>
          <input id={`nv-${kind}`} name="value" value={v} onChange={(e) => setV(e.target.value)} type={isMobile ? "tel" : "email"} inputMode={isMobile ? "numeric" : "email"} autoComplete={isMobile ? "tel" : "email"} required style={{ margin: 0 }} />
          {s1?.error && <p className="err" role="alert" style={{ margin: "6px 0 0" }}>{s1.error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn a s" style={{ minHeight: 44 }} disabled={b1}>{b1 ? "Ruko..." : "Code bhejein"}</button>
            <button type="button" className="btn o s" style={{ minHeight: 44 }} onClick={onClose}>Cancel</button>
          </div>
          <p className="mut" style={{ fontSize: 12, margin: "8px 0 0" }}>Pehle naye {isMobile ? "number" : "email"} par ek 6 digit ka code aayega. Code daalne tak purana {isMobile ? "number" : "email"} hi rahega.</p>
        </form>
      ) : (
        <div>
          <p style={{ margin: "6px 0" }}>Code <b>{s1.target}</b> par bheja gaya hai. 10 minute tak chalega.</p>
          {s1.devCode && <div className="vf-test" role="status">TEST MODE: aapka code <b>{s1.devCode}</b><br />Asli SMS ya email abhi chalu nahi hai, isliye code yahan dikh raha hai.</div>}
          <form action={a2}>
            <input type="hidden" name="kind" value={kind} />
            <label htmlFor={`cd-${kind}`}>6 digit ka code</label>
            <input id={`cd-${kind}`} name="code" className="vf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" required autoFocus style={{ margin: 0 }} />
            {s2?.error && <p className="err" role="alert" style={{ margin: "6px 0 0" }}>{s2.error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button className="btn a s" style={{ minHeight: 44 }} disabled={b2}>{b2 ? "Ruko..." : "Verify karke badlein"}</button>
              <button type="button" className="btn o s" style={{ minHeight: 44 }} onClick={onClose}>Cancel</button>
            </div>
          </form>
          <form action={a1} style={{ marginTop: 8 }}>
            <input type="hidden" name="kind" value={kind} /><input type="hidden" name="value" value={s1.target} />
            <button className="btn o s" style={{ minHeight: 44 }} disabled={b1}>Naya code bhejein</button>
            {s1?.error && <span className="err" role="alert" style={{ marginLeft: 8 }}>{s1.error}</span>}
          </form>
        </div>
      )}
    </div>
  );
}

function Contact(props) {
  const [nonce, setNonce] = useState(0); // band karne par form saaf ho jaye
  const [msg, setMsg] = useState("");
  return (
    <>
      <ContactInner key={nonce} {...props} onClose={() => setNonce((n) => n + 1)} onDone={(m) => { setMsg(m); setNonce((n) => n + 1); }} />
      {msg && <p className="ok" role="status" style={{ margin: "0 0 6px" }}>{msg}</p>}
    </>
  );
}

export default function DetailsForm({ user }) {
  return (
    <div className="card pad">
      <h3 style={{ marginTop: 0 }}>Meri jaankari</h3>
      <NameForm name={user.name} />
      <Contact kind="mobile" label="Mobile (yahi login ID hai)" value={user.mobile} />
      <Contact kind="email" label="Email" value={user.email} />
      <p className="mut" style={{ fontSize: 12, margin: "6px 0 0" }}>Mobile ya email badalne par hi verification code poochha jata hai.</p>
    </div>
  );
}
