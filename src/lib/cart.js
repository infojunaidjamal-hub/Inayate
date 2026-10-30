// Cart: browser ki cookie mein save hota hai (login ke bina bhi chalta hai)
import { cookies } from "next/headers";
import { all } from "@/lib/db";
import { SITE } from "@/lib/site";
import { withCovers } from "@/lib/images";

const NAME = "maison_cart";
const MAX_QTY = 10;

export async function readCart() {
  try {
    const raw = (await cookies()).get(NAME)?.value;
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list.filter((x) => Number.isInteger(x?.id) && Number.isInteger(x?.qty) && x.qty > 0) : [];
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

export const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= SITE.freeShippingAbove ? 0 : SITE.shippingFee);
export { MAX_QTY };

// Cart ki poori detail: products, quantity, total
export async function getCart() {
  const raw = await readCart();
  const empty = { items: [], count: 0, subtotal: 0, shipping: 0, total: 0 };
  if (!raw.length) return empty;
  const ids = raw.map((x) => x.id);
  const rows = withCovers(all(
    `SELECT * FROM products WHERE status = 'Active' AND id IN (${ids.map(() => "?").join(",")})`,
    ...ids
  ));
  const items = [];
  for (const r of raw) {
    const p = rows.find((x) => x.id === r.id);
    if (!p || p.stock <= 0) continue;
    const qty = Math.min(r.qty, p.stock, MAX_QTY);
    items.push({ p, qty, line: p.price * qty });
  }
  const subtotal = items.reduce((s, i) => s + i.line, 0);
  const shipping = shippingFor(subtotal);
  return { items, count: items.reduce((s, i) => s + i.qty, 0), subtotal, shipping, total: subtotal + shipping };
}

// Small, serialisable version of the cart for client components (cart drawer).
// Prices always come from the database here, the browser never sends a price.
export async function getCartSnapshot() {
  const c = await getCart();
  return {
    items: c.items.map(({ p, qty, line }) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image || null,
      colourMain: p.colour_main,
      colourDark: p.colour_dark,
      qty,
      line,
      stock: p.stock,
      max: Math.min(p.stock, MAX_QTY),
    })),
    count: c.count,
    subtotal: c.subtotal,
    shipping: c.shipping,
    total: c.total,
    rule: { freeAbove: SITE.freeShippingAbove, fee: SITE.shippingFee },
  };
}
