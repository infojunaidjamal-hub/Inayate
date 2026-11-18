"use client";
// Header ka "Login" button: abhi wale page par hi popup mein login / naya account khulta hai (dusre page par nahi jana padta).
// Form wahi purana hai (app/login/Forms.js), usme kuch badla nahi gaya. Login ke baad buyer isi page par rehta hai.
// Kisi bhi aur button se popup kholna ho to: window.dispatchEvent(new CustomEvent("open-auth", { detail: { tab: "signup" } }))
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Forms from "@/app/login/Forms";
import { IconUser } from "./Icons";
import "./auth-popup.css";

export default function AuthPopup() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("login");
  const [next, setNext] = useState("");
  const btn = useRef(null), box = useRef(null);

  // "next" = abhi ka page, taaki login ke baad buyer yahin wapas aaye
  const show = useCallback((t) => {
    setNext(window.location.pathname + window.location.search);
    setTab(t === "signup" ? "signup" : "login");
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const h = (e) => show(e.detail?.tab);
    window.addEventListener("open-auth", h);
    return () => window.removeEventListener("open-auth", h);
  }, [show]);
  useEffect(() => { setOpen(false); }, [path]); // popup ke andar ke link se page badle to popup band

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    document.body.style.overflow = "hidden";
    const k = (e) => { if (e.key === "Escape") hide(); };
    document.addEventListener("keydown", k);
    const t = setTimeout(() => box.current?.querySelector("input:not([type=hidden]):not([disabled])")?.focus(), 60);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
      (prev && prev.isConnected ? prev : btn.current)?.focus?.();
    };
  }, [open, hide]);

  // Login page par hi hon to wahan form pehle se dikh raha hai: normal link
  if (path === "/login") return <Link href="/login" className="hd-item"><IconUser /><span>Login</span></Link>;

  return (
    <>
      <button ref={btn} type="button" className="hd-item" onClick={() => show("login")} aria-haspopup="dialog">
        <IconUser /><span>Login</span>
      </button>
      {open && createPortal(
        <div className="aup" role="dialog" aria-modal="true" aria-label="Login ya naya account">
          <button type="button" className="aup-x" aria-label="Close" onClick={hide} tabIndex={-1} />
          <div className="aup-box" ref={box}>
            <button type="button" className="aup-close" aria-label="Close" onClick={hide}>×</button>
            <Forms key={tab} next={next} initialTab={tab} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
