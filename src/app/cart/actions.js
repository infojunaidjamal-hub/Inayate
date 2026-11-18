"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one } from "@/lib/db";
import { readCart, saveCart, getCartSnapshot, MAX_QTY, parseKey } from "@/lib/cart";
import { hasVariants } from "@/lib/catalog";
import { trackServer } from "@/lib/track";

// Stock: variant wale product ka stock variant se aata hai
function stockOf(id, vid) {
  const p = one("SELECT id, stock, option_names FROM products WHERE id = ? AND status = 'Active'", id);
  if (!p) return null;
  if (!hasVariants(p)) return { stock: p.stock, v: null };
  const v = vid ? one("SELECT id, stock FROM product_variants WHERE id = ? AND product_id = ? AND active = 1", vid, id) : null;
  return v ? { stock: v.stock, v: v.id } : null;
}
const same = (x, id, v) => x.id === id && (x.v || null) === (v || null);

async function add(id, vid = null, ev = "add_to_cart") {
  const s = stockOf(id, vid);
  if (!s) return false; // stock zero ho tab bhi cart mein ja sakta hai, bas checkout nahi hoga
  const cart = await readCart();
  const it = cart.find((x) => same(x, id, s.v));
  if (it) it.qty = Math.min(it.qty + 1, Math.max(s.stock, 1), MAX_QTY);
  else cart.push(s.v ? { id, v: s.v, qty: 1 } : { id, qty: 1 });
  await saveCart(cart);
  await trackServer(ev, { product_id: id, variant_id: s.v }); // Insights
  return true;
}

const toVid = (x) => { const n = Number(x); return Number.isInteger(n) && n > 0 ? n : null; };

export async function addToCart(form) {
  await add(Number(form.get("id")), toVid(form.get("v")));
  redirect("/cart");
}

export async function buyNow(form) {
  await add(Number(form.get("id")), toVid(form.get("v")), "buy_now");
  redirect("/checkout");
}

// key = "product:variant" (cart ki line ki pehchan)
export async function changeQty(form) {
  const k = parseKey(form.get("key"));
  const delta = Number(form.get("delta"));
  if (k) {
    const s = stockOf(k.id, k.v);
    const cart = await readCart();
    const it = cart.find((x) => same(x, k.id, k.v));
    if (it && s) {
      it.qty = Math.min(it.qty + delta, Math.max(s.stock, 1), MAX_QTY);
      await saveCart(cart.filter((x) => x.qty > 0));
    }
  }
  revalidatePath("/", "layout");
}

export async function removeItem(form) {
  const k = parseKey(form.get("key"));
  if (k) await saveCart((await readCart()).filter((x) => !same(x, k.id, k.v)));
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------
// Cart drawer actions: plain arguments in, fresh cart snapshot out.
// No redirect, so the page the shopper is on stays exactly as it is.
// Every input is validated here because server actions are public POST endpoints.
// ---------------------------------------------------------------
const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export async function cartSnapshot() {
  return getCartSnapshot();
}

export async function cartAdd(id, vid) {
  const pid = toId(id);
  const ok = pid ? await add(pid, toVid(vid)) : false;
  return { ...(await getCartSnapshot()), error: ok ? null : "Sorry, this item is not available." };
}

export async function cartChange(key, delta) {
  const k = parseKey(key);
  const step = Math.sign(Number(delta)) || 0; // only -1, 0 or +1 is ever allowed
  if (k && step) {
    const s = stockOf(k.id, k.v);
    const cart = await readCart();
    const it = cart.find((x) => same(x, k.id, k.v));
    if (it) {
      it.qty = s ? Math.min(it.qty + step, Math.max(s.stock, 1), MAX_QTY) : 0;
      await saveCart(cart.filter((x) => x.qty > 0));
    }
  }
  return getCartSnapshot();
}

export async function cartRemove(key) {
  const k = parseKey(key);
  if (k) await saveCart((await readCart()).filter((x) => !same(x, k.id, k.v)));
  return getCartSnapshot();
}
