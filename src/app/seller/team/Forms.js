"use client";
import { useActionState, useState } from "react";
import { addStaff, resetStaffPassword } from "./actions";
import { waTo } from "@/lib/whatsapp";

const wa = (mobile, name, pw) => mobile
  ? waTo(mobile, `Namaste ${name}, aapka Store Admin ka temporary password: ${pw}\nPehli baar login karne par naya password rakhna hoga.`) : "";

function Temp({ s }) {
  if (!s?.password) return null;
  const link = wa(s.mobile, s.name, s.password);
  return (
    <div className="ok">
      <b>{s.name}</b> ka temporary password: <b style={{ fontFamily: "monospace", fontSize: 15 }}>{s.password}</b><br />
      Ye sirf ek baar dikhega. Pehle login par staff ko naya password rakhna hoga.
      {link && <> <a href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>WhatsApp par bhejein</a></>}
    </div>
  );
}

export function AddStaff() {
  const [open, setOpen] = useState(false);
  const [s, action, busy] = useActionState(addStaff, null);
  return (
    <div style={{ marginBottom: 14 }}>
      <button className="btn o s" onClick={() => setOpen(!open)}>{open ? "Band karein" : "+ Staff jodein"}</button>
      {open && (
        <form action={action} className="card pad" style={{ marginTop: 10 }}>
          <div className="st-row">
            <div><label>Naam</label><input name="name" required minLength={2} /></div>
            <div><label>Email (login ke liye)</label><input name="email" type="email" /></div>
            <div><label>Mobile (login ke liye)</label><input name="mobile" inputMode="numeric" maxLength={10} /></div>
            <div><label>Role</label><select name="role"><option value="manager">Manager</option><option value="operator">Operator</option></select></div>
          </div>
          {s?.error && <p className="err">{s.error}</p>}
          <Temp s={s} />
          <button className="btn a" disabled={busy} style={{ marginTop: 10 }}>{busy ? "Ruko..." : "Account banayein"}</button>
        </form>
      )}
    </div>
  );
}

export function ResetPw({ id }) {
  const [s, action, busy] = useActionState(resetStaffPassword, null);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Naya temporary password banega. Pakka?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="st-mini" disabled={busy}>Password reset</button>
      {s?.error && <p className="err">{s.error}</p>}
      <Temp s={s} />
    </form>
  );
}
