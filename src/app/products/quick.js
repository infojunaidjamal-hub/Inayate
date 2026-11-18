"use server";
import { revalidatePath } from "next/cache";
import { one } from "@/lib/db";
import { readCart, saveCart, MAX_QTY } from "@/lib/cart";
import { hasVariants } from "@/lib/catalog";

// Shop page ke card se "cart mein daalo" (page badle bina)
export async function quickAdd(id) {
  id = Number(id);
  const p = one("SELECT id, stock, option_names FROM products WHERE id = ? AND status = 'Active'", id);
  if (p && hasVariants(p)) return { ok: false, msg: "Pehle colour / size chuniye" };
  if (!p || p.stock <= 0) return { ok: false, msg: "Out of stock" };
  const cart = await readCart();
  const it = cart.find((x) => x.id === id);
  const max = Math.min(p.stock, MAX_QTY);
  if (it) {
    if (it.qty >= max) return { ok: false, msg: "Itni quantity hi mil sakti hai" };
    it.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  await saveCart(cart);
  revalidatePath("/", "layout"); // header ka cart number badle
  return { ok: true, msg: "Cart mein add ho gaya" };
}
