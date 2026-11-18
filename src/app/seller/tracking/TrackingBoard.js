"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { trackingRefresh, trackingSimulate } from "../logistics/actions";

const EV = [["picked", "Picked up"], ["transit", "In transit"], ["ofd", "Out for delivery"], ["delivered", "Delivered"], ["failed", "Delivery failed", true], ["rto_received", "RTO received", true]];
const REASONS = ["Customer not available", "Address incomplete", "Phone not reachable", "Refused", "Cash not ready (COD)", "Out of area"];
const cls = (s) => (s === "Delivered" ? "g" : ["NDR", "RTO"].includes(s) ? "x" : "y");

// rows: [{ no, id, partner, awb, status, promised, name }]  history: { [no]: [{ id, label, detail, at }] }
export default function TrackingBoard({ rows, history, refreshedAt }) {
  const router = useRouter();
  const [sel, setSel] = useState(rows[0]?.no || "");
  const [reason, setReason] = useState(REASONS[0]);
  const [r, refresh, rb] = useActionState(async (p, f) => { const x = await trackingRefresh(p, f); router.refresh(); return x; }, null);
  const [s, sim, sb] = useActionState(async (p, f) => { const x = await trackingSimulate(p, f); router.refresh(); return x; }, null);
  const cur = rows.find((x) => x.no === sel) || rows[0];
  const hist = (cur && history[cur.no]) || [];

  if (!rows.length) return <p className="mut">Abhi koi shipment transit mein nahi hai. Order ko Ready to ship karne ke liye order page par partner chuniye.</p>;
  return (
    <div className="two" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
      <div className="card pad">
        <form action={refresh} style={{ marginBottom: 8 }}>
          <button className="btn a s" disabled={rb}>Refresh all tracking</button>{" "}
          <span className="mut" style={{ fontSize: 12 }}>{r?.ok || `Last refreshed: ${refreshedAt || "-"}`}</span>
        </form>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead><tr><th>Order</th><th>Partner</th><th>Tracking ID</th><th>Status</th><th>Promised</th><th></th></tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.no} onClick={() => setSel(x.no)} style={{ cursor: "pointer", background: cur?.no === x.no ? "#f1e6d8" : undefined }}>
                  <td><b>{x.no}</b></td><td>{x.partner}</td><td>{x.awb}</td><td><span className={`tag ${cls(x.status)}`}>{x.status}</span></td><td>{x.promised || "-"}</td>
                  <td>
                    <form action={refresh}><input type="hidden" name="id" value={x.id} /><button className="btn o s" onClick={(e) => e.stopPropagation()}>Refresh</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card pad">
        <h3>Simulate courier event <span className="tag">localhost</span></h3>
        <p className="mut" style={{ fontSize: 13, marginTop: -4 }}>Internet par courier webhook aate hain. Localhost par yahan se event nakal karke flow dekhein. Selected: <b>{cur?.no}</b></p>
        <form action={sim}>
          <input type="hidden" name="order_no" value={cur?.no || ""} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
            {EV.map(([k, l, bad]) => <button key={k} name="event" value={k} className={`btn s ${bad ? "o" : "a"}`} disabled={sb}>{l}</button>)}
          </div>
          <label htmlFor="tr">Failure reason (Delivery failed ke liye)</label>
          <select id="tr" name="reason" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((x) => <option key={x}>{x}</option>)}</select>
        </form>
        {s?.error && <p className="err">{s.error}</p>}
        {s?.ok && <p className="ok">{s.ok}</p>}
        <h3 style={{ marginTop: 14 }}>History</h3>
        {hist.length === 0 && <p className="mut">Abhi koi event nahi.</p>}
        {hist.map((e) => <div className="row" key={e.id}><span>{e.label}{e.detail ? <span className="mut"> · {e.detail}</span> : null}</span><span className="mut">{e.at}</span></div>)}
      </div>
    </div>
  );
}
