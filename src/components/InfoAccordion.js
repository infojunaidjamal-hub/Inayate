"use client";
import { useState } from "react";

// Footer ke just upar ki "+" patti. Shuru me band; tap karne par poora info section khulta hai.
export default function InfoAccordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="ia" aria-label={title}>
      <div className="ia-in">
        <button type="button" className="ia-btn" aria-expanded={open} aria-controls="ia-panel" onClick={() => setOpen(!open)}>
          <span>{title}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path className="ia-v" d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
        <div id="ia-panel" className="ia-body" hidden={!open}>{children}</div>
      </div>
    </section>
  );
}
