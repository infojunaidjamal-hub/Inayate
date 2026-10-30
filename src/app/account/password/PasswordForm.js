"use client";
import { useActionState } from "react";
import { changePassword } from "./actions";

export default function PasswordForm() {
  const [s, action, busy] = useActionState(changePassword, null);
  return (
    <form action={action} className="card pad" style={{ maxWidth: 420 }}>
      <label htmlFor="pc">Purana password</label>
      <input id="pc" name="current" type="password" required autoComplete="current-password" />
      <label htmlFor="pn">Naya password (kam se kam 8 akshar)</label>
      <input id="pn" name="new" type="password" minLength={8} required autoComplete="new-password" />
      <label htmlFor="pf">Naya password dobara</label>
      <input id="pf" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
      {s?.error && <p className="err">{s.error}</p>}
      {s?.ok && <p className="ok">{s.ok}</p>}
      <button className="btn a" disabled={busy}>{busy ? "Ruko..." : "Password badlein"}</button>
    </form>
  );
}
