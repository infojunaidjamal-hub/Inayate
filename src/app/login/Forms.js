"use client";
import { useActionState } from "react";
import { buyerLogin, buyerRegister } from "./actions";
import { SITE } from "@/lib/site";

export default function Forms({ next = "" }) {
  const [lg, lgAction, lgBusy] = useActionState(buyerLogin, null);
  const [rg, rgAction, rgBusy] = useActionState(buyerRegister, null);
  return (
    <div className="two">
      <form action={lgAction} className="card pad">
        <h3>Login</h3>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="lm">Mobile number</label>
        <input id="lm" name="mobile" inputMode="numeric" maxLength={10} required />
        <label htmlFor="lp">Password</label>
        <input id="lp" name="password" type="password" required />
        {lg?.error && <p className="err">{lg.error}</p>}
        <button className="btn" disabled={lgBusy}>{lgBusy ? "Ruko..." : "Login"}</button>
        <p className="mut" style={{ fontSize: 12, marginBottom: 0 }}>Password bhool gaye? <a href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("Mera password reset karna hai. Mobile: ")}`} style={{ textDecoration: "underline" }}>WhatsApp par humse kahein</a>, hum naya password bhej denge.</p>
      </form>

      <form action={rgAction} className="card pad">
        <h3>Naya account banayein</h3>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="rn">Naam</label>
        <input id="rn" name="name" required />
        <label htmlFor="rm">Mobile number</label>
        <input id="rm" name="mobile" inputMode="numeric" maxLength={10} required />
        <label htmlFor="rp">Password (kam se kam 8 akshar)</label>
        <input id="rp" name="password" type="password" minLength={8} required />
        {rg?.error && <p className="err">{rg.error}</p>}
        <button className="btn a" disabled={rgBusy}>{rgBusy ? "Ruko..." : "Account banayein"}</button>
      </form>
    </div>
  );
}
