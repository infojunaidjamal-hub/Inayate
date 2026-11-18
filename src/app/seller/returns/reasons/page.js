import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { parseFilters, RANGES, filterQs } from "@/lib/reports";
import { RETURN_REASONS } from "@/lib/format";
import "../returns.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Return reasons – Seller Panel" };

export default async function Reasons({ searchParams }) {
  await requirePerm("returns");
  const sp = await searchParams;
  const f = parseFilters(sp);
  const rw = [], rp = [], ow = [], op = [];
  if (f.from) { rw.push("date(r.created_at,'+330 minutes') >= ?"); rp.push(f.from); ow.push("date(o.created_at,'+330 minutes') >= ?"); op.push(f.from); }
  if (f.to) { rw.push("date(r.created_at,'+330 minutes') <= ?"); rp.push(f.to); ow.push("date(o.created_at,'+330 minutes') <= ?"); op.push(f.to); }
  const W = (a) => (a.length ? "WHERE " + a.join(" AND ") : "");

  const byReason = all(`SELECT r.reason_code AS code, COUNT(*) AS n FROM returns r ${W(rw)} GROUP BY r.reason_code ORDER BY n DESC`, ...rp);
  const rto = one(`SELECT COUNT(*) c FROM orders o ${W([...ow, "o.rto_stage IS NOT NULL"])}`, ...op).c;
  const total = byReason.reduce((a, r) => a + r.n, 0);
  const label = (c) => (RETURN_REASONS.find((r) => r[0] === c) || [])[1] || c || "Other";
  const delivered = one(`SELECT COUNT(*) c FROM orders o ${W([...ow, "o.status IN ('Delivered','Return Requested','Return Approved','Return Rejected','Refunded')"])}`, ...op).c;
  const refunded = all(`SELECT julianday(r.refunded_at) - julianday(r.created_at) AS d FROM returns r ${W([...rw, "r.refunded_at IS NOT NULL"])}`, ...rp);
  const avgDays = refunded.length ? refunded.reduce((a, r) => a + r.d, 0) / refunded.length : null;
  const qty = one(`SELECT COALESCE(SUM(ri.qty),0) q, COALESCE(SUM(ri.restock_qty),0) s, COALESCE(SUM(CASE WHEN ri.qc_result IS NOT NULL THEN ri.qty ELSE 0 END),0) checked
                   FROM return_items ri JOIN returns r ON r.id = ri.return_id ${W(rw)}`, ...rp);
  const top = all(
    `SELECT oi.name AS name, COALESCE(SUM(ri.qty),0) AS q, (SELECT COALESCE(SUM(x.qty),0) FROM order_items x WHERE x.product_id = oi.product_id) AS sold
     FROM return_items ri JOIN returns r ON r.id = ri.return_id JOIN order_items oi ON oi.id = ri.order_item_id ${W(rw)}
     GROUP BY oi.product_id ORDER BY q DESC LIMIT 8`, ...rp
  );
  const max = Math.max(1, ...byReason.map((r) => r.n));
  return (
    <>
      <h2>Return reasons</h2>
      <p style={{ marginTop: -8 }}><Link href="/seller/returns?tab=cr">← Returns &amp; Refunds</Link></p>
      <form method="get" className="card pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        <div style={{ flex: "1 1 160px" }}><label htmlFor="rg">Date</label><select id="rg" name="range" defaultValue={f.range} style={{ margin: 0 }}>{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div style={{ flex: "1 1 130px" }}><label htmlFor="rf">Se (custom)</label><input id="rf" type="date" name="from" defaultValue={f.rawFrom} style={{ margin: 0 }} /></div>
        <div style={{ flex: "1 1 130px" }}><label htmlFor="rt">Tak (custom)</label><input id="rt" type="date" name="to" defaultValue={f.rawTo} style={{ margin: 0 }} /></div>
        <button className="btn a s" style={{ minHeight: 44 }}>Dikhao</button>
        <a className="btn o s" style={{ minHeight: 44 }} href={`/seller/returns/reasons/download?${filterQs(f)}`}>Download Excel</a>
      </form>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {[["Customer returns", total], ["RTO (parcel wapas aaya)", rto], ["Return rate", delivered ? `${((total / delivered) * 100).toFixed(1)}%` : "-"], ["Avg refund time", avgDays === null ? "-" : `${avgDays.toFixed(1)} din`], ["Restocked", qty.checked ? `${Math.round((qty.s / qty.checked) * 100)}%` : "-"]].map(([l, v]) => (
          <div className="card pad" key={l} style={{ flex: "1 1 130px", margin: 0 }}><div className="mut" style={{ fontSize: 12 }}>{l}</div><b style={{ fontSize: 22 }}>{v}</b></div>
        ))}
      </div>

      <div className="card pad">
        <h3 style={{ marginTop: 0 }}>Customers kyun return karte hain ({f.label})</h3>
        {byReason.length === 0 && <p className="mut">Is range mein koi return nahi.</p>}
        {byReason.map((r) => (
          <div key={r.code || "x"} style={{ marginBottom: 12 }}>
            <div className="row" style={{ border: 0, padding: 0 }}><span>{label(r.code)}</span><span><b>{r.n}</b> · {Math.round((r.n / total) * 100)}%</span></div>
            <div style={{ height: 10, borderRadius: 99, background: "#efe6d8", marginTop: 5 }}><div style={{ height: 10, borderRadius: 99, background: "#8f5f36", width: `${(r.n / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      {top.length > 0 && (
        <div className="card pad" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Sabse zyada return hone wale products</h3>
          <table className="rt-tab" style={{ width: "100%" }}>
            <thead><tr><th>Product</th><th>Returned</th><th>Total sold</th><th>Rate</th></tr></thead>
            <tbody>{top.map((t) => <tr key={t.name}><td>{t.name}</td><td>{t.q}</td><td>{t.sold}</td><td>{t.sold ? `${((t.q / t.sold) * 100).toFixed(1)}%` : "-"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
