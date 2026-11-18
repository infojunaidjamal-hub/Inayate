// Returns ka hisaab: kaun sa item, refund kitna, refund kahan jayega. SIRF SERVER par chalta hai.
import { all, one } from "@/lib/db";
import { buildCreditData, round2 } from "@/lib/gst";
import { business, itemsWithTax } from "@/lib/invoices";

// Rule badalna ho to sirf yahan badlo.
export const RETURN_RULES = {
  // Poora order in wajah se wapas aaye to shipping aur COD fee bhi wapas (seller ki galti). Baaki wajah mein sirf maal ka paisa.
  chargesBackFor: ["damaged", "wrong_item", "quality"],
  refundAfterQc: true, // refund se pehle quality check zaroori (seller "bina quality check ke" bhi kar sakta hai, note ke saath)
};

export const REJECT_REASONS = [
  "Return window is over",
  "Item looks used, washed or damaged by the buyer",
  "Photos do not show the problem",
  "Different item sent back",
  "Not eligible for return",
  "Other",
];

export const DESTS = [
  ["original", "Original payment method", "Wapas usi UPI / card / netbanking mein"],
  ["wallet", "Inayate Bags wallet", "Store credit, turant milta hai"],
  ["upi", "Different UPI ID", "Aapke bataye UPI par"],
  ["bank", "Bank account", "Aapke bataye bank account mein"],
];
export const destLabel = (d) => (DESTS.find((x) => x[0] === d) || [])[1] || d || "-";
// COD order mein "original" nahi hota (koi card / UPI nahi jisme wapas jaye)
export const destsFor = (o) => DESTS.filter(([c]) => (c === "original" ? o.pay_method !== "COD" && !!o.razorpay_payment_id : true));

/* ---------- items ---------- */
export const returnItems = (returnId) =>
  all(
    `SELECT ri.*, oi.name, oi.price, oi.variant_label, oi.sku, oi.product_id, oi.variant_id, oi.qty AS bought
     FROM return_items ri JOIN order_items oi ON oi.id = ri.order_item_id WHERE ri.return_id = ? ORDER BY ri.id`,
    returnId
  );

// Refund kitna banta hai (credit note ki rakam wahi hoti hai)
export function refundPreview(o, ret) {
  const items = itemsWithTax(o.id);
  const picked = returnItems(ret.id).map((r) => ({ item: items.find((i) => i.id === r.order_item_id), qty: r.qty })).filter((s) => s.item);
  const allBack = items.every((i) => (picked.find((p) => p.item.id === i.id)?.qty || 0) >= i.qty);
  const withCharges = allBack && RETURN_RULES.chargesBackFor.includes(ret.reason_code);
  const doc = buildCreditData({ order: o, sel: picked, withCharges, sellerState: business().state });
  return { gross: round2(doc.totals.total), goods: round2(doc.totals.total - (withCharges ? Number(o.shipping || 0) + Number(o.cod_fee || 0) : 0)), withCharges, allBack, doc };
}

// Order ka kitna paisa abhi wapas kiya ja sakta hai
export function remainingRefundable(o) {
  if (o.pay_status === "Refunded") return 0;
  const done = one("SELECT COALESCE(SUM(amount), 0) s FROM refunds WHERE order_id = ?", o.id).s;
  return Math.max(0, round2(Number(o.total) - done));
}

/* ---------- buyer ka refund ka chunav: check ---------- */
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export function checkDest(o, form) {
  const dest = String(form.get("dest") || "");
  if (!destsFor(o).some(([c]) => c === dest)) return { error: "Refund ka tarika chuniye." };
  if (dest === "upi") {
    const upi = String(form.get("upi") || "").trim();
    if (!UPI_RE.test(upi)) return { error: "Sahi UPI ID likhein (jaise naam@upi)." };
    return { dest, upi };
  }
  if (dest === "bank") {
    const holder = String(form.get("holder") || "").trim().slice(0, 80);
    const account = String(form.get("account") || "").replace(/\s/g, "");
    const ifsc = String(form.get("ifsc") || "").trim().toUpperCase();
    if (holder.length < 3) return { error: "Account holder ka naam likhein." };
    if (!/^\d{9,18}$/.test(account)) return { error: "Account number 9 se 18 ank ka hona chahiye." };
    if (!IFSC_RE.test(ifsc)) return { error: "Sahi IFSC code likhein (jaise SBIN0001234)." };
    return { dest, bank: JSON.stringify({ holder, account, ifsc }) };
  }
  return { dest };
}
export const maskAccount = (a) => { const s = String(a || ""); return s.length > 4 ? "•••• " + s.slice(-4) : s; };
