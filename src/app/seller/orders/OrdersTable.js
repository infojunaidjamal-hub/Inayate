"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkAdvance } from "./bulk";

// rows: [{ no, date, name, mobile, items, method, payStatus, status, cls, total, can: ["Confirmed", ...] }]
export default function OrdersTable({ rows }) {
  const router = useRouter();
  const [sel, setSel] = useState(() => new Set());
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();

  const chosen = rows.filter((r) => sel.has(r.no));
  const allOn = rows.length > 0 && chosen.length === rows.length;
  const can = (to) => chosen.filter((r) => r.can.includes(to)).length;

  const toggle = (no) => setSel((s) => { const n = new Set(s); if (n.has(no)) n.delete(no); else n.add(no); return n; });
  const toggleAll = () => setSel(allOn ? new Set() : new Set(rows.map((r) => r.no)));
  const go = (to) => start(async () => {
    const r = await bulkAdvance(chosen.map((x) => x.no), to);
    setMsg(r);
    setSel(new Set());
    router.refresh();
  });
  const print = () => window.open(`/seller/orders/print?nos=${encodeURIComponent(chosen.slice(0, 50).map((r) => r.no).join(","))}`, "_blank");

  return (
    <>
      {msg && (
        <div className={"od-msg" + (msg.error ? " err" : "")} role="status">
          {msg.error ? msg.error : <>{msg.done} order <b>{msg.to}</b> ho gaye.{msg.skipped.length > 0 && <> {msg.skipped.length} chhod diye: {msg.skipped.map((s) => `${s.no} (${s.reason})`).join(", ")}</>}</>}
        </div>
      )}
      {chosen.length > 0 && (
        <div className="od-bulk">
          <span><b>{chosen.length}</b> order chune hain</span>
          <button type="button" disabled={pending || !can("Confirmed")} onClick={() => go("Confirmed")}>Confirmed karein ({can("Confirmed")})</button>
          <button type="button" disabled={pending || !can("Packed")} onClick={() => go("Packed")}>Packed karein ({can("Packed")})</button>
          <button type="button" onClick={print}>Packing slip print karein</button>
          <button type="button" className="x" onClick={() => setSel(new Set())}>Chunav hatayein</button>
        </div>
      )}
      <div className="od-tw">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Is page ke sab orders chunein" /></th>
              <th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.no} className={sel.has(r.no) ? "sel" : ""}>
                <td><input type="checkbox" checked={sel.has(r.no)} onChange={() => toggle(r.no)} aria-label={`${r.no} chunein`} /></td>
                <td><Link href={`/seller/orders/${r.no}`}><b>{r.no}</b></Link></td>
                <td>{r.date}</td>
                <td>{r.name}<div className="mut">{r.mobile}</div></td>
                <td className="od-items">{r.items}</td>
                <td>{r.method}<div><span className="tag y">{r.payStatus}</span></div></td>
                <td><span className={`tag ${r.cls}`}>{r.status}</span></td>
                <td><b>{r.total}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
