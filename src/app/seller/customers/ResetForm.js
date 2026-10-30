"use client";
import { useActionState } from "react";
import { resetCustomerPassword } from "../actions";

export default function ResetForm({ id, mobile }) {
  const [s, action, busy] = useActionState(resetCustomerPassword, null);
  return (
    <form
      action={action}
      onSubmit={(e) => { if (!window.confirm("Is customer ka password badal kar naya temporary password banega. Pakka?")) e.preventDefault(); }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn o s" disabled={busy}>{busy ? "Ruko..." : "Password reset"}</button>
      {s?.error && <p className="err" style={{ margin: "6px 0 0" }}>{s.error}</p>}
      {s?.password && (
        <p className="ok" style={{ margin: "6px 0 0" }}>
          Naya password: <b>{s.password}</b><br />
          <a href={`https://wa.me/91${mobile}?text=${encodeURIComponent("Aapka naya temporary password: " + s.password + "\nLogin ke baad Account > Password badlein se apna password badal lein.")}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>WhatsApp par bhejein</a>
          <br /><small>Ye sirf ek baar dikhega.</small>
        </p>
      )}
    </form>
  );
}
