"use client";
import { useActionState } from "react";
import { notifyMe } from "@/app/products/notify";

// "Notify me when back": stock zero wale product ke page par
export default function NotifyForm({ id, defaultContact = "", already = false }) {
  const [s, action, busy] = useActionState(notifyMe, null);
  return (
    <form action={action} id="notify" className="pp-box" style={{ scrollMarginTop: 90 }}>
      <b>Notify me when back</b>
      {already && !s ? (
        <p className="pp-mut" style={{ margin: "6px 0 0" }}>&#10003; Aapki request saved hai. Wapas aate hi hum batayenge.</p>
      ) : (
        <>
          <p className="pp-mut" style={{ margin: "6px 0 10px" }}>Mobile number ya email daalein. Product wapas aate hi hum aapko batayenge.</p>
          <label htmlFor="nf-c" className="pp-mut" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Mobile ya email</label>
          <input type="hidden" name="id" value={id} />
          <input id="nf-c" name="contact" defaultValue={defaultContact} autoComplete="tel" style={{ marginBottom: 10 }} aria-describedby={s?.error ? "nf-err" : undefined} />
          <button className="pp-btn" disabled={busy} style={{ minHeight: 44 }}>{busy ? "Ruko..." : "Notify me"}</button>
        </>
      )}
      {s?.error && <p id="nf-err" role="alert" style={{ color: "#b8463c", fontSize: 13, margin: "8px 0 0" }}>{s.error}</p>}
      {s?.ok && <p role="status" style={{ color: "#1f6b3a", fontSize: 13, margin: "8px 0 0" }}>{s.ok}</p>}
    </form>
  );
}
