"use client";
import { useActionState } from "react";
import { addAddress } from "../actions";

export default function AddressForm() {
  const [s, action, busy] = useActionState(addAddress, null);
  const v = s?.values || {};
  return (
    <form action={action} className="card pad">
      <h3>Naya address jodein</h3>
      <div className="two">
        <div><label htmlFor="a1">Naam</label><input id="a1" name="name" defaultValue={v.name} required /></div>
        <div><label htmlFor="a2">Label (Home / Office)</label><input id="a2" name="label" defaultValue={v.label || "Home"} /></div>
      </div>
      <label htmlFor="a3">Ghar / society / area</label>
      <input id="a3" name="line" defaultValue={v.line} required />
      <div className="three">
        <div><label htmlFor="a4">City</label><input id="a4" name="city" defaultValue={v.city} required /></div>
        <div><label htmlFor="a5">State</label><input id="a5" name="state" defaultValue={v.state || "Gujarat"} required /></div>
        <div><label htmlFor="a6">Pincode</label><input id="a6" name="pincode" inputMode="numeric" maxLength={6} defaultValue={v.pincode} required /></div>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" name="makeDefault" style={{ width: "auto" }} defaultChecked={v.makeDefault} /> Ise default address banayein
      </label>
      {s?.error && <p className="err">{s.error}</p>}
      {s?.ok && <p style={{ color: "#3b7a4a" }}>{s.ok}</p>}
      <button className="btn" disabled={busy}>{busy ? "Ruko..." : "Address save karein"}</button>
    </form>
  );
}
