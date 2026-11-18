"use client";
import { useActionState } from "react";
import { changePassword, disableOtp, newBackupCodes } from "./actions";

export function PasswordForm() {
  const [s, action, busy] = useActionState(changePassword, null);
  return (
    <form action={action} className="card pad" style={{ maxWidth: 440 }}>
      <label htmlFor="sp1">Abhi ka password</label>
      <input id="sp1" name="current" type="password" required autoComplete="current-password" />
      <label htmlFor="sp2">Naya password (kam se kam 8 akshar)</label>
      <input id="sp2" name="new" type="password" required minLength={8} autoComplete="new-password" />
      <label htmlFor="sp3">Naya password dobara</label>
      <input id="sp3" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      {s?.error && <p className="err">{s.error}</p>}
      {s?.ok && <p className="ok">{s.ok}</p>}
      <button className="btn a" disabled={busy}>{busy ? "Ruko..." : "Password badlein"}</button>
    </form>
  );
}

export function OtpActions({ canDisable }) {
  const [d, disable, dBusy] = useActionState(disableOtp, null);
  const [n, regen, nBusy] = useActionState(newBackupCodes, null);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form action={regen} className="card pad" style={{ maxWidth: 440 }}>
        <b>Naye backup codes</b>
        <p className="mut" style={{ margin: "4px 0 0", fontSize: 13 }}>Purane saare backup codes band ho jayenge.</p>
        <label htmlFor="bp">Apna password</label>
        <input id="bp" name="password" type="password" required autoComplete="current-password" />
        {n?.error && <p className="err">{n.error}</p>}
        {n?.ok && <><p className="ok">{n.ok}</p><div className="st-codes">{n.codes.map((c) => <span key={c}>{c}</span>)}</div><p className="mut" style={{ fontSize: 12 }}>Ye abhi hi sambhal lein, dobara nahi dikhenge.</p></>}
        <button className="btn o" disabled={nBusy}>{nBusy ? "Ruko..." : "Naye codes banayein"}</button>
      </form>
      {canDisable && (
        <form action={disable} className="card pad" style={{ maxWidth: 440 }}
          onSubmit={(e) => { if (!window.confirm("OTP band karna hai? Login sirf password se hoga.")) e.preventDefault(); }}>
          <b>OTP band karein</b>
          <label htmlFor="dp">Apna password</label>
          <input id="dp" name="password" type="password" required autoComplete="current-password" />
          {d?.error && <p className="err">{d.error}</p>}
          {d?.ok && <p className="ok">{d.ok}</p>}
          <button className="btn o" disabled={dBusy}>OTP band karein</button>
        </form>
      )}
    </div>
  );
}
