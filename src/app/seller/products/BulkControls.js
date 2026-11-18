"use client";
import { useEffect, useState } from "react";

// Products list ke upar: kitne chune hain, sab chunna, aur bulk buttons (form ke andar rehta hai)
export default function BulkControls({ formId }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const f = document.getElementById(formId);
    if (!f) return;
    const upd = () => setN(f.querySelectorAll('input[name="ids"]:checked').length);
    f.addEventListener("change", upd);
    upd();
    return () => f.removeEventListener("change", upd);
  }, [formId]);
  const toggleAll = (on) => {
    const f = document.getElementById(formId);
    f.querySelectorAll('input[name="ids"]').forEach((c) => { c.checked = on; });
    setN(on ? f.querySelectorAll('input[name="ids"]').length : 0);
  };
  const b = { padding: "5px 14px", border: "1px solid #fff", borderRadius: 16, background: "none", color: "#fff", font: "500 12px Poppins,sans-serif", cursor: "pointer" };
  return (
    <div className="pl-bulk" role="status" style={n ? { background: "#2a2623", color: "#fff" } : undefined}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
        <input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} style={{ width: "auto", margin: 0 }} aria-label="Select all products on this page" />
        {n ? <b>{n} selected</b> : "Select all"}
      </label>
      {n > 0 && (
        <>
          <button type="submit" name="intent" value="active" style={b}>Set Active</button>
          <button type="submit" name="intent" value="draft" style={b}>Set Draft</button>
          <button type="submit" name="intent" value="duplicate" style={b}>Duplicate (up to 20)</button>
        </>
      )}
    </div>
  );
}
