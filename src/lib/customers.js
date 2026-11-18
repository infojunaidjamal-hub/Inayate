// Phase 8: Customer 360 ke helpers (sirf server par chalte hain).
import { all, one } from "@/lib/db";

export const MOBILE = /^[6-9]\d{9}$/;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const TAG = /^[\p{L}\p{N} _-]{1,20}$/u;
export const SUGGEST_TAGS = ["VIP", "COD risk", "Wholesale", "Repeat buyer"];
export const TABS = [["overview", "Overview"], ["orders", "Orders"], ["payments", "Payments"], ["returns", "Returns"], ["wallet", "Wallet"], ["notes", "Notes"]];

export const getCustomer = (id) => one("SELECT id, name, mobile, email, created_at, disabled FROM users WHERE id = ? AND role = 'buyer'", Number(id));

// Is customer ke orders (sabse naya pehle)
export const customerOrders = (id) =>
  all("SELECT id, order_no, created_at, status, total, pay_method, pay_status, razorpay_payment_id, razorpay_refund_id FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 200", id);

export const customerReturns = (id) =>
  all("SELECT r.id, r.status, r.stage, r.reason, r.created_at, o.order_no FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.user_id = ? ORDER BY r.id DESC LIMIT 100", id);

export const customerTags = (id) => all("SELECT tag FROM customer_tags WHERE user_id = ? ORDER BY tag", id).map((r) => r.tag);
export const customerNotes = (id) => all("SELECT * FROM customer_notes WHERE user_id = ? ORDER BY id DESC LIMIT 100", id);

// Wallet abhi banne ki halat mein hai. Table na ho to bhi page chalta rahe.
export function customerWallet(id) {
  try {
    const rows = all("SELECT * FROM wallet_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 200", id);
    const balance = one("SELECT COALESCE(SUM(amount), 0) AS b FROM wallet_ledger WHERE user_id = ?", id)?.b || 0;
    return { rows, balance };
  } catch {
    return { rows: [], balance: 0 };
  }
}

export function customerStats(id) {
  const o = one(
    `SELECT COUNT(*) AS orders,
            COALESCE(SUM(CASE WHEN pay_status IN ('Paid') AND status NOT IN ('Cancelled','RTO','RTO Done','Refunded') THEN total ELSE 0 END), 0) AS spent,
            SUM(CASE WHEN pay_method = 'COD' THEN 1 ELSE 0 END) AS cod,
            MAX(created_at) AS last_at
     FROM orders WHERE user_id = ?`, id) || {};
  const r = one("SELECT COUNT(*) AS n FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.user_id = ?", id)?.n || 0;
  return { orders: o.orders || 0, spent: o.spent || 0, cod: o.cod || 0, last_at: o.last_at || "", returns: r };
}

// Date + time (IST): ab lib/format.js mein hai (purane imports chalte rahein, isliye yahan se bhi mil jata hai)
export { fmtDateTime } from "@/lib/format";
