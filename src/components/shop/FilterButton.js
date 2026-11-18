"use client";
import { useEffect } from "react";

// Mobile par filters ka drawer: body par ek class lagakar kholte / band karte hain
const OPEN = "shp-open";
const close = () => document.body.classList.remove(OPEN);

export default function FilterButton() {
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); close(); };
  }, []);
  return (
    <button type="button" className="shp-fbtn" onClick={() => document.body.classList.add(OPEN)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
      Filters
    </button>
  );
}

export function FilterClose() {
  return <button type="button" className="shp-fclose" onClick={close} aria-label="Filters band karein">✕</button>;
}

export function FilterApply({ count }) {
  return <button type="button" className="shp-apply" onClick={close}>Show {count} {count === 1 ? "product" : "products"}</button>;
}

export function FilterBackdrop() {
  return <div className="shp-backdrop" onClick={close} />;
}
