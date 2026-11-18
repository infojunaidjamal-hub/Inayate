"use client";
import { useActionState, useRef } from "react";
import { addCategory } from "./actions";

export default function AddCategory({ mains }) {
  const form = useRef(null);
  const [s, action, busy] = useActionState(async (prev, fd) => {
    const r = await addCategory(prev, fd);
    if (r?.ok) form.current?.reset();
    return r;
  }, null);
  return (
    <form action={action} ref={form} className="cg-card">
      <h3>Add category</h3>
      <label>Name<input name="name" defaultValue={s?.values?.name || ""} placeholder="e.g. Duffle Bags" required /></label>
      <label>Parent category
        <select name="parent" defaultValue={s?.values?.parent || ""}>
          <option value="">None (main category)</option>
          {mains.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label>Photo (shown on home page)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      {s?.error && <p className="err" role="alert">{s.error}</p>}
      {s?.ok && <p className="cg-ok" role="status">{s.ok}</p>}
      <button className="btn a" disabled={busy}>{busy ? "Adding..." : "Add category"}</button>
    </form>
  );
}
