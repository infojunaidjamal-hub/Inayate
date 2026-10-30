"use client";
import { useState } from "react";
import { deliveryBy } from "@/lib/delivery";

export default function DeliveryBox({ price, freeAbove, fee, returnDays }) {
  const [pin, setPin] = useState("");
  const [res, setRes] = useState(null);
  const check = () => setRes(/^[1-9]\d{5}$/.test(pin) ? { by: deliveryBy() } : { bad: true });
  return (
    <div className="pp-box">
      <h3>Delivery details</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="pp-in" placeholder="Pincode daalein" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && check()} style={{ margin: 0 }} />
        <button className="pp-btn" style={{ width: "auto", padding: "9px 20px" }} onClick={check}>Check</button>
      </div>
      {res?.by && <p style={{ margin: "8px 0 0" }}>🚚 <b>Delivery by {res.by}</b> · {price >= freeAbove ? "Free delivery" : `₹${fee} delivery`}<br />💵 Cash on Delivery available</p>}
      {res?.bad && <p style={{ margin: "8px 0 0", color: "#b8463c" }}>Sahi 6 digit pincode daalein</p>}
      <div className="pp-trust">
        <div><b>↩️</b>{returnDays}-Day Return</div><div><b>💵</b>Cash on Delivery</div><div><b>🛡️</b>Secure Payment</div><div><b>✅</b>Quality Checked</div>
      </div>
    </div>
  );
}
