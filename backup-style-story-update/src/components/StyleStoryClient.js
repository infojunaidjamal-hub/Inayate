"use client";
// "Watch The Style Story": seller ki vertical videos ki row. Row apne aap chalti hai, sirf screen par dikhti videos play hoti hain,
// video par tap karne se fullscreen reel viewer khulta hai, product card par tap karne se popup (phone par neeche se sheet).
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { buyNow } from "@/app/cart/actions";
import { inr } from "@/lib/money";
import "./style-story.css";

const Svg = ({ children, size = 18, fill = "none", stroke }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const PauseI = () => <Svg size={16} fill="#2a2623"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></Svg>;
const PlayI = () => <Svg size={16} fill="#2a2623"><path d="M7 4l13 8-13 8z" /></Svg>;
const MuteI = () => <Svg stroke="#2a2623"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M22 9l-6 6M16 9l6 6" /></Svg>;
const SoundI = () => <Svg stroke="#2a2623"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></Svg>;
const CloseI = () => <Svg size={16} stroke="#2a2623"><path d="M6 6l12 12M18 6L6 18" /></Svg>;
const Chev = ({ left }) => <Svg size={22} stroke="#fff"><path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} /></Svg>;
const Stars = ({ rating }) => (
  <span className="ss-stars" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((k) => <svg key={k} width="18" height="18" viewBox="0 0 24 24" fill={k < Math.round(parseFloat(rating)) ? "#8f5f35" : "#e0d3c3"}><path d="M12 2l3 7 7.5.6-5.7 4.9 1.8 7.4L12 18l-6.6 3.9 1.8-7.4L1.5 9.6 9 9z" /></svg>)}
  </span>
);
const Price = ({ p }) => (
  <>
    <b>{inr(p.price)}</b>{p.mrp > p.price && <s>{inr(p.mrp)}</s>}{p.off > 0 && <em>{p.off}% off</em>}
  </>
);
const Thumb = ({ p, size }) => (p.image ? <img src={p.image} alt="" className="ss-th" style={{ width: size, height: size }} loading="lazy" /> : <span className="ss-th" style={{ width: size, height: size }} />);

/* ---------------- Product popup (desktop: beech mein, phone: neeche se sheet) ---------------- */
function Popup({ p, shipNote, onClose }) {
  const { addItem } = useCart();
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [onClose]);
  const add = async () => { onClose(); await addItem(p.id); };
  return (
    <div className="ss-mask" role="dialog" aria-modal="true" aria-label={p.name}>
      <button type="button" className="ss-mask-x" aria-label="Close popup" onClick={onClose} tabIndex={-1} />
      <div className="ss-pop">
        <div className="ss-pop-img" style={p.image ? { backgroundImage: `url(${p.image})` } : undefined} />
        <div className="ss-pop-body">
          <button ref={closeRef} type="button" className="ss-x" aria-label="Close" onClick={onClose}><CloseI /></button>
          <h3>{p.name}</h3>
          {p.rating && <div className="ss-rate"><Stars rating={p.rating} /><span><b>{p.rating}</b> ({p.count} ratings)</span></div>}
          <div className="ss-price"><Price p={p} /></div>
          <span className="ss-tax">Inclusive of all taxes. {shipNote}.</span>
          {p.desc && <p className="ss-desc">{p.desc}</p>}
          <div className="ss-acts">
            {p.hasVariants ? <Link href={p.href} className="ss-b ss-b-p">Choose options</Link> : (
              <>
                <button type="button" className="ss-b ss-b-o" onClick={add}>Add to cart</button>
                <form action={buyNow} style={{ flex: 1, display: "flex" }}><input type="hidden" name="id" value={p.id} /><button className="ss-b ss-b-p">Buy now</button></form>
              </>
            )}
          </div>
          <Link href={p.href} className="ss-link">View full product page</Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fullscreen reel viewer ---------------- */
function Viewer({ items, start, muted, setMuted, onClose }) {
  const { addItem } = useCart();
  const [idx, setIdx] = useState(start);
  const [paused, setPaused] = useState(false);
  const [pct, setPct] = useState(0);
  const vref = useRef(null), closeRef = useRef(null);
  const last = items.length - 1, r = items[idx], p = r.product;
  const go = useCallback((n) => { setPct(0); setIdx(Math.max(0, Math.min(last, n))); }, [last]);
  const next = useCallback(() => (idx < last ? go(idx + 1) : onClose()), [idx, last, go, onClose]);

  useEffect(() => {
    const prev = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = ""; prev?.focus?.(); };
  }, []);
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === " " && e.target === document.body) { e.preventDefault(); setPaused((x) => !x); }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [idx, go, onClose]);
  useEffect(() => { const v = vref.current; if (v) v.muted = muted; }, [muted, idx]);
  useEffect(() => { const v = vref.current; if (!v) return; if (paused) v.pause(); else v.play().catch(() => {}); }, [paused, idx]);
  const add = async () => { onClose(); await addItem(p.id); };

  return (
    <div className="ssv" role="dialog" aria-modal="true" aria-label="Style story videos" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ssv-in">
        <div className="ssv-frame">
          <video key={r.id} ref={vref} className="ssv-v" src={r.src} poster={r.poster || undefined} autoPlay muted playsInline preload="auto"
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setPct((v.currentTime / v.duration) * 100); }} onEnded={next} />
          <div className="ssv-top" />
          <button type="button" className="ssv-zone ssv-prev" aria-label="Previous video" onClick={() => go(idx - 1)}>{idx > 0 && <Chev left />}</button>
          <button type="button" className="ssv-zone ssv-next" aria-label="Next video" onClick={next}>{idx < last && <Chev />}</button>
          <div className="ssv-segs">{items.map((_, k) => <div key={k} className="ssv-seg"><b style={{ width: k < idx ? "100%" : k === idx ? `${pct}%` : "0%" }} /></div>)}</div>
          <div className="ssv-bar">
            <span />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="ss-btn" aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused((x) => !x)}>{paused ? <PlayI /> : <PauseI />}</button>
              <button type="button" className="ss-btn" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>{muted ? <MuteI /> : <SoundI />}</button>
              <button ref={closeRef} type="button" className="ss-btn" aria-label="Close" onClick={onClose}><CloseI /></button>
            </div>
          </div>
          <div className="ssv-cap"><span>{r.line1}</span>{r.line2 && <span>{r.line2}</span>}</div>
        </div>
        <div className="ssv-prod">
          <div className="ssv-prod-r"><Thumb p={p} size={56} /><div><span className="ssv-n">{p.name}</span><span className="ssv-p"><Price p={p} /></span></div></div>
          <div className="ssv-acts">
            <Link href={p.href} className="ss-b ss-b-o" onClick={onClose}>View product</Link>
            {p.hasVariants ? <Link href={p.href} className="ss-b ss-b-p" onClick={onClose}>Choose options</Link> : <button type="button" className="ss-b ss-b-p" onClick={add}>Add to cart</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Home page section ---------------- */
export default function StyleStoryClient({ items, shipNote, ratio = { w: 3, h: 4 } }) {
  const n = items.length;
  const loop = n >= 3; // row ko lagataar ghumane ke liye list do baar
  const cards = (loop ? [0, 1] : [0]).flatMap((c) => items.map((v, i) => ({ v, i, k: `${c ? "b" : "a"}${i}`, dup: !!c })));
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [calm, setCalm] = useState(false); // kam motion / data saver: apne aap play nahi, poster + play button
  const [sel, setSel] = useState(null);
  const [view, setView] = useState(null);
  const [seen, setSeen] = useState({});    // jis video ki file load ho chuki
  const [hand, setHand] = useState({});    // calm mode mein buyer ne khud play dabaya
  const [dot, setDot] = useState(0);
  const sec = useRef(null), rail = useRef(null), vids = useRef({}), bars = useRef({}), vis = useRef({}), secVis = useRef(false);
  const st = useRef({});
  st.current = { paused, calm, hand, busy: sel !== null || view !== null };

  // Kaun si video chalni chahiye: dikh rahi ho, koi popup / viewer khula na ho, aur pause na ho
  const sync = useCallback(() => {
    const s = st.current;
    for (const k of Object.keys(vids.current)) {
      const v = vids.current[k];
      if (!v) continue;
      const want = !s.busy && (s.hand[k] || (!s.calm && !s.paused && vis.current[k] && secVis.current));
      // Play tabhi jab video ki file lag chuki ho (src lazy lagta hai); bina src ke play() karne se video atak jaata tha
      if (want) { if (v.getAttribute("src") && v.paused) v.play().catch(() => {}); } else if (!v.paused) v.pause();
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const save = navigator.connection?.saveData;
    setCalm(!!(mq?.matches || save));
  }, []);
  useEffect(() => { sync(); }, [sync, paused, calm, hand, sel, view, seen]);
  useEffect(() => { for (const v of Object.values(vids.current)) if (v) v.muted = muted; }, [muted, seen]);

  // Sirf screen par dikhti videos (60% se zyada) chalti hain; section khud bhi screen par ho tab
  useEffect(() => {
    const root = rail.current;
    if (!root || !sec.current || typeof IntersectionObserver === "undefined") { secVis.current = true; return; }
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        const k = e.target.dataset.k;
        vis.current[k] = e.intersectionRatio >= 0.6;
        if (vis.current[k]) setSeen((p) => (p[k] ? p : { ...p, [k]: true }));
      }
      sync();
    }, { root, threshold: [0, 0.6, 1] });
    root.querySelectorAll("[data-k]").forEach((el) => io.observe(el));
    const so = new IntersectionObserver(([e]) => { secVis.current = e.isIntersecting; sync(); }, { threshold: 0.1 });
    so.observe(sec.current);
    return () => { io.disconnect(); so.disconnect(); };
  }, [n, sync]);

  // Row apne aap chalti hai; buyer chhuye / scroll kare to rukti hai aur 30 second baad dobara chalti hai
  useEffect(() => {
    const el = rail.current;
    if (!el || calm) return;
    let raf, last = performance.now(), pos = el.scrollLeft, manual = false, hover = false, idle;
    const stop = () => { manual = true; clearTimeout(idle); idle = setTimeout(() => { manual = false; pos = el.scrollLeft; }, 30000); };
    const on = (t, f, o) => el.addEventListener(t, f, o);
    on("touchstart", stop, { passive: true }); on("pointerdown", stop, { passive: true });
    on("wheel", (e) => { if (Math.abs(e.deltaX) > 0) stop(); }, { passive: true });
    on("mouseenter", () => { hover = true; }); on("mouseleave", () => { hover = false; pos = el.scrollLeft; });
    on("focusin", () => { hover = true; }); on("focusout", () => { hover = false; pos = el.scrollLeft; });
    const tick = (t) => {
      const dt = Math.min(64, t - last); last = t;
      const half = el.scrollWidth / 2;
      if (loop && !manual && !hover && !st.current.paused && !st.current.busy && half > el.clientWidth + 8) {
        pos += dt * 0.033;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(idle); };
  }, [calm, loop]);

  const onScroll = () => {
    const el = rail.current; if (!el) return;
    const c = el.querySelectorAll("[data-k]");
    const step = c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : 0;
    if (step > 0) setDot(Math.round(el.scrollLeft / step) % n);
  };
  const closePop = useCallback(() => setSel(null), []);
  const closeView = useCallback(() => setView(null), []);

  return (
    <section className="ss" ref={sec} aria-label="Watch The Style Story" style={{ "--ss-ar": `${ratio.w} / ${ratio.h}`, "--ss-r": ratio.w / ratio.h }}>
      <div className="ss-head">
        <h2>Watch The Style Story</h2>
        <i />
        <p>Short films from our studio. Tap a product to see details in a popup.</p>
      </div>
      <div className="ss-rail" ref={rail} onScroll={onScroll}>
        <div className="ss-track">
          {cards.map(({ v, i, k, dup }) => {
            const p = v.product;
            return (
              <div key={k} data-k={k} className="ss-card" aria-hidden={dup || undefined} ref={(el) => { if (el) { if (dup) el.setAttribute("inert", ""); else el.removeAttribute("inert"); } }}>
                <div className="ss-vid">
                  <video ref={(el) => { vids.current[k] = el; }} className="ss-v" src={seen[k] ? v.src : undefined} poster={v.poster || undefined}
                    muted playsInline loop preload="auto" aria-hidden="true" tabIndex={-1}
                    onTimeUpdate={(e) => { const b = bars.current[k], m = e.currentTarget; if (b && m.duration) b.style.width = `${(m.currentTime / m.duration) * 100}%`; }} />
                  <button type="button" className="ss-open" aria-label={`Watch video: ${v.line1}`} onClick={() => setView(i)} />
                  <div className="ss-ctl">
                    {!calm && <button type="button" className="ss-btn" aria-label={paused ? "Play videos" : "Pause videos"} onClick={() => setPaused((x) => !x)}>{paused ? <PlayI /> : <PauseI />}</button>}
                    <button type="button" className="ss-btn" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>{muted ? <MuteI /> : <SoundI />}</button>
                  </div>
                  {calm && !hand[k] && <button type="button" className="ss-bigplay" aria-label={`Play video: ${v.line1}`} onClick={() => { setSeen((s) => ({ ...s, [k]: true })); setHand((h) => ({ ...h, [k]: true })); }}><PlayI /></button>}
                  <div className="ss-cap"><span>{v.line1}</span>{v.line2 && <span>{v.line2}</span>}</div>
                  <div className="ss-bar"><b ref={(el) => { bars.current[k] = el; }} /></div>
                </div>
                <button type="button" className="ss-prod" aria-haspopup="dialog" onClick={() => setSel(i)}>
                  <Thumb p={p} size={52} />
                  <span className="ss-pm"><span className="ss-pn">{p.name}</span><span className="ss-pp"><Price p={p} /></span></span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {n > 1 && <div className="ss-dots" aria-hidden="true">{items.map((_, k) => <i key={k} className={k === dot ? "on" : ""} />)}</div>}
      {sel !== null && <Popup p={items[sel].product} shipNote={shipNote} onClose={closePop} />}
      {view !== null && <Viewer items={items} start={view} muted={muted} setMuted={setMuted} onClose={closeView} />}
    </section>
  );
}
