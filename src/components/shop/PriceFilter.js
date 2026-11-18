"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STEP = 50;
const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

// Do handle wala price slider. Haath hatane ke thodi der baad filter lag jata hai
export default function PriceFilter({ lo, hi, curLo, curHi }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [a, setA] = useState(curLo);
  const [b, setB] = useState(curHi);
  const timer = useRef(null);

  useEffect(() => { setA(curLo); setB(curHi); }, [curLo, curHi]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (x, y) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const p = new URLSearchParams(sp.toString());
      if (x <= lo) p.delete("min"); else p.set("min", String(x));
      if (y >= hi) p.delete("max"); else p.set("max", String(y));
      p.delete("page");
      const s = p.toString();
      router.push("/products" + (s ? "?" + s : ""), { scroll: false });
    }, 450);
  };

  const span = Math.max(hi - lo, 1);
  const left = ((a - lo) / span) * 100;
  const right = 100 - ((b - lo) / span) * 100;

  return (
    <div>
      <div className="shp-range">
        <div className="shp-track"><div className="shp-fill" style={{ left: `${left}%`, right: `${right}%` }} /></div>
        <input
          type="range" min={lo} max={hi} step={STEP} value={a} aria-label="Minimum price"
          style={{ zIndex: a > (lo + hi) / 2 ? 3 : 2 }}
          onChange={(e) => { const v = Math.min(Number(e.target.value), b - STEP); setA(v); commit(v, b); }}
        />
        <input
          type="range" min={lo} max={hi} step={STEP} value={b} aria-label="Maximum price"
          onChange={(e) => { const v = Math.max(Number(e.target.value), a + STEP); setB(v); commit(a, v); }}
        />
      </div>
      <p className="shp-pv">Price: <b>{fmt(a)}</b> – <b>{fmt(b)}</b></p>
    </div>
  );
}
