"use client";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BagArt from "./BagArt";
import { useCart } from "./CartProvider";
import { subscribe } from "@/app/subscribe/actions";

const DAY = 86400000;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),[tabindex]:not([tabindex="-1"])';

// localStorage can be blocked (private mode), so every access is wrapped.
const readUntil = (key) => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
const remember = (key, days) => { try { localStorage.setItem(key, String(Date.now() + days * DAY)); } catch {} };

export default function WelcomePopup({ config = {}, image = null }) {
  const c = { enabled: true, version: 1, delayMs: 6000, snoozeDays: 7, subscribedDays: 365, ...config };
  const key = `ib_welcome_v${c.version}`;
  const [visible, setVisible] = useState(false);
  const [state, formAction, pending] = useActionState(subscribe, {});
  const { open: cartOpen } = useCart();
  const card = useRef(null);
  const show = visible && !cartOpen; // never stack on top of the cart drawer

  // WHEN to show: after a short delay, or (desktop mouse only) when the pointer leaves through
  // the top of the window. Never on first paint, and never again during the snooze period.
  useEffect(() => {
    if (!c.enabled || readUntil(key) > Date.now()) return;
    const started = Date.now();
    const fire = () => setVisible(true);
    const timer = setTimeout(fire, c.delayMs);
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onLeave = (e) => { if (e.clientY <= 0 && Date.now() - started > 3000) fire(); };
    if (canHover) document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      clearTimeout(timer);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [c.enabled, c.delayMs, key]);

  // After a successful signup, stay away for a long time.
  useEffect(() => { if (state.ok) remember(key, c.subscribedDays); }, [state.ok, key, c.subscribedDays]);

  const dismiss = useCallback(() => {
    if (!state.ok) remember(key, c.snoozeDays);
    setVisible(false);
  }, [state.ok, key, c.snoozeDays]);

  // Accessibility: focus moves in, Tab stays inside, Esc closes, focus returns, page does not scroll.
  useEffect(() => {
    if (!show) return;
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    card.current?.focus(); // the card itself, so phones do not pop the keyboard open
    const onKey = (e) => {
      if (e.key === "Escape") return dismiss();
      if (e.key !== "Tab" || !card.current) return;
      const els = [...card.current.querySelectorAll(FOCUSABLE)];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [show, dismiss]);

  if (!show) return null;

  return (
    <div className="wp-root" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div ref={card} className="wp-card" role="dialog" aria-modal="true" aria-labelledby="wp-title" aria-describedby="wp-text" tabIndex={-1}>
        <button type="button" className="wp-x" onClick={dismiss} aria-label="Close">✕</button>

        <div className="wp-art" aria-hidden="true">
          {image ? <img src={image} alt="" /> : <BagArt />}
        </div>

        <div className="wp-body">
          {state.ok ? (
            <>
              <p className="wp-eye">YOU&apos;RE IN</p>
              <h2 id="wp-title">Thank you for subscribing!</h2>
              <p id="wp-text" className="wp-text" role="status">We&apos;ll email you about new arrivals and special offers.</p>
              <Link href="/products" className="btn a wp-go" onClick={dismiss}>Start Shopping</Link>
            </>
          ) : (
            <>
              <p className="wp-eye">{c.eyebrow}</p>
              <h2 id="wp-title">{c.title}</h2>
              <p id="wp-text" className="wp-text">{c.text}</p>

              <form action={formAction} className="wp-form">
                <label htmlFor="wp-email" className="wp-sr">Email address</label>
                <div className="wp-field">
                  <input
                    id="wp-email" name="email" type="email" inputMode="email" autoComplete="email"
                    placeholder="Enter your email…" required maxLength={254}
                    aria-invalid={!!state.error} aria-describedby={state.error ? "wp-err" : undefined}
                  />
                  <button type="submit" disabled={pending}>{pending ? "SENDING…" : c.button}</button>
                </div>
                {/* honeypot: hidden from people and screen readers, bots fill it */}
                <input name="website" className="wp-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                {state.error && <p id="wp-err" role="alert" className="err">{state.error}</p>}
                <p className="wp-fine">By subscribing you agree to our <Link href="/privacy">Privacy Policy</Link>. We only email now and then.</p>
              </form>

              <button type="button" className="wp-no" onClick={dismiss}>No, thanks</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
