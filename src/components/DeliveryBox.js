"use client";
import { useState, useTransition } from "react";
import { checkDelivery } from "@/app/delivery-actions";

export default function DeliveryBox({ productId, returnDays }) {
  const [pin, setPin] = useState("");
  const [res, setRes] = useState(null);
  const [busy, start] = useTransition();
  const check = () => {
    if (!/^[1-9]\d{5}$/.test(pin)) return setRes({ bad: true });
    start(async () => setRes(await checkDelivery(pin, productId)));
  };
  return (
    <div className="pp-box">
      <h3>Delivery details</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="pp-in" placeholder="Pincode daalein" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && check()} style={{ margin: 0 }} />
        <button className="pp-btn" style={{ width: "auto", padding: "9px 20px" }} onClick={check} disabled={busy}>{busy ? "..." : "Check"}</button>
      </div>
      {res?.deliverable && (
        <p style={{ margin: "8px 0 0" }}>
          🚚 <b>Standard: delivery by {res.standard.by}</b> · Free
          {res.express && <><br />⚡ <b>Express: delivery by {res.express.by}</b> · ₹{res.express.fee}</>}
          <br />{res.prepaidOnly ? "💳 Is pincode par sirf online payment" : "💵 Cash on Delivery available"}
        </p>
      )}
      {res?.deliverable === false && <p style={{ margin: "8px 0 0", color: "#b8463c" }}>Sorry, hum abhi is pincode par delivery nahi karte.</p>}
      {res?.bad && <p style={{ margin: "8px 0 0", color: "#b8463c" }}>Sahi 6 digit pincode daalein</p>}
      <div className="pp-trust">
        <div><b>↩️</b>{returnDays}-Day Return</div><div><b>💵</b>Cash on Delivery</div><div><b>🛡️</b>Secure Payment</div><div><b>✅</b>Quality Checked</div>
      </div>
    </div>
  );
}
