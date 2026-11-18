// Checkout settings + price maths. Pure code (no database, no cookies), so the
// checkout page (browser) and placeOrder (server) use the SAME rules.
// The server always recomputes the price; the browser only shows a preview.
import { SITE } from "@/lib/site";

export const CHECKOUT = {
  // fee: null  => uses the free-shipping rule in lib/site.js (free above SITE.freeShippingAbove, else SITE.shippingFee)
  // enabled: false hides an option
  shipping: [
    { id: "standard", name: "Standard Delivery", days: SITE.deliveryDays, fee: 0 },       // sab ko free (Phase 4)
    { id: "express", name: "Express Delivery", days: "faster delivery", fee: 199, enabled: true }, // sirf jahan Express partner pahunchta ho
  ],
  onlineDiscountPercent: 5, // % off when paying online (0 = off)
  onlineDiscountMax: 300,   // cap in rupees
  codFee: 0,                // buyer se COD fee nahi (courier ka COD fee seller deta hai). 0 = off
  noteMax: 300,             // max characters in the order note

  // Coupon codes (UPPERCASE). Use either percent or flat.
  // min = minimum cart value, max = cap on discount, oncePerUser = one use per customer
  // These two are SAMPLES. Edit or delete them before going live.
  coupons: {
    WELCOME10: { label: "10% off", percent: 10, max: 300, min: 999, oncePerUser: true },
    FLAT100: { label: "Rs 100 off", flat: 100, min: 799, oncePerUser: false },
  },
};

export { inr as rupees } from "@/lib/money"; // ek hi jagah: lib/money.js

export const shipOptions = () => CHECKOUT.shipping.filter((s) => s.enabled !== false);
export const shipOption = (id) => shipOptions().find((s) => s.id === id) || null;
export const shipLabel = (id) => CHECKOUT.shipping.find((s) => s.id === id)?.name || "Standard Delivery";

export function findCoupon(code) {
  const c = String(code || "").trim().toUpperCase();
  const d = CHECKOUT.coupons[c];
  return d ? { code: c, ...d } : null;
}

function couponValue(c, subtotal) {
  if (!c || subtotal < (c.min || 0)) return 0;
  const v = c.flat ?? Math.round((subtotal * c.percent) / 100);
  return Math.max(0, Math.min(v, c.max ?? v, subtotal));
}

export function priceOrder({ subtotal, ship = "standard", pay = "online", coupon = null }) {
  const opt = shipOption(ship) || shipOptions()[0];
  // keep this rule the same as shippingFor() in lib/cart.js
  const shipping = opt.fee == null ? (subtotal === 0 || subtotal >= SITE.freeShippingAbove ? 0 : SITE.shippingFee) : opt.fee;
  const couponDiscount = couponValue(coupon, subtotal);
  const afterCoupon = subtotal - couponDiscount;
  const onlineDiscount = pay === "online" ? Math.min(Math.round((afterCoupon * CHECKOUT.onlineDiscountPercent) / 100), CHECKOUT.onlineDiscountMax) : 0;
  const codFee = pay === "cod" ? CHECKOUT.codFee : 0;
  const total = Math.max(1, subtotal + shipping + codFee - couponDiscount - onlineDiscount);
  return { shipId: opt.id, shipping, codFee, couponDiscount, onlineDiscount, total };
}
