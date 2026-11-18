// Seller ki saari reports (Orders, Customers, Returns, Payments, Products...) yahan define hain.
import { all, one } from "@/lib/db";
import { ymd } from "@/lib/format";

export const ORDER_STATUSES = ["On Hold", "Confirmed", "Packed", "Ready to ship", "Picked up", "In transit", "Out for delivery", "NDR", "RTO", "RTO Done", "Placed", "Shipped", "Delivered", "Cancelled", "Return Requested", "Return Approved", "Return Rejected", "Refunded"];
export const PAY_STATUSES = ["Paid", "COD Pending", "Refund Initiated", "Refunded", "Cancelled"];
export const RANGES = [["7", "Pichhle 7 din"], ["30", "Pichhle 30 din"], ["90", "Pichhle 90 din"], ["month", "Is mahine"], ["lastmonth", "Pichhla mahina"], ["all", "Sab (poora data)"], ["custom", "Apni date"]];

/* ---------- Filters ---------- */
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
const g = (sp, k) => String(Array.isArray(sp[k]) ? sp[k][0] : sp[k] ?? "").trim();

export function parseFilters(sp = {}) {
  const range = RANGES.some(([v]) => v === g(sp, "range")) ? g(sp, "range") : "30";
  const today = new Date(Date.now() + 330 * 60000); // India ka aaj
  const day = (n) => ymd(new Date(today.getTime() - n * 864e5));
  let from = "", to = "";
  if (["7", "30", "90"].includes(range)) { from = day(Number(range) - 1); to = ymd(today); }
  else if (range === "month") { from = ymd(today).slice(0, 8) + "01"; to = ymd(today); }
  else if (range === "lastmonth") {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const lastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    from = ymd(first); to = ymd(lastDay);
  } else if (range === "custom") {
    from = isDate(g(sp, "from")) ? g(sp, "from") : "";
    to = isDate(g(sp, "to")) ? g(sp, "to") : "";
  }
  const status = ORDER_STATUSES.includes(g(sp, "status")) ? g(sp, "status") : "";
  const pay = PAY_STATUSES.includes(g(sp, "pay")) ? g(sp, "pay") : "";
  const label = from || to ? `${from || "shuru"} se ${to || "aaj"} tak` : "Poora data";
  return { range, from, to, status, pay, label, rawFrom: g(sp, "from"), rawTo: g(sp, "to") };
}

export function filterQs(f, extra = {}) {
  const p = new URLSearchParams();
  p.set("range", f.range);
  if (f.range === "custom") { if (f.from) p.set("from", f.from); if (f.to) p.set("to", f.to); }
  if (f.status) p.set("status", f.status);
  if (f.pay) p.set("pay", f.pay);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

/* ---------- SQL ke chhote helpers (samay India ke hisaab se) ---------- */
const D = (e) => `date(${e},'+330 minutes')`;
const DT = (e) => `strftime('%Y-%m-%d %H:%M', ${e}, '+330 minutes')`;
const tableCols = (t) => all(`PRAGMA table_info("${t}")`).map((c) => c.name);
const opt = (alias, table, col) => (tableCols(table).includes(col) ? `${alias}.${col} AS ${col}` : `NULL AS ${col}`);

function cond(f, { date, status, pay }) {
  const w = [], p = [];
  if (date && f.from) { w.push(`${D(date)} >= ?`); p.push(f.from); }
  if (date && f.to) { w.push(`${D(date)} <= ?`); p.push(f.to); }
  if (status && f.status) { w.push(`${status} = ?`); p.push(f.status); }
  if (pay && f.pay) { w.push(`${pay} = ?`); p.push(f.pay); }
  return { where: w.length ? "WHERE " + w.join(" AND ") : "", params: p };
}

const T = (key, header, width, type = "text") => ({ key, header, width, type });
const ORD_NOT_LIVE = "('Cancelled','Refunded')";

/* ---------- Reports ---------- */
export const REPORTS = [
  {
    id: "orders", title: "Orders", uses: "Date, Order status, Payment status",
    desc: "Har order ek row: order no, date, customer, address, items, total, payment, status, courier, AWB.",
    build(f) {
      const c = cond(f, { date: "o.created_at", status: "o.status", pay: "o.pay_status" });
      return {
        columns: [T("order_no", "Order No", 12), T("date", "Date", 17), T("ship_name", "Customer", 20), T("ship_mobile", "Mobile", 14), T("ship_address", "Address", 40),
          T("items", "Items", 40), T("subtotal", "Subtotal", 11, "money"), T("shipping", "Shipping", 10, "money"), T("total", "Total", 11, "money"),
          T("pay_method", "Payment method", 14), T("pay_status", "Payment status", 16), T("status", "Order status", 16), T("courier", "Courier", 14), T("awb", "AWB", 16),
          T("razorpay_payment_id", "Razorpay payment ID", 24), T("razorpay_refund_id", "Razorpay refund ID", 24), T("refunded_at", "Refunded at", 17)],
        sql: `SELECT o.order_no, ${DT("o.created_at")} AS date, o.ship_name, o.ship_mobile, o.ship_address,
                (SELECT GROUP_CONCAT(name || ' x' || qty, '; ') FROM order_items WHERE order_id = o.id) AS items,
                o.subtotal, o.shipping, o.total, o.pay_method, o.pay_status, o.status, o.courier, o.awb,
                ${opt("o", "orders", "razorpay_payment_id")}, ${opt("o", "orders", "razorpay_refund_id")}, ${opt("o", "orders", "refunded_at")}
              FROM orders o ${c.where} ORDER BY o.id DESC`,
        params: c.params,
      };
    },
  },
  {
    id: "items", title: "Order items (GST)", uses: "Date, Order status, Payment status",
    desc: "Har product ki alag row: order, SKU, qty, price, GST %. GST ka amount price mein shamil maanke nikala hai (anumaan).",
    build(f) {
      const c = cond(f, { date: "o.created_at", status: "o.status", pay: "o.pay_status" });
      return {
        columns: [T("order_no", "Order No", 12), T("date", "Date", 17), T("ship_name", "Customer", 20), T("sku", "SKU", 14), T("name", "Product", 28), T("qty", "Qty", 7, "int"),
          T("price", "Price (ek piece)", 14, "money"), T("line_total", "Line total", 12, "money"), T("gst_percent", "GST %", 8, "int"),
          T("gst_incl", "GST (price mein shamil, anumaan)", 22, "money2"), T("status", "Order status", 16), T("pay_status", "Payment status", 16)],
        sql: `SELECT o.order_no, ${DT("o.created_at")} AS date, o.ship_name, COALESCE(oi.sku, p.sku) AS sku, oi.name, oi.qty, oi.price, oi.qty * oi.price AS line_total,
                COALESCE(p.gst_percent, 0) AS gst_percent,
                ROUND(oi.qty * oi.price * COALESCE(p.gst_percent, 0) * 1.0 / (100 + COALESCE(p.gst_percent, 0)), 2) AS gst_incl,
                o.status, o.pay_status
              FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id
              ${c.where} ORDER BY o.id DESC, oi.id`,
        params: c.params,
      };
    },
  },
  {
    id: "customers", title: "Customers", uses: "Date (customer kab judaa)",
    desc: "Naam, mobile, email, kab judaa, kitne orders, kul kharcha, pehla/aakhri order, cancelled aur returns.",
    build(f) {
      const c = cond(f, { date: "u.created_at" });
      const w = c.where ? c.where.replace("WHERE", "WHERE u.role = 'buyer' AND") : "WHERE u.role = 'buyer'";
      return {
        columns: [T("name", "Naam", 22), T("mobile", "Mobile", 14), T("email", "Email", 26), T("joined", "Joined", 12), T("orders_n", "Orders", 9, "int"), T("spent", "Kul kharcha", 13, "money"),
          T("first_order", "Pehla order", 13), T("last_order", "Aakhri order", 13), T("cancelled", "Cancelled", 10, "int"), T("returns_n", "Returns", 9, "int")],
        sql: `SELECT u.name, u.mobile, u.email, ${D("u.created_at")} AS joined,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status != 'Cancelled') AS orders_n,
                (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ${ORD_NOT_LIVE}) AS spent,
                (SELECT MIN(${D("o.created_at")}) FROM orders o WHERE o.user_id = u.id) AS first_order,
                (SELECT MAX(${D("o.created_at")}) FROM orders o WHERE o.user_id = u.id) AS last_order,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'Cancelled') AS cancelled,
                (SELECT COUNT(*) FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.user_id = u.id) AS returns_n
              FROM users u ${w} ORDER BY u.id DESC`,
        params: c.params,
      };
    },
  },
  {
    id: "returns", title: "Returns & Refunds", uses: "Date (return ki), Order status",
    desc: "Return ka reason, status, kab mangi gayi, order ka total, refund ID aur refund ki date.",
    build(f) {
      const c = cond(f, { date: "r.created_at", status: "o.status" });
      return {
        columns: [T("id", "Return ID", 10, "int"), T("order_no", "Order No", 12), T("ship_name", "Customer", 20), T("ship_mobile", "Mobile", 14), T("reason", "Reason", 36),
          T("ret_status", "Return status", 15), T("requested_on", "Requested on", 17), T("total", "Order total", 12, "money"), T("order_status", "Order status", 16),
          T("pay_status", "Payment status", 16), T("razorpay_refund_id", "Razorpay refund ID", 24), T("refunded_at", "Refunded at", 17)],
        sql: `SELECT r.id, o.order_no, o.ship_name, o.ship_mobile, r.reason, r.status AS ret_status, ${DT("r.created_at")} AS requested_on,
                o.total, o.status AS order_status, o.pay_status, ${opt("o", "orders", "razorpay_refund_id")}, ${opt("o", "orders", "refunded_at")}
              FROM returns r JOIN orders o ON o.id = r.order_id ${c.where} ORDER BY r.id DESC`,
        params: c.params,
      };
    },
  },
  {
    id: "payments", title: "Payments", uses: "Date, Order status, Payment status",
    desc: "Har order ka paisa: method, status, amount, Razorpay payment ID, refund ID aur refund note.",
    build(f) {
      const c = cond(f, { date: "o.created_at", status: "o.status", pay: "o.pay_status" });
      return {
        columns: [T("order_no", "Order No", 12), T("date", "Date", 17), T("ship_name", "Customer", 20), T("pay_method", "Method", 12), T("pay_status", "Payment status", 16),
          T("total", "Amount", 11, "money"), T("status", "Order status", 16), T("razorpay_payment_id", "Razorpay payment ID", 24), T("razorpay_refund_id", "Razorpay refund ID", 24),
          T("refunded_at", "Refunded at", 17), T("refund_note", "Refund note", 30)],
        sql: `SELECT o.order_no, ${DT("o.created_at")} AS date, o.ship_name, o.pay_method, o.pay_status, o.total, o.status,
                ${opt("o", "orders", "razorpay_payment_id")}, ${opt("o", "orders", "razorpay_refund_id")}, ${opt("o", "orders", "refunded_at")}, ${opt("o", "orders", "refund_note")}
              FROM orders o ${c.where} ORDER BY o.id DESC`,
        params: c.params,
      };
    },
  },
  {
    id: "products", title: "Products & Stock", uses: "Koi filter nahi (hamesha poora catalogue)",
    desc: "SKU, naam, category, subcategory, variant, price, MRP, GST %, stock, status aur ab tak kitne bike. Variants wale product ki har variant alag row.",
    build() {
      return {
        columns: [T("sku", "SKU", 16), T("name", "Naam", 28), T("category", "Category", 12), T("subcategory", "Subcategory", 14), T("variant", "Variant", 16), T("price", "Price", 10, "money"), T("mrp", "MRP", 10, "money"), T("gst_percent", "GST %", 8, "int"),
          T("stock", "Stock", 8, "int"), T("status", "Status", 10), T("material", "Material", 18), T("colours", "Colours", 18), T("size", "Size", 14), T("weight_g", "Weight (g)", 11, "int"),
          T("sold", "Ab tak bike", 12, "int"), T("added", "Joda gaya", 12)],
        sql: `SELECT sku, name, category, subcategory, variant, price, mrp, gst_percent, stock, status, material, colours, size, weight_g, sold, added FROM (
                SELECT p.id AS pid, 0 AS vpos, p.sku, p.name, p.category, p.subcategory, '' AS variant, p.price, p.mrp, p.gst_percent, p.stock, p.status, p.material, p.colours, p.size, p.weight_g,
                  (SELECT COALESCE(SUM(oi.qty), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status NOT IN ${ORD_NOT_LIVE}) AS sold,
                  ${D("p.created_at")} AS added
                  FROM products p WHERE p.option_names IS NULL OR p.option_names = '[]'
                UNION ALL
                SELECT p.id, v.position + 1, v.sku, p.name, p.category, p.subcategory, v.label, v.price, v.mrp, p.gst_percent, v.stock,
                  CASE WHEN v.active = 1 THEN p.status ELSE 'Inactive' END, p.material, p.colours, p.size, p.weight_g,
                  (SELECT COALESCE(SUM(oi.qty), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.variant_id = v.id AND o.status NOT IN ${ORD_NOT_LIVE}),
                  ${D("p.created_at")}
                  FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.sku NOT LIKE '%~%'
              ) ORDER BY pid, vpos`,
        params: [],
      };
    },
  },
  {
    id: "return_details", title: "Return reasons (CR + RTO)", uses: "Date (return ki), Order status",
    desc: "Har returned item ek row: type (CR ya RTO), order, product, wajah, quality check, restock, refund kitna aur kaise.",
    build(f) {
      const c = cond(f, { date: "r.created_at", status: "o.status" });
      const c2 = cond(f, { date: "o.created_at", status: "o.status" });
      return {
        columns: [T("rid", "Return ID", 11), T("date", "Date", 12), T("type", "Type", 7), T("order_no", "Order No", 12), T("ship_name", "Customer", 20), T("product", "Product", 28),
          T("variant_label", "Variant", 16), T("qty", "Qty", 6, "int"), T("reason_code", "Reason code", 16), T("reason", "Reason", 40), T("status", "Status", 16),
          T("qc", "Quality check", 18), T("restocked", "Restocked qty", 12, "int"), T("refund_amount", "Refund (whole return)", 14, "money2"), T("refund_method", "Refund method", 14), T("refund_date", "Refund date", 12)],
        sql: `SELECT * FROM (
                SELECT r.id AS rid, ${D("r.created_at")} AS date, 'CR' AS type, o.order_no, o.ship_name, oi.name AS product, oi.variant_label, ri.qty, r.reason_code, r.reason, r.status,
                  ri.qc_result AS qc, ri.restock_qty AS restocked, r.refund_amount, r.refund_method, ${D("r.refunded_at")} AS refund_date
                FROM return_items ri JOIN returns r ON r.id = ri.return_id JOIN orders o ON o.id = r.order_id JOIN order_items oi ON oi.id = ri.order_item_id ${c.where}
                UNION ALL
                SELECT NULL, ${D("o.created_at")}, 'RTO', o.order_no, o.ship_name, oi.name, oi.variant_label, oi.qty, 'rto', COALESCE(o.ndr_reason, 'Delivery failed (RTO)'), o.status,
                  CASE o.rto_qc WHEN 'good' THEN 'good' WHEN 'damaged' THEN 'not_resellable' ELSE NULL END,
                  CASE WHEN o.rto_qc = 'good' THEN oi.qty ELSE 0 END, NULL, NULL, NULL
                FROM orders o JOIN order_items oi ON oi.order_id = o.id ${c2.where ? c2.where + " AND" : "WHERE"} o.rto_stage IS NOT NULL
              ) ORDER BY date DESC, rid DESC`,
        params: [...c.params, ...c2.params],
      };
    },
  },
  {
    id: "gst_register", title: "GST sales register (invoices)", uses: "Date (invoice ki), Order status, Payment status",
    desc: "Har invoice ek row: number, date, order, customer, state, taxable value, CGST, SGST, IGST, total. Accountant ke liye.",
    build(f) {
      const c = cond(f, { date: "i.issued_at", status: "o.status", pay: "o.pay_status" });
      return {
        columns: [T("no", "Invoice No", 18), T("date", "Date", 12), T("order_no", "Order No", 12), T("ship_name", "Customer", 20), T("state", "Place of supply", 16), T("tax_type", "Tax type", 12),
          T("taxable", "Taxable value", 13, "money2"), T("cgst", "CGST", 11, "money2"), T("sgst", "SGST", 11, "money2"), T("igst", "IGST", 11, "money2"), T("total", "Invoice total", 13, "money2"),
          T("pay_method", "Payment", 10), T("status", "Order status", 16)],
        sql: `SELECT i.no, ${D("i.issued_at")} AS date, o.order_no, o.ship_name, json_extract(i.data, '$.buyerState') AS state,
                CASE json_extract(i.data, '$.type') WHEN 'inter' THEN 'IGST' ELSE 'CGST + SGST' END AS tax_type,
                json_extract(i.data, '$.totals.taxable') AS taxable, json_extract(i.data, '$.totals.cgst') AS cgst, json_extract(i.data, '$.totals.sgst') AS sgst,
                json_extract(i.data, '$.totals.igst') AS igst, json_extract(i.data, '$.totals.total') AS total, o.pay_method, o.status
              FROM invoices i JOIN orders o ON o.id = i.order_id ${c.where} ORDER BY i.id`,
        params: c.params,
      };
    },
  },
  {
    id: "credit_notes", title: "Credit notes", uses: "Date (credit note ki), Order status",
    desc: "Har credit note ek row: number, invoice, order, wajah, taxable value, CGST, SGST, IGST, amount.",
    build(f) {
      const c = cond(f, { date: "n.issued_at", status: "o.status" });
      return {
        columns: [T("no", "Credit note No", 18), T("date", "Date", 12), T("invoice_no", "Against invoice", 18), T("order_no", "Order No", 12), T("ship_name", "Customer", 20), T("kind", "Type", 9), T("reason", "Reason", 36),
          T("taxable", "Taxable value", 13, "money2"), T("cgst", "CGST", 11, "money2"), T("sgst", "SGST", 11, "money2"), T("igst", "IGST", 11, "money2"), T("amount", "Amount", 13, "money2")],
        sql: `SELECT n.no, ${D("n.issued_at")} AS date, json_extract(n.data, '$.invoiceNo') AS invoice_no, o.order_no, o.ship_name, n.kind, n.reason,
                json_extract(n.data, '$.totals.taxable') AS taxable, json_extract(n.data, '$.totals.cgst') AS cgst, json_extract(n.data, '$.totals.sgst') AS sgst,
                json_extract(n.data, '$.totals.igst') AS igst, n.amount
              FROM credit_notes n JOIN orders o ON o.id = n.order_id ${c.where} ORDER BY n.id`,
        params: c.params,
      };
    },
  },
  {
    id: "subscribers", title: "Subscribers", uses: "Date (kab judey)",
    desc: "Newsletter / subscribers ki poori list (jo bhi columns database mein hain).",
    build(f) {
      const t = all("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%subscri%' ORDER BY name")[0]?.name;
      if (!t) return null;
      const cols = tableCols(t);
      const dateCol = ["created_at", "subscribed_at", "joined_at", "date"].find((c) => cols.includes(c));
      const c = cond(f, { date: dateCol ? `"${dateCol}"` : "" });
      return {
        columns: cols.map((n) => T(n, n, 22)),
        sql: `SELECT * FROM "${t}" ${c.where} ORDER BY 1 DESC`,
        params: c.params,
      };
    },
  },
];

export function runReport(id, f) {
  const def = REPORTS.find((r) => r.id === id);
  const b = def?.build(f);
  if (!b) return null;
  return { def, columns: b.columns, rows: all(b.sql, ...b.params) };
}

export function countReport(id, f) {
  const b = REPORTS.find((r) => r.id === id)?.build(f);
  if (!b) return null;
  return one(`SELECT COUNT(*) c FROM (${b.sql})`, ...b.params).c;
}
