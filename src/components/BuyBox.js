"use client";
import { useState } from "react";
import { addToCart, buyNow } from "@/app/cart/actions";
import { inr } from "@/lib/money";
import { useCart } from "./CartProvider";

// Sticky "Add to cart / Buy" bar of the product page.
// Add to cart: adds in the background and opens the cart drawer (no page change).
// Without JavaScript, the same button falls back to the old server action + redirect.
export default function BuyBox({ id, out, price }) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);

  async function onAdd(e) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    try { await addItem(id); } finally { setAdding(false); }
  }

  return (
    <form className="pp-buy">
      <input type="hidden" name="id" value={id} />
      <button formAction={addToCart} onClick={onAdd} disabled={out || adding} aria-busy={adding}>
        {adding ? "Adding…" : "Add to cart"}
      </button>
      <button formAction={buyNow} disabled={out} className="go">{out ? "Out of stock" : `Buy at ${inr(price)}`}</button>
    </form>
  );
}
