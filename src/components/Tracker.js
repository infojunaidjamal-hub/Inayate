"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Dukaan ke pages par shoppers ke events bhejta hai (bina naam ya phone ke). Seller aur API pages par kuch nahi karta.
const send = (events) => {
  if (!events.length) return;
  try {
    const blob = new Blob([JSON.stringify({ events })], { type: "application/json" });
    if (!navigator.sendBeacon || !navigator.sendBeacon("/api/track", blob)) {
      fetch("/api/track", { method: "POST", body: JSON.stringify({ events }), keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {}
};
const skip = () => typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || window.doNotTrack === "1");

export default function Tracker() {
  const path = usePathname();

  // page par aate hi: product ka page ya checkout
  useEffect(() => {
    if (skip() || !path || path.startsWith("/seller") || path.startsWith("/api")) return;
    const m = /^\/products\/(\d+)$/.exec(path);
    if (m) send([{ type: "product_view", product: Number(m[1]) }]);
    else if (path === "/checkout") send([{ type: "checkout_started" }]);
  }, [path]);

  // list mein jo product card sach mein dikha (aadhe se zyada) wo impression hai, ek page par ek baar
  useEffect(() => {
    if (skip() || !path || path.startsWith("/seller") || path.startsWith("/api") || !("IntersectionObserver" in window)) return;
    const seen = new Set(), queue = new Set(), watched = new WeakSet();
    let timer = null;
    const flush = () => {
      clearTimeout(timer); timer = null;
      send([...queue].map((id) => ({ type: "impression", product: id })));
      queue.clear();
    };
    const io = new IntersectionObserver((list) => {
      for (const en of list) {
        if (!en.isIntersecting) continue;
        const id = Number(en.target.dataset.ibp);
        io.unobserve(en.target);
        if (id && !seen.has(id)) { seen.add(id); queue.add(id); }
      }
      if (queue.size && !timer) timer = setTimeout(flush, 2500);
    }, { threshold: 0.5 });
    const scan = () => {
      document.querySelectorAll('a[href^="/products/"]').forEach((a) => {
        if (watched.has(a) || a.closest(".vr-box")) return; // colour group ki chhoti photo impression nahi
        const m = /^\/products\/(\d+)$/.exec(a.getAttribute("href") || "");
        if (!m || path === a.getAttribute("href")) return;
        watched.add(a);
        a.dataset.ibp = m[1];
        io.observe(a);
      });
    };
    scan();
    let mt = null;
    const mo = new MutationObserver(() => { clearTimeout(mt); mt = setTimeout(scan, 400); });
    mo.observe(document.body, { childList: true, subtree: true });
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", hide);
    addEventListener("pagehide", flush);
    return () => { flush(); io.disconnect(); mo.disconnect(); clearTimeout(mt); document.removeEventListener("visibilitychange", hide); removeEventListener("pagehide", flush); };
  }, [path]);

  return null;
}
