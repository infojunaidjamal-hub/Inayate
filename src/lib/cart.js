// Cart: browser ki cookie mein save hota hai (login ke bina bhi chalta hai)
import { cookies } from "next/headers";
import { all } from "@/lib/db";
import { SITE } from "@/lib/site";
import { withCovers } from "@/lib/images";
import { hasVariants } from "@/lib/catalog";

const NAME = "maison_cart";
const MAX_QTY = 10;

export async function readCart() {
  try {
    const raw = (await cookies()).get(NAME)?.value;
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list)
      ? list.filter((x) => Number.isInteger(x?.id) && Number.isInteger(x?.qty) && x.qty > 0 && (x.v == null || Number.isInteger(x.v)))
      : [];
  } catch {
    return [];
  }
}

export async function saveCart(items) {
  (await cookies()).set(NAME, JSON.stringify(items), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearCart() {
  (await cookies()).delete(NAME);
}

// Cart ki ek line ki pehchan: "product:variant" (variant na ho to 0)
export const keyOf = (id, v) => `${id}:${v || 0}`;
export function parseKey(key) {
  const [a, b] = String(key ?? "").split(":");
  const id = Number(a), v = Number(b || 0);
  return Number.isInteger(id) && id > 0 && Number.isInteger(v) && v >= 0 ? { id, v: v || null } : null;
}

export const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= SITE.freeShippingAbove ? 0 : SITE.shippingFee);
export { MAX_QTY };

// Cart ki poori detail: products (variant ke saath), quantity, total
export async function getCart() {
  const raw = await readCart();
  const empty = { items: [], count: 0, subtotal: 0, shipping: 0, total: 0, hasSoldOut: false };
  if (!raw.length) return empty;
  const ids = [...new Set(raw.map((x) => x.id))];
  const rows = withCovers(all(
    `SELECT * FROM products WHERE status = 'Active' AND id IN (${ids.map(() => "?").join(",")})`,
    ...ids
  ));
  const vids = [...new Set(raw.map((x) => x.v).filter(Boolean))];
  const vrows = vids.length ? all(`SELECT * FROM product_variants WHERE active = 1 AND id IN (${vids.map(() => "?").join(",")})`, ...vids) : [];
  const items = [];
  const seen = new Set();
  for (const r of raw) {
    const p = rows.find((x) => x.id === r.id);
    if (!p) continue;
    let v = null;
    if (hasVariants(p)) {
      v = vrows.find((x) => x.id === r.v && x.product_id === p.id);
      if (!v) continue; // variant hat gaya ya band hai
    }
    const key = keyOf(p.id, v?.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const eff = v
      ? { price: v.price, mrp: v.mrp, stock: v.stock, label: v.label, sku: v.sku, image: v.image || p.image }
      : { price: p.price, mrp: p.mrp, stock: p.stock, label: null, sku: p.sku, image: p.image };
    // stock zero wala item cart mein rehta hai (baad ke liye), par uska paisa nahi judta aur checkout nahi hota
    const soldOut = eff.stock <= 0;
    const qty = soldOut ? Math.min(r.qty, MAX_QTY) : Math.min(r.qty, eff.stock, MAX_QTY);
    items.push({
      p, v, key, vid: v ? v.id : null, label: eff.label, sku: eff.sku, image: eff.image,
      name: eff.label ? `${p.name} (${eff.label})` : p.name,
      price: eff.price, mrp: eff.mrp, stock: eff.stock, qty, soldOut, line: soldOut ? 0 : eff.price * qty,
    });
  }
  const subtotal = items.reduce((s, i) => s + i.line, 0);
  const shipping = shippingFor(subtotal);
  return {
    items, count: items.reduce((s, i) => s + i.qty, 0), subtotal, shipping, total: subtotal + shipping,
    hasSoldOut: items.some((i) => i.soldOut),
  };
}

// Small, serialisable version of the cart for client components (cart drawer).
// Prices always come from the database here, the browser never sends a price.
export async function getCartSnapshot() {
  const c = await getCart();
  return {
    items: c.items.map((i) => ({
      id: i.p.id,
      key: i.key,
      vid: i.vid,
      name: i.name,
      price: i.price,
      image: i.image || null,
      colourMain: i.p.colour_main,
      colourDark: i.p.colour_dark,
      qty: i.qty,
      line: i.line,
      stock: i.stock,
      soldOut: i.soldOut,
      max: i.soldOut ? 0 : Math.min(i.stock, MAX_QTY),
    })),
    count: c.count,
    hasSoldOut: c.hasSoldOut,
    subtotal: c.subtotal,
    shipping: c.shipping,
    total: c.total,
    rule: { freeAbove: SITE.freeShippingAbove, fee: SITE.shippingFee },
  };
}
