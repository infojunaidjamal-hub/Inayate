"use client";
import { useActionState } from "react";
import { sellerRegister } from "./actions";

export default function RegisterForm() {
  const [s, action, busy] = useActionState(sellerRegister, null);
  return (
    <form action={action} className="card pad" style={{ maxWidth: 420 }}>
      <label htmlFor="rn">Naam</label>
      <input id="rn" name="name" required />
      <label htmlFor="re">Email</label>
      <input id="re" name="email" type="email" required />
      <label htmlFor="rm">Mobile number</label>
      <input id="rm" name="mobile" inputMode="numeric" maxLength={10} required />
      <label htmlFor="rp">Password (kam se kam 8 akshar)</label>
      <input id="rp" name="password" type="password" minLength={8} required />
      <label htmlFor="rc">Seller code</label>
      <input id="rc" name="code" type="password" required />
      {s?.error && <p className="err">{s.error}</p>}
      <button className="btn a" disabled={busy}>{busy ? "Ruko..." : "Register karein"}</button>
    </form>
  );
}
