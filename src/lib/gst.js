// GST ka hisaab (sirf hisaab, database ya server ki koi cheez nahi, isliye kahin bhi chal sakta hai).
// Maan ke chala gaya hai: product ka price GST SAMET (inclusive) hota hai. Isliye taxable = price / (1 + GST%).
// Sab kuch paise (integer) mein hota hai, taaki 1 paise ka farak na aaye.

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const paise = (rupees) => Math.round(Number(rupees) * 100);
const rs = (p) => p / 100;

// ---- state ----
const ALIAS = { orissa: "odisha", uttaranchal: "uttarakhand", newdelhi: "delhi", nctofdelhi: "delhi", pondicherry: "puducherry", bangalore: "karnataka" };
export const normState = (s) => {
  const k = String(s || "").toLowerCase().replace(/[^a-z]/g, "");
  return ALIAS[k] || k;
};
// "12 Sample Society, Dindholi, Surat, Gujarat 394310" -> "Gujarat"
export function stateOfAddress(addr) {
  const parts = String(addr || "").split(",");
  return (parts[parts.length - 1] || "").replace(/\b\d{6}\b/g, "").trim();
}
// Seller aur buyer ka state ek hai to CGST + SGST, alag hai to IGST. State pata na chale to CGST + SGST maante hain.
export function taxTypeOf(sellerState, buyerState) {
  const a = normState(sellerState), b = normState(buyerState);
  if (!a || !b) return { type: "intra", known: false };
  return { type: a === b ? "intra" : "inter", known: true };
}

// ---- financial year ----
// "2026-11-03 10:00:00" (UTC) -> "26-27". April se March.
export function fyOf(dateStr) {
  const d = dateStr ? new Date(String(dateStr).replace(" ", "T") + (String(dateStr).includes("Z") ? "" : "Z")) : new Date();
  const ist = new Date((isNaN(d) ? Date.now() : d.getTime()) + 330 * 60000);
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth() + 1;
  const a = m >= 4 ? y : y - 1;
  return `${String(a).slice(2)}-${String(a + 1).slice(2)}`;
}
export const docNo = (prefix, fy, seq) => `${prefix}/${fy}/${String(seq).padStart(4, "0")}`;

// ---- ek line ka tax ----
// netP = us line ki GST samet rakam (paise). rate = GST %.
function taxLine({ name, hsn = "", qty = 1, rate, netP, type, sku = "", note = "" }) {
  const taxableP = Math.round((netP * 100) / (100 + rate));
  const taxP = netP - taxableP;
  const cgstP = type === "intra" ? Math.floor(taxP / 2) : 0;
  const sgstP = type === "intra" ? taxP - cgstP : 0;
  const igstP = type === "inter" ? taxP : 0;
  return { name, hsn, sku, note, qty, rate, taxableP, cgstP, sgstP, igstP, totalP: netP };
}

// Items (order ke) se invoice / credit note ki lines.
//  items: [{ name, hsn, gst, qty, unit (ek piece, GST samet, rupaye), sku, note }]  <- sirf wahi jo is document mein hain
//  order: { subtotal, coupon_discount, online_discount }  <- poore order ka (discount ka hissa nikalne ke liye)
//  chargesP: shipping + COD fee (paise) jo is document mein shamil hai (0 = nahi)
// Discount (coupon + online) items par unki keemat ke hisaab se baant diya jata hai; tax discount ke BAAD ki rakam par lagta hai.
export function computeDoc({ items, order, chargesP = 0, type }) {
  const gross = items.map((i) => paise(i.unit) * i.qty);
  const sumG = gross.reduce((a, b) => a + b, 0);
  const orderG = paise(order.subtotal) || sumG;
  const orderD = paise(order.coupon_discount || 0) + paise(order.online_discount || 0);
  const disc = orderG > 0 ? Math.min(sumG, Math.round((orderD * sumG) / orderG)) : 0;
  let left = disc;
  const lines = items.map((it, k) => {
    const share = k === items.length - 1 ? left : Math.round((disc * gross[k]) / (sumG || 1));
    left -= share;
    return taxLine({ name: it.name, hsn: it.hsn, sku: it.sku, note: it.note, qty: it.qty, rate: Number(it.gst) || 0, netP: Math.max(0, gross[k] - share), type });
  });
  if (chargesP > 0) {
    const rate = items.length ? Math.max(...items.map((i) => Number(i.gst) || 0)) : 0; // shipping par wahi GST jo maal par (sabse zyada wala)
    lines.push(taxLine({ name: "Shipping & handling", hsn: "", qty: 1, rate, netP: chargesP, type }));
  }
  const sum = (k) => lines.reduce((a, l) => a + l[k], 0);
  const totals = { taxable: rs(sum("taxableP")), cgst: rs(sum("cgstP")), sgst: rs(sum("sgstP")), igst: rs(sum("igstP")), total: rs(sum("totalP")), discount: rs(disc) };
  return {
    type,
    lines: lines.map((l) => ({ name: l.name, hsn: l.hsn, sku: l.sku, note: l.note, qty: l.qty, rate: l.rate, taxable: rs(l.taxableP), cgst: rs(l.cgstP), sgst: rs(l.sgstP), igst: rs(l.igstP), total: rs(l.totalP) })),
    totals,
  };
}

// Poore order ka invoice
export function buildInvoiceData({ order, items, sellerState }) {
  const buyerState = stateOfAddress(order.ship_address);
  const t = taxTypeOf(sellerState, buyerState);
  const doc = computeDoc({
    items: items.map((i) => ({ name: i.name + (i.variant_label ? ` (${i.variant_label})` : ""), hsn: i.hsn || "", gst: i.gst, qty: i.qty, unit: i.price, sku: i.sku || "" })),
    order,
    chargesP: paise(order.shipping || 0) + paise(order.cod_fee || 0),
    type: t.type,
  });
  return { v: 1, ...doc, stateKnown: t.known, sellerState, buyerState, buyer: { name: order.ship_name, address: order.ship_address, mobile: order.ship_mobile }, orderNo: order.order_no };
}

// Return / cancel / RTO ka credit note.  sel: [{ item (order_items row + gst + hsn), qty }]
export function buildCreditData({ order, sel, withCharges, sellerState }) {
  const buyerState = stateOfAddress(order.ship_address);
  const t = taxTypeOf(sellerState, buyerState);
  const doc = computeDoc({
    items: sel.map(({ item: i, qty }) => ({ name: i.name + (i.variant_label ? ` (${i.variant_label})` : ""), hsn: i.hsn || "", gst: i.gst, qty, unit: i.price, sku: i.sku || "" })),
    order,
    chargesP: withCharges ? paise(order.shipping || 0) + paise(order.cod_fee || 0) : 0,
    type: t.type,
  });
  return { v: 1, ...doc, stateKnown: t.known, sellerState, buyerState, buyer: { name: order.ship_name, address: order.ship_address, mobile: order.ship_mobile }, orderNo: order.order_no };
}
