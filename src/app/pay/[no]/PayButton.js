"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createRazorpayOrder, verifyPayment } from "../actions";
import { SITE } from "@/lib/site";

export default function PayButton({ orderNo, name, mobile, email }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function pay() {
    setMsg("");
    setBusy(true);
    try {
      if (!window.Razorpay) {
        setMsg("Payment window load nahi hui. Internet check karke page refresh karein.");
        setBusy(false);
        return;
      }
      const r = await createRazorpayOrder(orderNo);
      if (r.error) {
        setMsg(r.error);
        setBusy(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: r.keyId,
        amount: r.amount,
        currency: "INR",
        name: SITE.name,
        description: "Order " + orderNo,
        order_id: r.rzpOrderId,
        prefill: { name, contact: mobile || undefined, email: email || undefined },
        theme: { color: "#b5651d" },
        handler: async (resp) => {
          const v = await verifyPayment(orderNo, resp);
          if (v.error) {
            setMsg(v.error);
            setBusy(false);
            return;
          }
          router.push(`/order/${orderNo}?placed=1`);
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMsg("Payment poora nahi hua. Aap dobara try kar sakte hain.");
          },
        },
      });
      rzp.on("payment.failed", (e) => {
        try { navigator.sendBeacon("/api/track", new Blob([JSON.stringify({ events: [{ type: "payment_failed", order: orderNo }] })], { type: "application/json" })); } catch {}
        setMsg("Payment fail hua: " + (e?.error?.description || "dobara try karein"));
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setMsg("Kuch gadbad hui. Dobara try karein.");
      setBusy(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      {msg && <p className="err">{msg}</p>}
      <button className="btn a" style={{ width: "100%", padding: 13, fontSize: 15 }} onClick={pay} disabled={busy}>
        {busy ? "Please wait..." : "💳 Ab Pay karein"}
      </button>
    </>
  );
}
