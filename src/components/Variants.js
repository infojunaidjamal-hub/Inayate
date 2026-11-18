"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BuyBox from "@/components/BuyBox";
import BagArt from "@/components/BagArt";
import { isColourOption, swatchFor } from "@/lib/swatch";
import "./variants.css";
import { inr } from "@/lib/money";

const Ctx = createContext(null);

export function VariantProvider({ productId, names, variants, swatches = {}, children }) {
  const start = variants.find((v) => v.stock > 0) || variants[0];
  const [sel, setSel] = useState(start.opts);
  const cur = variants.find((v) => v.opts.every((x, i) => x === sel[i])) || start;

  // option i mein value chuni: agar poori combination nahi ya khatam hai to sabse milti-julti available variant
  const pick = (i, val) => {
    const next = sel.map((x, j) => (j === i ? val : x));
    const exact = variants.find((v) => v.opts.every((x, j) => x === next[j]));
    if (exact && exact.stock > 0) return setSel(next);
    const cands = variants.filter((v) => v.opts[i] === val)
      .sort((a, b) => (b.stock > 0) - (a.stock > 0) || b.opts.filter((x, j) => x === sel[j]).length - a.opts.filter((x, j) => x === sel[j]).length);
    setSel(exact ? next : cands[0] ? cands[0].opts : next);
  };

  // variant ki photo gallery mein dikhao
  useEffect(() => {
    if (cur?.image) window.dispatchEvent(new CustomEvent("pp-image", { detail: cur.image }));
  }, [cur?.id, cur?.image]);

  return <Ctx.Provider value={{ productId, names, variants, swatches, sel, cur, pick }}>{children}</Ctx.Provider>;
}

const useV = () => useContext(Ctx);

// Photo wale colours ka side-scroll strip (kinare par arrow buttons)
function Strip({ children, label, selected }) {
  const ref = useRef(null);
  const [nav, setNav] = useState({ l: false, r: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (el) setNav({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);
  // chuna hua colour hamesha dikhta rahe
  useEffect(() => {
    const el = ref.current, on = el?.querySelector('[aria-checked="true"],[aria-current="page"]');
    if (!el || !on) return;
    const l = on.offsetLeft, r = l + on.offsetWidth;
    if (l < el.scrollLeft) el.scrollTo({ left: Math.max(0, l - 12), behavior: "smooth" });
    else if (r > el.scrollLeft + el.clientWidth) el.scrollTo({ left: r - el.clientWidth + 12, behavior: "smooth" });
  }, [selected]); // sirf tab jab colour badle (arrow se scroll karne par wapas na kheenche)
  const go = (d) => ref.current?.scrollBy({ left: d * Math.max(120, ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div className="vr-strip">
      {nav.l && <button type="button" className="vr-arr l" aria-label={`Show earlier ${label}`} onClick={() => go(-1)}>‹</button>}
      <div className="vr-row vr-scroll" ref={ref} onScroll={update}>{children}</div>
      {nav.r && <button type="button" className="vr-arr r" aria-label={`Show more ${label}`} onClick={() => go(1)}>›</button>}
    </div>
  );
}

export function VariantPicker() {
  const { names, variants, swatches, sel, pick } = useV();
  return (
    <div className="vr-box">
      {names.map((name, i) => {
        const values = [...new Set(variants.map((v) => v.opts[i]))];
        const colourOpt = isColourOption(name);
        const photoOf = (val) => (colourOpt ? variants.find((v) => v.opts[i] === val && v.image)?.image : null);
        const thumbs = values.some((val) => photoOf(val)); // photo wale colours: thumbnail strip
        const buttons = values.map((val) => {
          // is value ki koi variant (baaki chune hue options ke saath) stock mein hai?
          const ok = variants.some((v) => v.opts[i] === val && v.stock > 0 && v.opts.every((x, j) => j === i || x === sel[j]));
          const on = sel[i] === val;
          const cls = (on ? " on" : "") + (ok ? "" : " vr-so");
          const lab = val + (ok ? "" : " (sold out)");
          const img = photoOf(val);
          const hex = colourOpt ? swatchFor(val, swatches) : null;
          if (img) {
            return (
              <button type="button" key={val} role="radio" aria-checked={on} aria-label={lab} title={val} className={"vr-th" + cls} onClick={() => pick(i, val)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" loading="lazy" />
              </button>
            );
          }
          if (hex) {
            return <button type="button" key={val} role="radio" aria-checked={on} aria-label={lab} title={val} className={"vr-sw" + cls} style={{ background: hex }} onClick={() => pick(i, val)} />;
          }
          return <button type="button" key={val} role="radio" aria-checked={on} aria-label={lab} title={val} className={"vr-bt" + cls} onClick={() => pick(i, val)}>{val}</button>;
        });
        return (
          <div className="vr-grp" key={name} role="radiogroup" aria-label={name}>
            <div className="vr-lab"><b>Selected {name}:</b> {sel[i]}</div>
            {thumbs ? <Strip label={name.toLowerCase()} selected={sel[i]}>{buttons}</Strip> : <div className="vr-row">{buttons}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function VariantPrice() {
  const { cur } = useV();
  const off = cur.mrp > cur.price ? Math.round(((cur.mrp - cur.price) / cur.mrp) * 100) : 0;
  return (
    <>
      <div>
        {off > 0 && <span className="pp-off">↓{off}% </span>}
        {off > 0 && <s className="pp-mut">{inr(cur.mrp)} </s>}
        <span className="pp-price">{inr(cur.price)}</span>
      </div>
      <div className="pp-mut" style={{ fontSize: 12 }}>
        Inclusive of all taxes · {cur.stock <= 0 ? <b style={{ color: "#b8463c" }}>Out of stock</b> : cur.stock <= 5 ? <b style={{ color: "#b8463c" }}>Only {cur.stock} left</b> : <b style={{ color: "var(--pp-green)" }}>In stock</b>}
      </div>
    </>
  );
}

export function VariantBuy() {
  const { productId, cur } = useV();
  return <BuyBox id={productId} vid={cur.id} out={cur.stock <= 0} price={cur.price} />;
}

// Alag-alag listings ka group (Seller > Listing groups): photo strip, har photo us listing ka link
export function GroupPicker({ items, current, name = "Colour" }) {
  const cur = items.find((i) => i.id === current);
  return (
    <div className="vr-box" style={{ marginTop: 0 }}>
      <div className="vr-grp">
        <div className="vr-lab"><b>Selected {name}:</b> {cur?.label}</div>
        <Strip label="colours" selected={current}>
          {items.map((it) => (
            <Link
              key={it.id}
              href={`/products/${it.id}`}
              scroll={false}
              className={"vr-th" + (it.id === current ? " on" : "") + (it.out ? " vr-so" : "")}
              aria-current={it.id === current ? "page" : undefined}
              aria-label={it.label + (it.out ? " (sold out)" : "")}
              title={it.label}
            >
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" loading="lazy" />
              ) : (
                <span className="vr-art"><BagArt main={it.main} dark={it.dark} /></span>
              )}
            </Link>
          ))}
        </Strip>
      </div>
    </div>
  );
}
