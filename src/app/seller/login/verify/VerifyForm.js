"use client";
import { useActionState, useRef, useState } from "react";
import { verifyOtp, backToLogin } from "../actions";

export default function VerifyForm() {
  const [s, action, busy] = useActionState(verifyOtp, null);
  const [backup, setBackup] = useState(false);
  const boxes = useRef([]);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const setAt = (i, v) => setDigits((d) => d.map((x, k) => (k === i ? v : x)));
  const code = digits.join("");

  return (
    <form action={action}>
      {s?.error && <div className="st-err" role="alert">{s.error}</div>}
      {backup ? (
        <>
          <label htmlFor="bc">Backup code (jaise 7KQ2-M9XA)</label>
          <input id="bc" name="code" autoComplete="off" autoFocus required minLength={8} />
        </>
      ) : (
        <>
          <input type="hidden" name="code" value={code} />
          <div className="st-otp" onPaste={(e) => {
            const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
            if (!t) return;
            e.preventDefault();
            setDigits(Array.from({ length: 6 }, (_, i) => t[i] || ""));
            boxes.current[Math.min(t.length, 5)]?.focus();
          }}>
            {digits.map((d, i) => (
              <input key={i} ref={(el) => (boxes.current[i] = el)} value={d} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1} aria-label={`Digit ${i + 1}`} autoFocus={i === 0}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setAt(i, v); if (v && boxes.current[i + 1]) boxes.current[i + 1].focus(); }}
                onKeyDown={(e) => { if (e.key === "Backspace" && !d && boxes.current[i - 1]) boxes.current[i - 1].focus(); }} />
            ))}
          </div>
        </>
      )}
      <label className="st-chk"><input type="checkbox" name="trust" /> Is device par 30 din tak dobara na poochhein</label>
      <button className="st-btn" disabled={busy || (!backup && code.length < 6)}>{busy ? "Ruko..." : "Verify karein"}</button>
      <p className="st-sm">
        <a href="#" onClick={(e) => { e.preventDefault(); setBackup(!backup); }}>{backup ? "App ka code use karein" : "Phone nahi hai? Backup code use karein"}</a>
      </p>
      <p className="st-sm"><button type="submit" formAction={backToLogin} formNoValidate className="st-link">← Wapas login par</button></p>
    </form>
  );
}
