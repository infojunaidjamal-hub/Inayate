"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { shipmentBook, pickedUp } from "../../logistics/actions";
import { chargedKg, rankPartners, ZONES, daysText } from "@/lib/shipMath";
import { inr } from "@/lib/money";

const REASONS = ["Pickup available today", "Buyer asked for faster delivery", "Partner had better success here", "Other"];

// partners: [{id,name,exp,codFee,noCod,flat,extraPct,ndr,rates}], served: { [id]: {zone,cod,prepaid} } | null (pincode list nahi)
export default function ShipPanel({ orderNo, status, cod, express, collected, partners, served, zoneGuess, parcel, shipment, pin }) {
  const [state, action, busy] = useActionState(shipmentBook, null);
  const [w, setW] = useState(String(shipment?.weight_g ?? parcel.weight_g));
  const [l, setL] = useState(String(shipment?.box_l ?? parcel.l));
  const [wd, setWd] = useState(String(shipment?.box_w ?? parcel.w));
  const [h, setH] = useState(String(shipment?.box_h ?? parcel.h));
  const [zone, setZone] = useState(shipment?.zone || zoneGuess);
  const [pick, setPick] = useState(shipment?.courier_id || 0);
  const [awb, setAwb] = useState(shipment?.awb || "");
  const [pickup, setPickup] = useState(shipment?.pickup_date || "");
  const [ovr, setOvr] = useState(shipment?.override_reason || REASONS[0]);

  const kg = chargedKg(w, l, wd, h);
  const { rows, rec } = useMemo(() => rankPartners({ partners, zone, kg, cod, express, served }), [partners, zone, kg, cod, express, served]);
  const chosenId = rows.find((r) => r.id === pick && r.ok) ? pick : rec || 0;
  const c = rows.find((r) => r.id === chosenId);
  const recRow = rows.find((r) => r.id === rec);
  const differs = rec && chosenId && chosenId !== rec;
  const col = express ? collected : 0;
  const booked = !!shipment;

  return (
    <div className="card pad" style={{ marginTop: 14 }}>
      <h3>Ship this order {booked && <span className="tag g">Shipment booked</span>}</h3>
      <p className="mut" style={{ marginTop: -6, fontSize: 13 }}>
        {cod ? "COD" : "Prepaid"} · {pin || "pincode?"} · {express ? "Buyer chose Express" : "Buyer chose Standard (free)"}
        {!served && " · Pincode list upload nahi hui, isliye zone khud chuniye."}
      </p>
      <form action={action}>
        <input type="hidden" name="order_no" value={orderNo} />
        <input type="hidden" name="courier_id" value={chosenId || ""} />
        <input type="hidden" name="zone" value={zone} />
        <input type="hidden" name="override" value={differs ? ovr : ""} />
        <div className="two">
          <div>
            <h4 style={{ margin: "0 0 6px" }}>Parcel {parcel.missing && <span className="mut" style={{ fontSize: 12 }}>(kuch products mein weight / box size nahi hai, check karein)</span>}</h4>
            <div className="three" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
              <div><label htmlFor="sw">Weight (g)</label><input id="sw" name="weight_g" inputMode="numeric" value={w} onChange={(e) => setW(e.target.value.replace(/\D/g, ""))} /></div>
              <div><label htmlFor="sl">Length (cm)</label><input id="sl" name="l" inputMode="numeric" value={l} onChange={(e) => setL(e.target.value.replace(/\D/g, ""))} /></div>
              <div><label htmlFor="sx">Width (cm)</label><input id="sx" name="w" inputMode="numeric" value={wd} onChange={(e) => setWd(e.target.value.replace(/\D/g, ""))} /></div>
              <div><label htmlFor="sh">Height (cm)</label><input id="sh" name="h" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, ""))} /></div>
            </div>
            <label>Charged weight</label>
            <input disabled value={`${kg.toFixed(1)} kg`} style={{ fontWeight: 700, maxWidth: 200 }} />
            <p className="mut" style={{ fontSize: 12, margin: "4px 0 0" }}>Higher of actual and volumetric weight (L × W × H ÷ 5000), rounded up to 500 g.</p>
            {!served && (
              <div style={{ marginTop: 8, maxWidth: 260 }}>
                <label htmlFor="sz">Zone</label>
                <select id="sz" value={zone} onChange={(e) => setZone(e.target.value)}>
                  {Object.entries(ZONES).map(([z, v]) => <option key={z} value={z}>{z} · {v[0]}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="card pad" style={{ background: "#f6efe6" }}>
            {recRow ? (
              <><b>Recommended: {recRow.name}</b><br />{express ? `Fastest express partner (${daysText({ dmin: recRow.dmin, dmax: recRow.dmax })} days)` : `Cheapest total (${inr(recRow.total)})`} · cost {inr(recRow.total)}
                <br /><span className="mut" style={{ fontSize: 12 }}>Rule: {express ? "Express = fastest, tie cheaper" : "Standard = lowest total cost within the delivery promise"}</span></>
            ) : <><b>No partner can ship this</b><br />Check pincode, weight or box size.</>}
          </div>
        </div>

        <h4 style={{ margin: "14px 0 6px" }}>Compare partners</h4>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead><tr><th></th><th>Partner</th><th>Freight</th><th>COD fee</th><th>Total cost</th><th>Days</th><th>Result</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ opacity: r.ok ? 1 : 0.5, cursor: r.ok ? "pointer" : "default" }} onClick={() => r.ok && setPick(r.id)}>
                  <td><input type="radio" aria-label={`Choose ${r.name}`} style={{ width: "auto" }} checked={r.id === chosenId} disabled={!r.ok} onChange={() => setPick(r.id)} /></td>
                  <td><b>{r.name}</b></td>
                  <td>{r.ok ? inr(r.fr) : "–"}</td><td>{r.ok ? inr(r.cod) : "–"}</td><td>{r.ok ? <b>{inr(r.total)}</b> : "–"}</td>
                  <td>{r.dmax ? daysText({ dmin: r.dmin, dmax: r.dmax }) : "–"}</td>
                  <td>{!r.ok ? <span className="tag x">{r.why}</span> : r.id === rec ? <span className="tag g">Recommended</span> : r.id === chosenId ? <span className="tag y">Your pick</span> : <span className="tag">OK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {differs && (
          <div className="card pad" style={{ background: "#fbeed0", marginTop: 8 }}>
            You picked a different partner than recommended. Reason (saved in order history):{" "}
            <select value={ovr} onChange={(e) => setOvr(e.target.value)} style={{ width: "auto", display: "inline-block" }}>{REASONS.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
        )}

        <div className="two" style={{ marginTop: 14 }}>
          <div>
            <h4 style={{ margin: "0 0 6px" }}>Shipment</h4>
            <label htmlFor="sa">Tracking ID (AWB)</label>
            <input id="sa" name="awb" value={awb} onChange={(e) => setAwb(e.target.value)} maxLength={40} />
            <label htmlFor="sp">Pickup date</label>
            <input id="sp" name="pickup" type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} />
            {state?.error && <p className="err">{state.error}</p>}
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn a" disabled={busy || !chosenId}>{busy ? "Ruko..." : booked ? "Update shipment" : "Save shipment (Ready to ship)"}</button>
              {booked && <Link className="btn o" href={`/seller/orders/${orderNo}/label`} target="_blank">Print label</Link>}
            </div>
          </div>
          <div>
            <h4 style={{ margin: "0 0 6px" }}>Cost saved for this order</h4>
            {c ? (
              <>
                <div className="row"><span>Freight</span><span>{inr(c.fr)}</span></div>
                <div className="row"><span>COD fee (you pay)</span><span>{inr(c.cod)}</span></div>
                <div className="row"><b>Your shipping cost</b><b>{inr(c.total)}</b></div>
                <div className="row"><span>Collected from buyer</span><span>{col ? `${inr(col)} (Express fee)` : "₹0 (Standard is free)"}</span></div>
                <div className="row"><b>Net</b><b>{c.total - col > 0 ? "−" : "+"}{inr(Math.abs(c.total - col))}</b></div>
              </>
            ) : <p className="mut">Partner chunne par dikhega.</p>}
            <p className="mut" style={{ fontSize: 12 }}>Order aur Excel export mein bhi dikhta hai.</p>
          </div>
        </div>
      </form>
      {status === "Ready to ship" && booked && (
        <form action={pickedUp} style={{ marginTop: 10 }}>
          <input type="hidden" name="order_no" value={orderNo} />
          <button className="btn a">Mark picked up</button>
        </form>
      )}
    </div>
  );
}
