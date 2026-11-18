"use client";
import { useState } from "react";

// Footer ka ek column. Desktop par hamesha khula dikhta hai, mobile par tap karke khulta hai (shuru me band).
export default function FooterAcc({ title, children, className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"fa " + className + (open ? " open" : "")}>
      <button type="button" className="fa-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className="fa-body">{children}</div>
    </div>
  );
}
