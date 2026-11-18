// GST invoice aur credit note: banana, number dena, dhundhna. SIRF SERVER par chalta hai.
//  - Invoice order ke "Packed" hote hi banta hai (orderFlow.js se). Number: INB/26-27/0001 (saal April se March).
//  - Invoice ki rakam (lines, tax) banne ke samay hi tay ho jati hai, baad mein badalti nahi.
//  - Credit note: return ka refund hone par, ya cancel / RTO par (agar invoice ban chuka tha). Number: CN/26-27/0001.
//  - Seller ka naam, GSTIN, pata invoice dikhate samay Business settings se aata hai.
import { all, one, run, transaction } from "@/lib/db";
import { buildInvoiceData, buildCreditData, fyOf, docNo, round2 } from "@/lib/gst";
import { BIZ_DEFAULTS, INVOICEABLE } from "@/lib/migrateP5";
import { SITE } from "@/lib/site";

/* ---------- Business settings ---------- */
export function business() {
  const b = { ...BIZ_DEFAULTS };
  for (const r of all("SELECT key, value FROM app_settings")) if (r.value) b[r.key] = r.value;
  return { name: b.biz_name, legal: b.biz_legal, gstin: b.biz_gstin, address: b.biz_address, state: b.biz_state, prefix: b.invoice_prefix, defaultHsn: b.default_hsn, email: SITE.email, phone: SITE.phone };
}
export function saveBusiness(v) {
  const map = { biz_name: v.name, biz_legal: v.legal, biz_gstin: v.gstin, biz_address: v.address, biz_state: v.state, invoice_prefix: v.prefix, default_hsn: v.defaultHsn };
  transaction(() => {
    for (const [k, val] of Object.entries(map)) run("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", k, String(val ?? "").trim());
  });
}
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/* ---------- order ke items (HSN aur GST % ke saath) ---------- */
export function itemsWithTax(orderId, defaultHsn = business().defaultHsn) {
  return all(
    `SELECT oi.*, COALESCE(NULLIF(p.hsn, ''), ?) AS hsn, COALESCE(p.gst_percent, 12) AS gst
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`,
    defaultHsn, orderId
  );
}

const parse = (row) => (row ? { ...row, data: JSON.parse(row.data) } : null);

/* ---------- Invoice ---------- */
export const invoiceOf = (orderId) => parse(one("SELECT * FROM invoices WHERE order_id = ?", orderId));
export const invoiceByNo = (no) => parse(one("SELECT * FROM invoices WHERE no = ?", no));

// Invoice nahi bana to banao (sirf pack ho chuke orders ke liye). Wapas: invoice ya null
export function ensureInvoice(orderId) {
  const ex = invoiceOf(orderId);
  if (ex) return ex;
  const o = one("SELECT * FROM orders WHERE id = ?", orderId);
  if (!o || (!INVOICEABLE.includes(o.status) && !(o.packed_at && o.status !== "Cancelled"))) return null;
  const biz = business();
  return transaction(() => {
    const again = invoiceOf(orderId);
    if (again) return again;
    const at = o.packed_at || o.confirmed_at || o.created_at;
    const fy = fyOf(at);
    const seq = one("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM invoices WHERE fy = ?", fy).n;
    const data = buildInvoiceData({ order: o, items: itemsWithTax(orderId, biz.defaultHsn), sellerState: biz.state });
    run("INSERT INTO invoices (order_id, fy, seq, no, issued_at, data) VALUES (?,?,?,?,datetime('now'),?)", orderId, fy, seq, docNo(biz.prefix, fy, seq), JSON.stringify(data));
    return invoiceOf(orderId);
  });
}

/* ---------- Credit note ---------- */
export const creditNotesOf = (orderId) => all("SELECT * FROM credit_notes WHERE order_id = ? ORDER BY id", orderId).map(parse);
export const creditNoteByNo = (no) => parse(one("SELECT * FROM credit_notes WHERE no = ?", no));

// sel = [{ order_item_id, qty }]  (khali = poora order). kind: "return" | "cancel" | "rto".
// withCharges: shipping aur COD fee bhi wapas (cancel / RTO mein hamesha, return mein sirf rule ke hisaab se).
// Invoice na bana ho to kuch nahi banta (null). Dobara bulane par wahi purana credit note milta hai.
export function issueCreditNote({ orderId, returnId = null, kind = "return", sel = null, withCharges = kind !== "return", reason = "" }) {
  const had = returnId
    ? one("SELECT * FROM credit_notes WHERE return_id = ?", returnId)
    : one("SELECT * FROM credit_notes WHERE order_id = ? AND return_id IS NULL AND kind = ?", orderId, kind);
  if (had) return parse(had);
  const inv = ensureInvoice(orderId);
  if (!inv) return null;
  const o = one("SELECT * FROM orders WHERE id = ?", orderId);
  const items = itemsWithTax(orderId);
  // invoice ke samay jo HSN / GST % lagi thi wahi use karo (product baad mein badal sakta hai)
  const frozen = inv.data.lines;
  const picked = (sel && sel.length ? sel : items.map((i) => ({ order_item_id: i.id, qty: i.qty })))
    .map((s) => ({ item: items.find((i) => i.id === s.order_item_id), qty: Math.max(0, Math.min(Number(s.qty) || 0, items.find((i) => i.id === s.order_item_id)?.qty || 0)) }))
    .filter((s) => s.item && s.qty > 0);
  if (!picked.length) return null;
  const idx = (it) => items.findIndex((x) => x.id === it.id);
  for (const p of picked) { const f = frozen[idx(p.item)]; if (f && f.rate !== undefined) { p.item = { ...p.item, gst: f.rate, hsn: f.hsn || p.item.hsn }; } }
  const biz = business();
  const data = { ...buildCreditData({ order: o, sel: picked, withCharges, sellerState: inv.data.sellerState || biz.state }), invoiceNo: inv.no, reason };
  const fy = fyOf(null);
  return transaction(() => {
    const seq = one("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM credit_notes WHERE fy = ?", fy).n;
    const no = docNo("CN", fy, seq);
    run("INSERT INTO credit_notes (order_id, invoice_id, return_id, kind, fy, seq, no, reason, amount, data) VALUES (?,?,?,?,?,?,?,?,?,?)",
      orderId, inv.id, returnId, kind, fy, seq, no, reason || null, round2(data.totals.total), JSON.stringify(data));
    return parse(one("SELECT * FROM credit_notes WHERE no = ?", no));
  });
}
