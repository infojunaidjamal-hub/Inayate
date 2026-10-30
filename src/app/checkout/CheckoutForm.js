"use client";
import { useState, useActionState } from "react";
import { placeOrder } from "./actions";

export default function CheckoutForm({ addresses, total, userName }) {
  const def = addresses.find((a) => a.is_default) || addresses[0];
  const [choice, setChoice] = useState(def ? String(def.id) : "new");
  const [pay, setPay] = useState("online");
  const [state, action, busy] = useActionState(placeOrder, null);

  return (
    <form action={action}>
      <div className="card pad" style={{ marginBottom: 14 }}>
        <h3>Delivery Address</h3>
        {addresses.map((a) => (
          <label key={a.id} className="row" style={{ cursor: "pointer", color: "inherit", fontSize: 14 }}>
            <span>
              <input type="radio" name="address" value={a.id} checked={choice === String(a.id)} onChange={() => setChoice(String(a.id))} style={{ width: "auto", marginRight: 8 }} />
              <b>{a.label}</b>: {a.name}, {a.line}, {a.city}, {a.state} {a.pincode}
            </span>
          </label>
        ))}
        <label className="row" style={{ cursor: "pointer", color: "inherit", fontSize: 14 }}>
          <span>
            <input type="radio" name="address" value="new" checked={choice === "new"} onChange={() => setChoice("new")} style={{ width: "auto", marginRight: 8 }} />
            + Naya address
          </span>
        </label>
        {choice === "new" && (
          <div style={{ marginTop: 10 }}>
            <label htmlFor="an">Naam</label>
            <input id="an" name="name" defaultValue={userName} required />
            <label htmlFor="al">Ghar / society / area</label>
            <input id="al" name="line" required />
            <div className="three">
              <div><label htmlFor="ac">City</label><input id="ac" name="city" required /></div>
              <div><label htmlFor="as">State</label><input id="as" name="state" defaultValue="Gujarat" required /></div>
              <div><label htmlFor="ap">Pincode</label><input id="ap" name="pincode" inputMode="numeric" maxLength={6} required /></div>
            </div>
          </div>
        )}
      </div>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <h3>Payment</h3>
        <label className="row" style={{ cursor: "pointer", color: "inherit", fontSize: 14 }}>
          <span>
            <input type="radio" name="pay" value="online" checked={pay === "online"} onChange={() => setPay("online")} style={{ width: "auto", marginRight: 8 }} />
            💳 <b>Online Payment</b> (UPI / Card / Netbanking)
          </span>
        </label>
        <label className="row" style={{ cursor: "pointer", color: "inherit", fontSize: 14 }}>
          <span>
            <input type="radio" name="pay" value="cod" checked={pay === "cod"} onChange={() => setPay("cod")} style={{ width: "auto", marginRight: 8 }} />
            💵 <b>Cash on Delivery (COD)</b>: saman milne par payment karein
          </span>
        </label>
      </div>

      {state?.error && <p className="err">{state.error}</p>}
      <button className="btn a" style={{ width: "100%", padding: 13, fontSize: 15 }} disabled={busy}>
        {busy
          ? "Please wait..."
          : pay === "online"
          ? `Aage badhein, Payment karein · ₹${total.toLocaleString("en-IN")}`
          : `Place Order (COD) · ₹${total.toLocaleString("en-IN")}`}
      </button>
    </form>
  );
}
