// Phase 7: dukaan par shoppers ne kya kiya (bina naam, phone ya IP ke). SIRF SERVER par chalta hai.
// Har visitor ko ek random id milti hai (cookie ib_vid). Ye kisi customer account se juda nahi hota.
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { run, one } from "@/lib/db";

// "checkout_line" andar ka event hai (har product ke funnel ke liye), seller ko alag se nahi dikhta.
export const EVENTS = ["impression", "product_view", "add_to_cart", "buy_now", "checkout_started", "payment_failed", "purchase"];
export const EVENT_INFO = {
  impression: "A product card was shown on a list",
  product_view: "A product page was opened",
  add_to_cart: "An item was added to the cart",
  buy_now: "Buy now was pressed",
  checkout_started: "The checkout page was opened",
  payment_failed: "An online payment did not go through",
  purchase: "An order was placed",
};
const COOKIE = "ib_vid";
const VID = /^v_[0-9a-f]{12}$/;

// Visitor ki random id. create=true ho to nayi bana kar cookie mein rakhta hai (sirf server action ya route mein chalta hai).
export async function visitorId({ create = false } = {}) {
  try {
    const c = await cookies();
    const have = c.get(COOKIE)?.value;
    if (have && VID.test(have)) return have;
    if (!create) return null;
    const v = "v_" + randomBytes(6).toString("hex");
    c.set(COOKIE, v, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 3600, secure: process.env.NODE_ENV === "production" });
    return v;
  } catch {
    return null;
  }
}

// Ek event likhta hai. Kabhi error nahi phenkta (tracking se dukaan nahi rukni chahiye).
export function logEvent(event, { product_id = null, variant_id = null, order_id = null, value = null, visitor = null } = {}) {
  try {
    if (!EVENTS.includes(event) && event !== "checkout_line") return;
    if ((event === "purchase" || event === "payment_failed") && order_id && one("SELECT 1 x FROM shop_events WHERE event = ? AND order_id = ? LIMIT 1", event, order_id)) return;
    run("INSERT INTO shop_events (event, visitor, product_id, variant_id, order_id, value) VALUES (?,?,?,?,?,?)", event, visitor, product_id, variant_id, order_id, value);
    if (Math.random() < 0.002) run("DELETE FROM shop_events WHERE ts < datetime('now', '-400 days')"); // purana data saaf
  } catch (e) {
    console.error("logEvent:", e);
  }
}

// Server action ke andar se: visitor ki id ke saath event
export async function trackServer(event, data = {}) {
  logEvent(event, { ...data, visitor: await visitorId({ create: true }) });
}
