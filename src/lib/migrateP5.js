// Phase 5 ka database badlav: item-wise returns, refund ka khata, GST invoice aur credit note, business settings.
// Ye "migrate.js" se ek hi baar chalta hai. db = seedha SQLite connection (db.js ke helpers yahan nahi chalte).
import { buildInvoiceData, fyOf, docNo } from "./gst";
import { SITE } from "./site";

const cols = (db, t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
const addCol = (db, t, c, type) => { if (!cols(db, t).includes(c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${type}`); };

export const BIZ_DEFAULTS = {
  biz_name: SITE.name, biz_legal: SITE.name, biz_gstin: "", biz_address: SITE.address, biz_state: "Gujarat",
  invoice_prefix: "INB", default_hsn: "4202",
};
export const INVOICEABLE = ["Packed", "Ready to ship", "Picked up", "In transit", "Out for delivery", "NDR", "RTO", "RTO Done", "Delivered", "Return Requested", "Return Approved", "Return Rejected", "Refunded", "Shipped"];

export function p5Up(db) {
  for (const [c, t] of [["reject_reason", "TEXT"], ["reject_note", "TEXT"], ["refund_dest", "TEXT"], ["refund_upi", "TEXT"], ["refund_bank", "TEXT"],
    ["refund_amount", "INTEGER"], ["deduction", "INTEGER NOT NULL DEFAULT 0"], ["deduction_note", "TEXT"], ["refund_method", "TEXT"], ["refund_ref", "TEXT"],
    ["refunded_at", "TEXT"], ["refunded_by", "TEXT"], ["received_at", "TEXT"], ["qc_note", "TEXT"], ["qc_skipped", "INTEGER NOT NULL DEFAULT 0"]]) addCol(db, "returns", c, t);
  addCol(db, "products", "hsn", "TEXT");

  // Return mein kaun sa item aur kitna (quality check ka natija bhi yahin)
  db.exec(`CREATE TABLE IF NOT EXISTS return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    order_item_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    qc_result TEXT,
    restock_qty INTEGER NOT NULL DEFAULT 0,
    qc_note TEXT
  )`);
  db.exec("CREATE INDEX IF NOT EXISTS return_items_rid ON return_items (return_id)");

  // Har refund ek row (partial refund bhi). amount rupaye mein.
  db.exec(`CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    return_id INTEGER,
    kind TEXT NOT NULL DEFAULT 'return',
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    dest TEXT,
    ref TEXT,
    by_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec("CREATE INDEX IF NOT EXISTS refunds_oid ON refunds (order_id)");

  db.exec(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    fy TEXT NOT NULL, seq INTEGER NOT NULL, no TEXT NOT NULL UNIQUE,
    issued_at TEXT NOT NULL DEFAULT (datetime('now')),
    data TEXT NOT NULL
  )`);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS invoices_fy_seq ON invoices (fy, seq)");

  db.exec(`CREATE TABLE IF NOT EXISTS credit_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL,
    return_id INTEGER,
    kind TEXT NOT NULL DEFAULT 'return',
    fy TEXT NOT NULL, seq INTEGER NOT NULL, no TEXT NOT NULL UNIQUE,
    reason TEXT,
    amount REAL NOT NULL,
    issued_at TEXT NOT NULL DEFAULT (datetime('now')),
    data TEXT NOT NULL
  )`);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS credit_notes_fy_seq ON credit_notes (fy, seq)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS credit_notes_return ON credit_notes (return_id) WHERE return_id IS NOT NULL");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS credit_notes_order_kind ON credit_notes (order_id, kind) WHERE return_id IS NULL");

  db.exec("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)");

  // Purane returns: poora order wapas maane jate the, isliye saare items return_items mein
  db.exec(`INSERT INTO return_items (return_id, order_item_id, qty)
           SELECT r.id, oi.id, oi.qty FROM returns r JOIN order_items oi ON oi.order_id = r.order_id
           WHERE NOT EXISTS (SELECT 1 FROM return_items x WHERE x.return_id = r.id)`);
  // Purane refund ho chuke returns ka record
  db.exec(`UPDATE returns SET
             refund_amount = (SELECT total FROM orders WHERE id = returns.order_id),
             refunded_at = (SELECT refunded_at FROM orders WHERE id = returns.order_id),
             refund_method = CASE WHEN (SELECT razorpay_refund_id FROM orders WHERE id = returns.order_id) IS NOT NULL THEN 'razorpay' ELSE 'manual' END
           WHERE status = 'Refunded' AND refund_amount IS NULL`);
  db.exec(`INSERT INTO refunds (order_id, return_id, kind, amount, method, ref, created_at)
           SELECT o.id, r.id, 'return', o.total, r.refund_method, COALESCE(o.razorpay_refund_id, o.refund_note), COALESCE(o.refunded_at, datetime('now'))
           FROM returns r JOIN orders o ON o.id = r.order_id
           WHERE r.status = 'Refunded' AND NOT EXISTS (SELECT 1 FROM refunds f WHERE f.return_id = r.id)`);

  backfillInvoices(db);
}

// Pehle ke orders (jo pack ho chuke) ke invoice: purane se naye ke kram mein, taaki number ek ke baad ek bane.
export function backfillInvoices(db) {
  const biz = { ...BIZ_DEFAULTS };
  for (const r of db.prepare("SELECT key, value FROM app_settings").all()) if (r.value) biz[r.key] = r.value;
  const qs = INVOICEABLE.map(() => "?").join(",");
  const orders = db.prepare(`SELECT * FROM orders o WHERE (o.status IN (${qs}) OR (o.packed_at IS NOT NULL AND o.status <> 'Cancelled'))
                              AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id) ORDER BY COALESCE(o.packed_at, o.confirmed_at, o.created_at), o.id`).all(...INVOICEABLE);
  const itemsOf = db.prepare(`SELECT oi.*, COALESCE(p.hsn, '') AS hsn, COALESCE(p.gst_percent, 12) AS gst FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`);
  const nextSeq = db.prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM invoices WHERE fy = ?");
  const ins = db.prepare("INSERT INTO invoices (order_id, fy, seq, no, issued_at, data) VALUES (?,?,?,?,?,?)");
  for (const o of orders) {
    const at = o.packed_at || o.confirmed_at || o.created_at;
    const fy = fyOf(at);
    const seq = nextSeq.get(fy).n;
    const data = buildInvoiceData({ order: o, items: itemsOf.all(o.id).map((i) => ({ ...i, hsn: i.hsn || biz.default_hsn })), sellerState: biz.biz_state });
    ins.run(o.id, fy, seq, docNo(biz.invoice_prefix, fy, seq), at, JSON.stringify(data));
  }
  return orders.length;
}
