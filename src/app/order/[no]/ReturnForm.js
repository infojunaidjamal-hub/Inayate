"use client";
import { useActionState } from "react";
import { requestReturn } from "@/app/account/actions";

export default function ReturnForm({ orderNo }) {
  const [s, action, busy] = useActionState(requestReturn, null);
  return (
    <form action={action}>
      <input type="hidden" name="order_no" value={orderNo} />
      <label htmlFor="rr">Return ki wajah</label>
      <textarea id="rr" name="reason" rows={3} required placeholder="Jaise: colour alag hai, size chhota hai, damaged mila..." />
      {s?.error && <p className="err">{s.error}</p>}
      <button className="btn a" disabled={busy}>{busy ? "Ruko..." : "Return request bhejein"}</button>
    </form>
  );
}
