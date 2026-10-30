"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import BagArt from "./BagArt";

export default function HeroSlider({ slides }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (hold || slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [hold, slides.length]);

  const go = (n) => setI((n + slides.length) % slides.length);

  return (
    <div className="hm-hero" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      {slides.map((s, n) => (
        <div key={s.title} className={`hm-slide${n === i ? " on" : ""}`} style={{ background: s.bg }} aria-hidden={n !== i}>
          <div className="hm-slide-t">
            <p className="hm-tag">{s.tag}</p>
            <h1>{s.title}</h1>
            <p className="hm-sub">{s.text}</p>
            <Link href={s.href} className="btn a" tabIndex={n === i ? 0 : -1}>{s.cta}</Link>
          </div>
          <div className="hm-slide-v">
            {s.img ? <img src={s.img} alt={s.title} /> : <BagArt main={s.c1} dark={s.c2} />}
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <>
          <button className="hm-arr l" onClick={() => go(i - 1)} aria-label="Previous slide">‹</button>
          <button className="hm-arr r" onClick={() => go(i + 1)} aria-label="Next slide">›</button>
          <div className="hm-dots">
            {slides.map((s, n) => (
              <button key={s.title} className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
