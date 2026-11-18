"use client";
import { useActionState, useState } from "react";
import { staffLogin } from "./actions";

export default function Form() {
  const [s, action, busy] = useActionState(staffLogin, null);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [forgot, setForgot] = useState(false);
  return (
    <form action={action} autoComplete="on">
      {s?.error && <div className="st-err" role="alert">{s.error}</div>}
      {forgot && <div className="st-ok">Abhi password reset store ke Owner karte hain. Owner ko batayein, wo naya temporary password bhej denge.</div>}
      <label htmlFor="st-id">Email ya mobile</label>
      <input id="st-id" name="id" autoComplete="username" required autoFocus />
      <label htmlFor="st-pw">Password</label>
      <div className="st-pw">
        <input id="st-pw" name="password" type={show ? "text" : "password"} autoComplete="current-password" required
          onKeyUp={(e) => setCaps(e.getModifierState && e.getModifierState("CapsLock"))} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Password chhupayein" : "Password dikhayein"}>{show ? "🙈" : "👁"}</button>
      </div>
      {caps && <div className="st-warn">⚠ Caps Lock on hai</div>}
      <label className="st-chk"><input type="checkbox" name="remember" /> Is device par 30 din yaad rakhein</label>
      <button className="st-btn" disabled={busy}>{busy ? "Ruko..." : "Login"}</button>
      <p className="st-sm">
        <a href="#" onClick={(e) => { e.preventDefault(); setForgot(true); }}>Password bhool gaye?</a> · <a href="/">← Store par jayein</a>
      </p>
      <p className="st-sm st-mut">Staff account nahi hai? Store ke owner se sampark karein.</p>
    </form>
  );
}
