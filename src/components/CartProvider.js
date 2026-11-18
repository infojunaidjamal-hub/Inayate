"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cartAdd, cartChange, cartRemove, cartSnapshot } from "@/app/cart/actions";
import { totalsOf } from "@/lib/cartMath";

// One place that owns the cart state for the whole site.
// The layout only passes the item count (cheap, from the cookie), the full cart is
// fetched when the drawer opens, and every action returns a fresh snapshot.
const Ctx = createContext(null);

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}

const empty = (count = 0) => ({ loaded: false, items: [], count, subtotal: 0, shipping: 0, total: 0, rule: null });

export default function CartProvider({ initialCount = 0, children }) {
  const [cart, setCart] = useState(() => empty(initialCount));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inflight = useRef(0);
  const pathname = usePathname();

  // The layout re-renders with a new count whenever a server action touches the cart cookie
  // (or the /cart page changes something). If it disagrees with what we hold, drop our copy.
  useEffect(() => setCart((c) => (c.loaded && c.count === initialCount ? c : empty(initialCount))), [initialCount]);
  // Close the drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const apply = useCallback(({ error: err, ...snap }) => {
    setCart({ loaded: true, ...snap });
    setError(err || "");
  }, []);

  // Runs one server action. Server actions are queued by Next.js, so the LAST response is the
  // truth; earlier responses are ignored to avoid the numbers flickering back while clicking fast.
  const run = useCallback(async (action) => {
    inflight.current += 1;
    setBusy(true);
    try {
      const snap = await action();
      if (inflight.current === 1) apply(snap);
    } catch {
      setError("Something went wrong. Please try again.");
      try { apply(await cartSnapshot()); } catch {}
    } finally {
      inflight.current -= 1;
      if (inflight.current === 0) setBusy(false);
    }
  }, [apply]);

  // Safety net: the drawer is open but has no data (it was reset above) -> fetch it.
  useEffect(() => {
    if (open && !cart.loaded && inflight.current === 0) run(cartSnapshot);
  }, [open, cart.loaded, run]);

  const openCart = useCallback(() => { setError(""); setOpen(true); run(cartSnapshot); }, [run]);
  const closeCart = useCallback(() => setOpen(false), []);
  const refresh = useCallback(() => run(cartSnapshot), [run]); // checkout page: taaza cart lao

  const addItem = useCallback(async (id, vid) => {
    setError("");
    await run(() => cartAdd(id, vid));
    setOpen(true);
  }, [run]);

  // Optimistic: the screen updates instantly, the server answer then replaces it.
  const optimistic = (fn) => setCart((c) => {
    if (!c.loaded) return c;
    const items = fn(c.items);
    return { ...c, items, ...totalsOf(items, c.rule) };
  });

  const changeQty = useCallback((key, delta) => {
    optimistic((items) => items.map((i) => {
      if (i.key !== key) return i;
      const qty = Math.max(1, Math.min(i.qty + delta, i.max));
      return { ...i, qty, line: qty * i.price };
    }));
    return run(() => cartChange(key, delta));
  }, [run]);

  const removeItem = useCallback((key) => {
    optimistic((items) => items.filter((i) => i.key !== key));
    return run(() => cartRemove(key));
  }, [run]);

  const value = useMemo(
    () => ({ cart, open, busy, error, openCart, closeCart, refresh, addItem, changeQty, removeItem }),
    [cart, open, busy, error, openCart, closeCart, refresh, addItem, changeQty, removeItem]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
