"use client";
import { useActionState } from "react";
import { sellerLogin } from "./actions";

export default function Form() {
  const [s, action, busy] = useActionState(sellerLogin, null);
  return (
    <form action={action} className="card pad" style={{ maxWidth: 420 }}>
      <label htmlFor="se">Email</label>
      <input id="se" name="email" type="email" required />
      <label htmlFor="sp">Password</label>
      <input id="sp" name="password" type="password" required />
      {s?.error && <p className="err">{s.error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Ruko..." : "Seller Login"}</button>
    </form>
  );
}
