"use client";
import { useActionState, useState } from "react";
import { requestReturn } from "@/app/account/return-actions";
import { RETURN_REASONS } from "@/lib/format";
import "@/components/returns.css";

const MAX = 5 * 1024 * 1024;
const rupees = (n) => "₹" + Number(n).toLocaleString("en-IN");

function Slot({ n, onBad }) {
  const [url, setUrl] = useState("");
  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setUrl("");
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > MAX) { e.target.value = ""; setUrl(""); return onBad("Sirf JPG, PNG ya WEBP, 5 MB tak."); }
    onBad("");
    setUrl(URL.createObjectURL(f));
  };
  return (
    <label className="rf-slot">
      {url ? <img src={url} alt={`Photo ${n}`} /> : <span>+ Photo {n}</span>}
      <input type="file" name={`photo${n}`} accept="image/jpeg,image/png,image/webp" onChange={pick} />
    </label>
  );
}

// items: [{ id, name, variant_label, qty, price, image }]  (order ke items)
export default function ReturnForm({ orderNo, items = [] }) {
  const [s, action, busy] = useActionState(requestReturn, null);
  const [code, setCode] = useState("");
  const [bad, setBad] = useState("");
  const [qty, setQty] = useState(() => Object.fromEntries(items.map((i) => [i.id, items.length === 1 ? i.qty : 0])));
  const need = RETURN_REASONS.find((r) => r[0] === code)?.[2];
  const chosen = items.filter((i) => qty[i.id] > 0);
  const value = chosen.reduce((a, i) => a + i.price * qty[i.id], 0);
  return (
    <form action={action} className="rf">
      <input type="hidden" name="order_no" value={orderNo} />
      <p style={{ margin: "0 0 6px" }}><b>1. Kaun sa item wapas karna hai?</b></p>
      {items.map((i) => {
        const on = qty[i.id] > 0;
        return (
          <div key={i.id} className={`rf-item${on ? " on" : ""}`}>
            <label className="rf-pick">
              <input type="checkbox" checked={on} onChange={(e) => setQty({ ...qty, [i.id]: e.target.checked ? i.qty : 0 })} />
              <span className="rf-th">{i.image ? <img src={i.image} alt="" /> : null}</span>
              <span><b>{i.name}</b>{i.variant_label ? <span className="mut"> ({i.variant_label})</span> : null}<br /><span className="mut" style={{ fontSize: 12 }}>{rupees(i.price)} · kharida {i.qty}</span></span>
            </label>
            {on && i.qty > 1 && (
              <label className="rf-q">Kitne wapas?
                <select value={qty[i.id]} onChange={(e) => setQty({ ...qty, [i.id]: Number(e.target.value) })}>
                  {Array.from({ length: i.qty }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
            <input type="hidden" name={`qty_${i.id}`} value={qty[i.id] || 0} />
          </div>
        );
      })}
      {chosen.length > 0 && <p className="mut" style={{ fontSize: 12, margin: "4px 0 10px" }}>Chune hue items ki keemat {rupees(value)}. Asli refund discount adjust hokar quality check ke baad tay hota hai.</p>}

      <label htmlFor="rc"><b>2. Return ki wajah</b></label>
      <select id="rc" name="reason_code" required value={code} onChange={(e) => setCode(e.target.value)}>
        <option value="" disabled>Wajah chuniye</option>
        {RETURN_REASONS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
      </select>
      <label htmlFor="rr">Aur batayein{code === "other" ? "" : " (optional)"}</label>
      <textarea id="rr" name="comment" rows={3} maxLength={500} required={code === "other"} placeholder="Jaise: colour alag hai, strap toota hua hai..." />
      <p style={{ margin: "10px 0 4px" }}>Photos {need ? <b>(kam se kam 2 zaroori)</b> : <span className="mut">(optional, 2 se 3 madad karti hain)</span>}</p>
      <div className="rf-slots"><Slot n={1} onBad={setBad} /><Slot n={2} onBad={setBad} /><Slot n={3} onBad={setBad} /></div>
      <p className="mut" style={{ fontSize: 12 }}>JPG, PNG ya WEBP, har photo 5 MB tak. Photo se hume problem jaldi samajhne mein madad milti hai.</p>
      {(bad || s?.error) && <p className="err" role="alert">{bad || s.error}</p>}
      <button className="btn a" disabled={busy || chosen.length === 0} style={{ minHeight: 44 }}>{busy ? "Ruko..." : "Return request bhejein"}</button>
    </form>
  );
}
