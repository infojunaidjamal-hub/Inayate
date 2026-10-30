"use client";
import { useActionState } from "react";
import { submitReview } from "@/app/account/actions";

export default function ReviewForm({ productId }) {
  const [s, action, busy] = useActionState(submitReview, null);
  return (
    <form action={action} className="card pad" style={{ marginBottom: 14 }}>
      <h3>Apna review likhein</h3>
      <input type="hidden" name="product_id" value={productId} />
      <label htmlFor="rv1">Rating</label>
      <select id="rv1" name="rating" defaultValue="5">
        <option value="5">★★★★★ (5)</option><option value="4">★★★★ (4)</option><option value="3">★★★ (3)</option>
        <option value="2">★★ (2)</option><option value="1">★ (1)</option>
      </select>
      <label htmlFor="rv2">Title</label>
      <input id="rv2" name="title" required />
      <label htmlFor="rv3">Review</label>
      <textarea id="rv3" name="body" rows={3} required />
      {s?.error && <p className="err">{s.error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Ruko..." : "Review bhejein"}</button>
    </form>
  );
}
