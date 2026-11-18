"use client";
import { useActionState, useState, useTransition } from "react";
import { partnerSave, ratesSave, pincodesUpload, pincodeCheck } from "../logistics/actions";
import { ZONES } from "@/lib/shipMath";

export function AddPartner() {
  const [s, action, busy] = useActionState(partnerSave, null);
  return (
    <form action={action} className="card pad" style={{ marginBottom: 12 }}>
      <h3>Naya courier partner</h3>
      <div className="three">
        <div><label htmlFor="np-n">Naam</label><input id="np-n" name="name" required minLength={2} maxLength={60} /></div>
        <div><label htmlFor="np-c">COD fee (aap dete hain, ₹)</label><input id="np-c" name="cod_fee" inputMode="numeric" defaultValue="0" /></div>
        <div><label htmlFor="np-a">NDR attempts</label><input id="np-a" name="ndr_attempts" inputMode="numeric" defaultValue="3" /></div>
      </div>
      <label className="ck-check" style={{ display: "block" }}><input type="checkbox" name="no_cod" value="1" style={{ width: "auto" }} /> Ye partner COD nahi karta</label>
      <label className="ck-check" style={{ display: "block" }}><input type="checkbox" name="express" value="1" style={{ width: "auto" }} /> Express delivery deta hai</label>
      {s?.error && <p className="err">{s.error}</p>}
      {s?.ok && <p className="ok">Partner jud gaya. Ab Rate card tab mein rates bharein.</p>}
      <button className="btn a" disabled={busy}>{busy ? "Ruko..." : "Partner jodein"}</button>
    </form>
  );
}

// p: partner row (couriers), rates: { A: {first, extra, dmin, dmax} }
export function RateCard({ p, rates }) {
  const [s, action, busy] = useActionState(ratesSave, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="name" value={p.name} />
      <table style={{ width: "100%" }}>
        <thead><tr><th>Zone</th><th>Examples</th><th>{p.flat ? "Flat rate (up to 3 kg) ₹" : "First 500 g ₹"}</th><th>Each extra 500 g ₹</th><th>Days (min)</th><th>Days (max)</th></tr></thead>
        <tbody>
          {Object.entries(ZONES).map(([z, v]) => {
            const r = rates[z] || {};
            return (
              <tr key={z}>
                <td><b>{z}</b> {v[0]}</td><td className="mut">{v[1]}</td>
                <td><input name={`first_${z}`} inputMode="numeric" defaultValue={r.first ?? ""} placeholder="Not served" style={{ width: 90 }} /></td>
                <td><input name={`extra_${z}`} inputMode="numeric" defaultValue={p.flat ? "" : r.extra ?? ""} disabled={!!p.flat} style={{ width: 90 }} /></td>
                <td><input name={`dmin_${z}`} inputMode="numeric" defaultValue={r.dmin ?? ""} style={{ width: 70 }} /></td>
                <td><input name={`dmax_${z}`} inputMode="numeric" defaultValue={r.dmax ?? ""} style={{ width: 70 }} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mut" style={{ fontSize: 12 }}>Zone ka rate khali chhodne par wo zone &quot;Not served&quot; maana jayega.</p>
      <div className="three" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div><label>COD fee (you pay) ₹</label><input name="cod_fee" inputMode="numeric" defaultValue={p.cod_fee} /></div>
        <div><label>RTO (return) charge ₹ (extra)</label><input name="rto_charge" inputMode="numeric" defaultValue={p.rto_charge} /></div>
        <div><label>Extra charges (fuel etc.) %</label><input name="extra_pct" inputMode="decimal" defaultValue={p.extra_pct} /></div>
        <div><label>NDR attempts</label><input name="ndr_attempts" inputMode="numeric" defaultValue={p.ndr_attempts} /></div>
      </div>
      <p className="mut" style={{ fontSize: 12, margin: "4px 0" }}>Return freight (RTO) forward freight ke barabar maana jata hai. Volumetric divisor sab partners ke liye 5000.</p>
      <label className="ck-check" style={{ display: "block" }}><input type="checkbox" name="express" value="1" defaultChecked={!!p.express} style={{ width: "auto" }} /> Express available (₹199 wale orders)</label>
      <label className="ck-check" style={{ display: "block" }}><input type="checkbox" name="flat" value="1" defaultChecked={!!p.flat} style={{ width: "auto" }} /> Flat rate (3 kg tak)</label>
      <label className="ck-check" style={{ display: "block" }}><input type="checkbox" name="no_cod" value="1" defaultChecked={!!p.no_cod} style={{ width: "auto" }} /> COD nahi karta</label>
      {s?.error && <p className="err">{s.error}</p>}
      {s?.ok && <p className="ok">{s.ok}</p>}
      <div style={{ marginTop: 12 }}><button className="btn a" disabled={busy}>{busy ? "Ruko..." : "Save rate card"}</button></div>
    </form>
  );
}

export function PincodeUpload({ id }) {
  const [s, action, busy] = useActionState(pincodesUpload, null);
  return (
    <form action={action} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="id" value={id} />
      <input type="file" name="file" accept=".xlsx,.csv" style={{ width: "auto" }} />
      <button className="btn a s" disabled={busy}>{busy ? "Ruko..." : "Upload Excel"}</button>
      {s?.error && <span className="err">{s.error}</span>}
      {s?.ok && <span className="ok">{s.ok}</span>}
    </form>
  );
}

export function PincodeCheck({ id }) {
  const [pin, setPin] = useState("");
  const [r, setR] = useState(null);
  const [busy, start] = useTransition();
  const go = () => start(async () => setR(await pincodeCheck(id, pin)));
  return (
    <div>
      <label>Check a pincode</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={pin} inputMode="numeric" maxLength={6} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), go())} style={{ margin: 0 }} />
        <button type="button" className="btn o" onClick={go} disabled={busy}>Check</button>
      </div>
      {r && <p className={r.ok ? "ok" : "err"} style={{ marginTop: 8 }}>{r.ok || r.bad}</p>}
    </div>
  );
}
