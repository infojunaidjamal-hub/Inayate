// Client-safe cart maths (no server imports), used for instant optimistic updates in the cart drawer.
// The server (lib/cart.js) stays the source of truth: its snapshot always replaces these numbers.
export function totalsOf(items, rule) {
  const subtotal = items.reduce((s, i) => s + (i.soldOut ? 0 : i.price * i.qty), 0); // sold-out item ka paisa nahi judta
  const count = items.reduce((n, i) => n + i.qty, 0);
  const shipping = subtotal === 0 || subtotal >= rule.freeAbove ? 0 : rule.fee;
  return { count, subtotal, shipping, total: subtotal + shipping };
}
