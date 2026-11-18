"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import BagArt from "./BagArt";
import { IconSearch } from "./Icons";
import { inr } from "@/lib/money";

const HIDE_ON = ["/account", "/cart", "/checkout", "/login", "/about", "/contact", "/shipping", "/terms", "/privacy", "/blog"];

const CSS = `
.sb-panel{position:absolute;left:0;right:0;top:calc(100% + 10px);background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 40px #2a262330;padding:14px 16px 12px;z-index:60;max-height:calc(100vh - 140px);overflow:auto}
.sb-head{font:500 14px Poppins;color:var(--ink);padding-bottom:8px;border-bottom:1px solid var(--line);margin-bottom:12px}
.sb-empty{padding:10px 2px 14px;color:var(--mut);font-size:13.5px}
.sb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.sb-item{display:block;text-align:center;border-radius:12px;padding:6px;text-decoration:none;color:var(--ink)}
.sb-item:hover,.sb-item.on{background:var(--bg)}
.sb-im{display:grid;place-items:center;aspect-ratio:1;border-radius:10px;overflow:hidden;background:#f1e8dd;margin-bottom:8px}
.sb-im img{width:100%;height:100%;object-fit:cover;display:block}
.sb-im svg{width:56%}
.sb-item b{display:block;font:500 13px Poppins;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.sb-item small{display:block;color:var(--mut);font-size:11.5px;margin-top:2px}
.sb-item .pr{font-size:12.5px;margin-top:3px}
.sb-item .pr s{color:var(--mut);margin-left:6px;font-size:11.5px}
.sb-all{display:block;text-align:center;margin-top:10px;padding:10px;border-top:1px solid var(--line);font:500 13px Poppins;color:var(--acc);text-decoration:none}
.sb-all:hover{text-decoration:underline}
@media(max-width:600px){.sb-grid{grid-template-columns:repeat(2,1fr)}}
`;

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const box = useRef(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = q.trim();

  // jo likha hai uske hisaab se suggestions laao (thoda ruk kar, taaki har akshar par request na jaye)
  useEffect(() => {
    if (term.length < 2) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const d = await r.json();
        setItems(d.products || []);
        setTotal(d.total || 0);
        setActive(-1);
      } catch (e) {
        if (e.name === "AbortError") return;
        setItems([]);
        setTotal(0);
      }
      setLoading(false);
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // bahar click karo ya page badlo to dropdown band
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function submit(e) {
    e.preventDefault();
    if (active >= 0 && items[active]) {
      setOpen(false);
      router.push(`/products/${items[active].id}`);
      return;
    }
    if (!term) return;
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(term)}`);
  }

  function onKey(e) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown" && items.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp" && items.length) { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
  }

  const show = open && term.length >= 2;

  // In pages par search bar nahi dikhti (hooks ke baad, taaki React ka order na bigde)
  if (HIDE_ON.some((p) => pathname === p || (pathname || "").startsWith(p + "/"))) return null;

  return (
    <form action="/products" method="get" className="hd-search" role="search" ref={box} onSubmit={submit}>
      <style>{CSS}</style>
      <input
        name="q"
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search for bags, totes, slings..."
        aria-label="Search products"
        autoComplete="off"
      />
      <button type="submit" aria-label="Search"><IconSearch /></button>

      {show && (
        <div className="sb-panel">
          <div className="sb-head">Products</div>
          {loading && items.length === 0 && <div className="sb-empty">Searching...</div>}
          {!loading && items.length === 0 && <div className="sb-empty">No products found for &ldquo;{term}&rdquo;</div>}
          {items.length > 0 && (
            <>
              <div className="sb-grid">
                {items.map((p, i) => {
                  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                  return (
                    <Link key={p.id} href={`/products/${p.id}`} className={`sb-item${i === active ? " on" : ""}`} onClick={() => setOpen(false)}>
                      <span className="sb-im">
                        {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <BagArt main={p.colour_main || "#b8865b"} dark={p.colour_dark || "#8a5d3a"} />}
                      </span>
                      <b>{p.name}</b>
                      <small>{p.category}</small>
                      <span className="pr"><strong>{inr(p.price)}</strong>{off > 0 && <s>{inr(p.mrp)}</s>}</span>
                    </Link>
                  );
                })}
              </div>
              <Link href={`/products?q=${encodeURIComponent(term)}`} className="sb-all" onClick={() => setOpen(false)}>
                View all {total} {total === 1 ? "result" : "results"} for &ldquo;{term}&rdquo; →
              </Link>
            </>
          )}
        </div>
      )}
    </form>
  );
}
