import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { all, inr } from "@/lib/db";
import { parseFilters, RANGES, filterQs } from "@/lib/reports";
import { ensureInvoice, business, GSTIN_RE } from "@/lib/invoices";
import { INVOICEABLE } from "@/lib/migrateP5";
import { fmtDate } from "@/lib/format";
import InvoiceTable from "./InvoiceTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "GST invoices – Seller Panel" };

export default async function Invoices({ searchParams }) {
  const me = await requirePerm("invoices");
  const sp = await searchParams;
  const f = parseFilters(sp);
  const q = String(sp.q || "").trim().slice(0, 40);

  // pack ho chuke par jinka invoice nahi bana (kisi wajah se), unka bana do
  try {
    const qs = INVOICEABLE.map(() => "?").join(",");
    const missing = all(
      `SELECT o.id FROM orders o WHERE (o.status IN (${qs}) OR (o.packed_at IS NOT NULL AND o.status <> 'Cancelled'))
         AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id) ORDER BY COALESCE(o.packed_at, o.created_at), o.id LIMIT 200`,
      ...INVOICEABLE
    );
    for (const m of missing) ensureInvoice(m.id);
  } catch (e) { console.error("invoice catch-up:", e.message); }

  const w = [], p = [];
  if (f.from) { w.push("date(i.issued_at,'+330 minutes') >= ?"); p.push(f.from); }
  if (f.to) { w.push("date(i.issued_at,'+330 minutes') <= ?"); p.push(f.to); }
  if (q) { w.push("(i.no LIKE ? OR o.order_no LIKE ? OR o.ship_name LIKE ?)"); const l = `%${q}%`; p.push(l, l, l); }
  const rows = all(
    `SELECT i.id, i.no, i.issued_at, o.order_no, o.ship_name, o.status,
       json_extract(i.data, '$.type') AS type, json_extract(i.data, '$.totals.taxable') AS taxable, json_extract(i.data, '$.totals.total') AS total,
       (SELECT COUNT(*) FROM credit_notes n WHERE n.invoice_id = i.id) AS cns,
       (SELECT COALESCE(SUM(n.amount), 0) FROM credit_notes n WHERE n.invoice_id = i.id) AS cn_amount
     FROM invoices i JOIN orders o ON o.id = i.order_id ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY i.id DESC LIMIT 500`,
    ...p
  );
  const cns = all(
    `SELECT n.id, n.no, n.kind, n.amount, n.issued_at, o.order_no FROM credit_notes n JOIN orders o ON o.id = n.order_id
     ${f.from || f.to ? "WHERE " + [f.from ? "date(n.issued_at,'+330 minutes') >= ?" : "", f.to ? "date(n.issued_at,'+330 minutes') <= ?" : ""].filter(Boolean).join(" AND ") : ""} ORDER BY n.id DESC LIMIT 200`,
    ...[f.from, f.to].filter(Boolean)
  );
  const biz = business();
  const gstOk = GSTIN_RE.test(biz.gstin || "");
  const qsRange = filterQs(f);
  const sum = (k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);

  return (
    <>
      <h2>GST invoices</h2>
      <p className="mut" style={{ marginTop: -8 }}>Invoice order pack hote hi apne aap banta hai. Return refund par credit note banta hai.</p>
      {!gstOk && (
        <p className="err" role="alert">
          Aapka GSTIN abhi {biz.gstin ? "sahi format mein nahi hai" : "daala nahi gaya"}. Invoice par seller ka GSTIN dikhna zaroori hai.{" "}
          {can(me.role, "settings") ? <Link href="/seller/settings" style={{ textDecoration: "underline" }}>Business &amp; GST settings kholein</Link> : "Owner se settings mein daalne ko kahein."}
        </p>
      )}
      <form method="get" className="card pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        <div style={{ flex: "1 1 160px" }}>
          <label htmlFor="rg">Date</label>
          <select id="rg" name="range" defaultValue={f.range} style={{ margin: 0 }}>{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div style={{ flex: "1 1 130px" }}><label htmlFor="rf">Se (custom)</label><input id="rf" type="date" name="from" defaultValue={f.rawFrom} style={{ margin: 0 }} /></div>
        <div style={{ flex: "1 1 130px" }}><label htmlFor="rt">Tak (custom)</label><input id="rt" type="date" name="to" defaultValue={f.rawTo} style={{ margin: 0 }} /></div>
        <div style={{ flex: "2 1 180px" }}><label htmlFor="rq">Invoice no, order no ya naam</label><input id="rq" name="q" defaultValue={q} style={{ margin: 0 }} /></div>
        <button className="btn a s" style={{ minHeight: 44 }}>Dikhao</button>
      </form>

      <div className="row" style={{ border: 0, padding: "0 0 8px", flexWrap: "wrap", gap: 8 }}>
        <span className="mut">{f.label} · {rows.length} invoices · taxable {inr(Math.round(sum("taxable")))} · total {inr(Math.round(sum("total")))}</span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn o s" style={{ minHeight: 44 }} href={`/seller/invoices/download?type=gst_register&${qsRange}`}>GST register (Excel)</a>
          <a className="btn o s" style={{ minHeight: 44 }} href={`/seller/invoices/download?type=credit_notes&${qsRange}`}>Credit notes (Excel)</a>
        </span>
      </div>

      <InvoiceTable rows={rows.map((r) => ({ id: r.id, no: r.no, date: fmtDate(r.issued_at), order_no: r.order_no, name: r.ship_name, status: r.status, type: r.type, total: r.total, cns: r.cns, cn_amount: r.cn_amount }))} />

      {cns.length > 0 && (
        <>
          <h3 style={{ margin: "18px 0 6px" }}>Credit notes</h3>
          <div className="card pad">
            <table className="rt-tab" style={{ width: "100%" }}>
              <thead><tr><th>Credit note</th><th>Date</th><th>Order</th><th>Type</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {cns.map((n) => (
                  <tr key={n.id}>
                    <td><b>{n.no}</b></td><td>{fmtDate(n.issued_at)}</td><td><Link href={`/seller/orders/${n.order_no}`}>{n.order_no}</Link></td>
                    <td>{n.kind === "return" ? "Return" : n.kind === "rto" ? "RTO" : "Cancel"}</td><td>{inr(n.amount)}</td>
                    <td><Link href={`/seller/invoices/print?cn=${n.id}`} target="_blank" className="btn o s" style={{ minHeight: 44 }}>Print</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
