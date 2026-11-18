"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { advanceOrders } from "./actions";

const SYM = { ok: "●", soon: "▲", late: "■" };

// rows: [{ no, name, thumb, product, more, qty, method, payStatus, detail, sla:{tone,label}|null, blocked }]
// bulkLabel: bulk button ka naam (jaise "Mark packed"), null ho to checkbox / bulk nahi
export default function ProcessTable({ rows, bulkLabel, tab }) {
  const router = useRouter();
  const [sel, setSel] = useState(() => new Set());
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const pickable = rows.filter((r) => !r.blocked);
  const chosen = rows.filter((r) => sel.has(r.no));
  const allOn = pickable.length > 0 && pickable.every((r) => sel.has(r.no));

  const toggle = (no) => setSel((s) => { const n = new Set(s); if (n.has(no)) n.delete(no); else n.add(no); return n; });
  const toggleAll = () => setSel(allOn ? new Set() : new Set(pickable.map((r) => r.no)));
  const go = () => start(async () => {
    const r = await advanceOrders(chosen.map((x) => x.no));
    setMsg(r); setSel(new Set()); router.refresh();
  });

  return (
    <div data-tab={tab}>
      {msg && (
        <div className={"od-msg" + (msg.error ? " err" : "")} role="status">
          {msg.error ? msg.error : <>{msg.done} order aage badh gaye.{msg.skipped.length > 0 && <> {msg.skipped.length} chhod diye: {msg.skipped.map((s) => `${s.no} (${s.reason})`).join(", ")}</>}</>}
        </div>
      )}
      {bulkLabel && chosen.length > 0 && (
        <div className="od-bulk">
          <span><b>{chosen.length}</b> order chune hain</span>
          <button type="button" disabled={pending} onClick={go}>{bulkLabel} ({chosen.length})</button>
          <button type="button" className="x" onClick={() => setSel(new Set())}>Clear selection</button>
        </div>
      )}
      <div className="od-tw">
        <table>
          <thead>
            <tr>
              {bulkLabel && <th><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Sab chunein" /></th>}
              <th>Product</th><th>Buyer</th><th>Qty</th><th>Payment</th><th>Details</th><th>Timer</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.no} className={sel.has(r.no) ? "sel" : ""}>
                {bulkLabel && <td>{r.blocked ? null : <input type="checkbox" checked={sel.has(r.no)} onChange={() => toggle(r.no)} aria-label={`${r.no} chunein`} />}</td>}
                <td>
                  <div className="pr-prod">
                    {r.thumb ? <img src={r.thumb} alt="" width="44" height="44" /> : <span className="pr-ph" aria-hidden="true" />}
                    <div>
                      <Link href={`/seller/orders/${r.no}`}><b>{r.product}</b></Link>{r.more > 0 && <span className="mut"> +{r.more} more</span>}
                      <div className="mut">Order ID: {r.no}</div>
                    </div>
                  </div>
                </td>
                <td>{r.name}</td>
                <td>{r.qty}</td>
                <td>{r.method}<div><span className="tag y">{r.payStatus}</span></div></td>
                <td className="od-items">{r.detail}</td>
                <td>{r.sla ? <span className={`pr-sla ${r.sla.tone}`}>{SYM[r.sla.tone]} {r.sla.label}</span> : <span className="mut">-</span>}</td>
                <td><Link className="btn o s" href={`/seller/orders/${r.no}`}>{r.action}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
