"use client";
import { useEffect, useRef, useState } from "react";

// Home page ka blog carousel: cards (server se aate hain) ko side mein scroll karne ka dabba + left/right arrows.
export default function BlogCarousel({ children }) {
  const track = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);

  const go = (dir) => {
    const el = track.current;
    const card = el.querySelector(".hm-bl-card");
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const fits = edge.start && edge.end; // saare cards ek saath dikh rahe hain: arrows ki zaroorat nahi
  return (
    <div className="hm-bl-wrap">
      {!fits && (
        <button type="button" className="hm-bl-arr l" onClick={() => go(-1)} disabled={edge.start} aria-label="Pehle ke posts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div className="hm-bl-track" ref={track} tabIndex={0} role="region" aria-label="Latest blog posts">{children}</div>
      {!fits && (
        <button type="button" className="hm-bl-arr r" onClick={() => go(1)} disabled={edge.end} aria-label="Aage ke posts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}
    </div>
  );
}
