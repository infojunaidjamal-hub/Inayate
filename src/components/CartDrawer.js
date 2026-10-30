"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import BagArt from "./BagArt";
import { useCart } from "./CartProvider";
import { inr } from "@/lib/money";

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function CartDrawer() {
  const { cart, open, busy, error, closeCart, changeQty, removeItem } = useCart();
  const panel = useRef(null);
  const closeBtn = useRef(null);

  // Accessibility: focus moves in, Tab stays inside, Esc closes, focus returns to the opener,
  // and the page behind does not scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") return closeCart();
      if (e.key !== "Tab" || !panel.current) return;
      const els = [...panel.current.querySelectorAll(FOCUSABLE)];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, closeCart]);

  const { items, loaded, rule } = cart;
  const toFree = rule ? Math.max(0, rule.freeAbove - cart.subtotal) : 0;
  const progress = rule ? Math.min(100, Math.round((cart.subtotal / rule.freeAbove) * 100)) : 0;

  return (
    <div className={`cd-root${open ? " is-open" : ""}`} inert={!open}>
      <div className="cd-backdrop" onClick={closeCart} />
      <aside ref={panel} className="cd-panel" role="dialog" aria-modal="true" aria-labelledby="cd-title">
        <div className="cd-head">
          <h2 id="cd-title">My Cart{cart.count > 0 && <small> ({cart.count})</small>}</h2>
          <button ref={closeBtn} type="button" className="cd-x" onClick={closeCart} aria-label="Close cart">✕</button>
        </div>

        <div className="cd-body" aria-busy={busy}>
          {error && <p className="err" role="alert">{error}</p>}

          {!loaded ? (
            <p className="mut">Loading your cart…</p>
          ) : items.length === 0 ? (
            <div className="cd-empty">
              <p>Your cart is empty.</p>
              <button type="button" className="btn a" onClick={closeCart}>Keep Shopping</button>
            </div>
          ) : (
            <ul className="cd-list">
              {items.map((i) => (
                <li className="cd-item" key={i.id}>
                  <Link href={`/products/${i.id}`} className="cd-th" aria-label={i.name}>
                    {i.image ? <img src={i.image} alt="" loading="lazy" /> : <BagArt main={i.colourMain} dark={i.colourDark} />}
                  </Link>
                  <div className="cd-info">
                    <Link href={`/products/${i.id}`} className="cd-name">{i.name}</Link>
                    <span className="mut">{inr(i.price)}</span>
                    {i.stock <= 5 && <span className="tag y">Only {i.stock} left</span>}
                    <div className="cd-qty" role="group" aria-label={`Quantity of ${i.name}`}>
                      <button type="button" onClick={() => changeQty(i.id, -1)} disabled={i.qty <= 1} aria-label="Decrease quantity">−</button>
                      <b aria-live="polite">{i.qty}</b>
                      <button type="button" onClick={() => changeQty(i.id, 1)} disabled={i.qty >= i.max} aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                  <div className="cd-side">
                    <button type="button" className="cd-rm" onClick={() => removeItem(i.id)} aria-label={`Remove ${i.name}`}>✕</button>
                    <b>{inr(i.line)}</b>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {loaded && items.length > 0 && (
          <div className="cd-foot">
            {cart.shipping > 0 ? (
              <div className="cd-free">
                <span>Add <b>{inr(toFree)}</b> more for free shipping</span>
                <i><u style={{ width: `${progress}%` }} /></i>
              </div>
            ) : (
              <div className="cd-free ok">You get free shipping 🎉</div>
            )}
            <div className="cd-row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
            <div className="cd-row"><span>Shipping</span><span>{cart.shipping ? inr(cart.shipping) : "FREE"}</span></div>
            <div className="cd-row tot"><b>Total</b><b>{inr(cart.total)}</b></div>
            <div className="cd-btns">
              <button type="button" className="btn o" onClick={closeCart}>Keep Shopping</button>
              <Link
                href="/checkout"
                className="btn a"
                aria-disabled={busy}
                onClick={(e) => { if (busy) e.preventDefault(); }}
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
