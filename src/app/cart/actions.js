"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one } from "@/lib/db";
import { readCart, saveCart, getCartSnapshot, MAX_QTY } from "@/lib/cart";

async function add(id) {
  const p = one("SELECT id, stock FROM products WHERE id = ? AND status = 'Active'", id);
  if (!p || p.stock <= 0) return false;
  const cart = await readCart();
  const it = cart.find((x) => x.id === id);
  if (it) it.qty = Math.min(it.qty + 1, p.stock, MAX_QTY);
  else cart.push({ id, qty: 1 });
  await saveCart(cart);
  return true;
}

export async function addToCart(form) {
  await add(Number(form.get("id")));
  redirect("/cart");
}

export async function buyNow(form) {
  await add(Number(form.get("id")));
  redirect("/checkout");
}

export async function changeQty(form) {
  const id = Number(form.get("id"));
  const delta = Number(form.get("delta"));
  const p = one("SELECT stock FROM products WHERE id = ?", id);
  const cart = await readCart();
  const it = cart.find((x) => x.id === id);
  if (it && p) {
    it.qty = Math.min(it.qty + delta, p.stock, MAX_QTY);
    await saveCart(cart.filter((x) => x.qty > 0));
  }
  revalidatePath("/", "layout");
}

export async function removeItem(form) {
  const id = Number(form.get("id"));
  await saveCart((await readCart()).filter((x) => x.id !== id));
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

export async function cartAdd(id) {
  const pid = toId(id);
  const ok = pid ? await add(pid) : false;
  return { ...(await getCartSnapshot()), error: ok ? null : "Sorry, this item is out of stock." };
}

export async function cartChange(id, delta) {
  const pid = toId(id);
  const step = Math.sign(Number(delta)) || 0; // only -1, 0 or +1 is ever allowed
  if (pid && step) {
    const p = one("SELECT stock FROM products WHERE id = ? AND status = 'Active'", pid);
    const cart = await readCart();
    const it = cart.find((x) => x.id === pid);
    if (it) {
      it.qty = p ? Math.min(it.qty + step, p.stock, MAX_QTY) : 0;
      await saveCart(cart.filter((x) => x.qty > 0));
    }
  }
  return getCartSnapshot();
}

export async function cartRemove(id) {
  const pid = toId(id);
  if (pid) await saveCart((await readCart()).filter((x) => x.id !== pid));
  return getCartSnapshot();
}
