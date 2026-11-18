"use client";
import { useState } from "react";
import Link from "next/link";

const rupees = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceTable({ rows }) {
  const [sel, setSel] = useState(() => new Set());
  const all = rows.length > 0 && sel.size === rows.length;
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const ids = [...sel].slice(0, 100).join(",");
  return (
    <div className="card pad">
      <div className="row" style={{ border: 0, padding: "0 0 8px", flexWrap: "wrap", gap: 8 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: 0, color: "var(--ink)", fontSize: 13 }}>
          <input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} style={{ width: 18, height: 18, margin: 0 }} />
          Sab chunein ({sel.size} chune)
        </label>
        {sel.size > 0
          ? <Link href={`/seller/invoices/print?ids=${ids}`} target="_blank" className="btn a s" style={{ minHeight: 44 }}>Print selected ({Math.min(sel.size, 100)})</Link>
          : <button type="button" className="btn a s" style={{ minHeight: 44 }} disabled>Print selected</button>}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="rt-tab" style={{ width: "100%", minWidth: 640 }}>
          <thead><tr><th></th><th>Invoice</th><th>Date</th><th>Order</th><th>Customer</th><th>Tax</th><th>Total</th><th>Credit notes</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.no}`} style={{ width: 18, height: 18, margin: 0 }} /></td>
                <td><b>{r.no}</b></td><td>{r.date}</td>
                <td><Link href={`/seller/orders/${r.order_no}`}>{r.order_no}</Link></td>
                <td>{r.name}</td><td>{r.type === "inter" ? "IGST" : "CGST+SGST"}</td><td><b>{rupees(r.total)}</b></td>
                <td>{r.cns > 0 ? <span className="tag y">{r.cns} · {rupees(r.cn_amount)}</span> : <span className="mut">-</span>}</td>
                <td><Link href={`/seller/invoices/print?ids=${r.id}`} target="_blank" className="btn o s" style={{ minHeight: 44 }}>Print</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mut">Is range mein koi invoice nahi hai.</p>}
    </div>
  );
}
