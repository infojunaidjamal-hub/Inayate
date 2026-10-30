"use client";
import { useEffect, useRef, useState } from "react";
import BagArt from "./BagArt";
import { toggleWishlist } from "@/app/account/actions";

export default function ProductGallery({ images, name, main, dark, productId, inWish }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(-1);
  const [msg, setMsg] = useState("");
  const rail = useRef(null);
  const n = images.length;

  useEffect(() => {
    if (zoom < 0) return;
    const k = (e) => {
      if (e.key === "Escape") setZoom(-1);
      if (e.key === "ArrowRight") setZoom((z) => (z + 1) % n);
      if (e.key === "ArrowLeft") setZoom((z) => (z - 1 + n) % n);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [zoom, n]);

  const onScroll = () => {
    const r = rail.current;
    if (!r) return;
    const mid = r.scrollLeft + r.clientWidth / 2;
    let best = 0, d = Infinity;
    [...r.children].forEach((c, k) => { const x = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (x < d) { d = x; best = k; } });
    setI(best);
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); setMsg("Link copy ho gaya"); setTimeout(() => setMsg(""), 1800); }
    } catch {}
  };

  return (
    <div className="pp-g">
      <div className="pp-icos">
        <form action={toggleWishlist}>
          <input type="hidden" name="id" value={productId} />
          <button className="pp-ico" aria-label="Wishlist" style={inWish ? { color: "#c0392b" } : undefined}>{inWish ? "♥" : "♡"}</button>
        </form>
        <button className="pp-ico" aria-label="Share" onClick={share} type="button">⤴</button>
        {msg && <span style={{ position: "absolute", right: 44, top: 46, background: "#000b", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12, whiteSpace: "nowrap" }}>{msg}</span>}
      </div>
      <div className="pp-gal" ref={rail} onScroll={onScroll}>
        {n === 0 ? (
          <div className="pp-pn one"><BagArt main={main} dark={dark} /></div>
        ) : images.map((u, k) => (
          <button key={u} type="button" className="pp-pn" onClick={() => setZoom(k)} aria-label={`Photo ${k + 1} bada karein`}>
            <img src={u} alt={`${name} – photo ${k + 1}`} loading={k < 2 ? "eager" : "lazy"} />
          </button>
        ))}
      </div>
      {n > 1 && <span className="pp-cnt">{i + 1} / {n}</span>}
      {zoom >= 0 && (
        <div className="pp-lb" onClick={() => setZoom(-1)}>
          <img src={images[zoom]} alt={name} onClick={(e) => e.stopPropagation()} />
          <button style={{ top: 16, right: 16 }} onClick={() => setZoom(-1)} aria-label="Band karein">✕</button>
          {n > 1 && <>
            <button style={{ left: 16 }} onClick={(e) => { e.stopPropagation(); setZoom((zoom - 1 + n) % n); }} aria-label="Pichhli">‹</button>
            <button style={{ right: 16 }} onClick={(e) => { e.stopPropagation(); setZoom((zoom + 1) % n); }} aria-label="Agli">›</button>
          </>}
        </div>
      )}
    </div>
  );
}
