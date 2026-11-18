"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { inr } from "@/lib/money";

const fmDay = (s) => new Date(s + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

// Chart ki chaudai container se leta hai aur resize par dobara banta hai
function useWidth(min = 280) {
  const ref = useRef(null);
  const [w, setW] = useState(560);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(min, Math.round(el.clientWidth || 560)));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w];
}
const niceStep = (max) => [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((c) => max / c <= 5) || 1000;

/* ---------- Orders per day: x = date, y = number of orders ---------- */
export function OrdersLine({ points }) {
  const [box, W] = useWidth();
  const [hov, setHov] = useState(null);
  const H = 210, L = 40, R = 12, T = 12, B = 28, n = points.length;
  const max = Math.max(1, ...points.map((p) => p.n)), step = niceStep(max), top = Math.ceil(max / step) * step;
  const x = (i) => L + (n > 1 ? (i * (W - L - R)) / (n - 1) : (W - L - R) / 2);
  const y = (v) => H - B - (v / top) * (H - B - T);
  const d = points.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.n).toFixed(1)).join(" ");
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const tk = W < 420 ? 4 : 6;
  const xl = Array.from({ length: Math.min(tk, n) }, (_, k) => (n > 1 ? Math.round((k * (n - 1)) / (Math.min(tk, n) - 1 || 1)) : 0));
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) * (W / r.width);
    setHov(Math.min(n - 1, Math.max(0, Math.round(((px - L) * (n - 1)) / (W - L - R || 1)))));
  };
  const best = points.reduce((a, p) => (p.n > a.n ? p : a), points[0] || { d: "", n: 0 });
  return (
    <div ref={box} className="in-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Orders per day. Across: date. Up: number of orders. Best day ${fmDay(best.d)} with ${best.n} orders.`} style={{ touchAction: "pan-y" }}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHov(null)}>
        {ticks.map((v) => (<g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--mut)">{v}</text></g>))}
        <path d={`${d} L${x(n - 1)} ${H - B} L${x(0)} ${H - B}Z`} fill="var(--acc)" opacity=".14" />
        <path d={d} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinejoin="round" />
        {xl.map((i, k) => (<text key={k} x={x(i)} y={H - 8} fontSize="11" fill="var(--mut)" textAnchor={k === 0 ? "start" : k === xl.length - 1 ? "end" : "middle"}>{fmDay(points[i].d)}</text>))}
        {hov != null && (<g><line x1={x(hov)} x2={x(hov)} y1={T} y2={H - B} stroke="var(--mut)" strokeDasharray="3 3" /><circle cx={x(hov)} cy={y(points[hov].n)} r="5" fill="var(--acc)" stroke="#fff" strokeWidth="2" /></g>)}
      </svg>
      {hov != null && (
        <div className="in-tip" style={{ left: Math.min(Math.max(x(hov), 56), W - 56), top: Math.max(0, y(points[hov].n) - 36) }} role="status">
          {fmDay(points[hov].d)}: {points[hov].n} order{points[hov].n === 1 ? "" : "s"}
        </div>
      )}
      <p className="in-sub">Across: date. Up: number of orders. Best day: {fmDay(best.d)} with {best.n} order{best.n === 1 ? "" : "s"}.</p>
    </div>
  );
}

/* ---------- Live activity: pichle 12 ghante ---------- */
const GN = ["Viewed", "Added to cart", "Checkout started", "Ordered", "Payment failed"];
const GC = ["#cfc8f0", "#ad7950", "#e0a93b", "#32764a", "#b8463c"];
const G = { product_view: 0, add_to_cart: 1, buy_now: 1, checkout_started: 2, purchase: 3, payment_failed: 4 };
const say = (f) => {
  const b = f.n ? <b>{f.n}</b> : "a product";
  return {
    product_view: <>Someone viewed {b}</>,
    add_to_cart: <>Someone added {b} to the cart</>,
    buy_now: <>Someone pressed Buy now on {b}</>,
    checkout_started: <>Someone started checkout</>,
    payment_failed: <>A payment did not go through{f.o ? ` (${f.o})` : ""}</>,
    purchase: <>Order placed{f.o ? <>: <b>{f.o}</b></> : ""}{f.val ? ` for ${inr(f.val)}` : ""}</>,
  }[f.k];
};
const ago = (t, now) => { const m = Math.max(0, Math.floor((now - t) / 60000)); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`; };

export function LiveActivity({ initial }) {
  const [data, setData] = useState(initial);
  const [on, setOn] = useState([true, true, true, true, true]);
  const [now, setNow] = useState(() => Date.now());
  const [hov, setHov] = useState(null);
  const [box, W] = useWidth(300);

  const load = useCallback(() => {
    fetch("/seller/insights/live", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setData(d); setNow(Date.now()); } }).catch(() => {});
  }, []);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const { hours, feed } = data;
  const H = 220, L = 34, R = 8, T = 10, B = 26, n = hours.length;
  const tot = hours.map((h) => h.c.reduce((a, v, i) => a + (on[i] ? v : 0), 0));
  const max = Math.max(1, ...tot), step = niceStep(max), top = Math.ceil(max / step) * step;
  const bw = (W - L - R) / n, y = (v) => H - B - (v / top) * (H - B - T);
  const every = W < 420 ? 3 : 2;
  const sums = GN.map((_, i) => hours.reduce((a, h) => a + h.c[i], 0));
  const shown = feed.filter((f) => on[G[f.k]]).slice(0, 8);
  const grid = [];
  for (let v = 0; v <= top; v += step) grid.push(v);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHov(Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) * (W / r.width) - L) / bw))));
  };

  return (
    <div>
      <div className="in-chips">
        {GN.map((name, i) => (
          <button key={name} type="button" className={`in-chip${on[i] ? "" : " off"}`} aria-pressed={on[i]} style={{ "--c": GC[i] }} onClick={() => setOn((s) => s.map((v, k) => (k === i ? !v : v)))}>
            <i /><span>{name}</span> <b>{sums[i]}</b>
          </button>
        ))}
      </div>
      <div className="in-live">
        <div ref={box} className="in-chart">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Shopper activity per hour for the last 12 hours. Across: hour. Up: number of events. Hover or tap a bar for details." style={{ touchAction: "pan-y" }}
            onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHov(null)}>
            {grid.map((v) => (<g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--mut)">{v}</text></g>))}
            {hov != null && <rect x={L + hov * bw} y={T} width={bw} height={H - B - T} fill="currentColor" opacity=".07" />}
            {hours.map((h, i) => {
              let acc = 0;
              return (
                <g key={h.key}>
                  {GC.map((c, k) => {
                    if (!on[k] || !h.c[k]) return null;
                    const y0 = y(acc), y1 = y(acc + h.c[k]);
                    acc += h.c[k];
                    return <rect key={k} x={L + i * bw + bw * 0.16} y={y1} width={bw * 0.68} height={Math.max(1, y0 - y1)} fill={c} />;
                  })}
                  {i % every === (n - 1) % every && <text x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--mut)">{h.label}</text>}
                </g>
              );
            })}
          </svg>
          {hov != null && (
            <div className="in-tip" style={{ left: Math.min(Math.max(L + hov * bw + bw / 2, 70), W - 70), top: 0 }} role="status">
              <b>{hours[hov].label}: {tot[hov]} events</b>
              {GN.map((m, k) => (on[k] ? <span key={m}><br />{hours[hov].c[k]} {m.toLowerCase()}</span> : null))}
            </div>
          )}
        </div>
        <ul className="in-feed" aria-live="polite">
          {shown.length === 0 && <li className="empty">{feed.length ? "Nothing to show. Turn a group back on above." : "No shopper activity yet."}</li>}
          {shown.map((f) => (
            <li key={f.id}>
              <i style={{ background: GC[G[f.k]] }} />
              <span className="tx">{say(f)}{f.v !== "unknown" && <small>Visitor {f.v}</small>}</span>
              <span className="tm">{ago(f.t, now)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="in-note">Updates every 30 seconds. Tip: hide “Viewed” to see the smaller numbers clearly. Impressions are counted in the table below, not here.</p>
    </div>
  );
}
