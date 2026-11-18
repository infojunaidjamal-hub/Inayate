// Shop page ka filter / sort / pagination logic (sirf hisaab-kitab, koi database ya Next.js nahi)
export const PER_PAGE = 12;
export const SORTS = {
  featured: "Featured",
  newest: "Newest first",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  discount: "Biggest discount",
};

export const pct = (p) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);
const matKey = (p) => String(p.material || "").split(/[,;/]/)[0].trim();
const colKey = (p) => String(p.colours || "").split(",")[0].trim();
const first = (v) => String(Array.isArray(v) ? v[0] ?? "" : v ?? "");
const eq = (a, b) => a.toLowerCase() === b.toLowerCase();

// base = (search ke baad) saare active products, sp = URL ke parameters
// tree = seller ke category order (categoryTree se); sub-category bhi yahin se
export function shopQuery(base, sp, term = "", tree = []) {
  const catCount = new Map();
  const mats = new Map();
  const colours = new Map();
  for (const p of base) {
    if (p.category) catCount.set(p.category, (catCount.get(p.category) || 0) + 1);
    const m = matKey(p);
    if (m && !mats.has(m.toLowerCase())) mats.set(m.toLowerCase(), m);
    const c = colKey(p);
    if (c && !colours.has(c.toLowerCase())) colours.set(c.toLowerCase(), { name: c, hex: p.colour_main || "#ccc" });
  }
  const order = (names, list) => { const idx = (n) => { const i = list.indexOf(n); return i < 0 ? 999 : i; }; return names.sort((a, b) => idx(a) - idx(b) || a.localeCompare(b)); };
  const cats = order([...catCount.keys()], tree.map((c) => c.name));

  const prices = base.map((p) => p.price);
  const lo = prices.length ? Math.floor(Math.min(...prices) / 50) * 50 : 0;
  const hi = prices.length ? Math.ceil(Math.max(...prices) / 50) * 50 : 0;

  // URL se chuni hui values (galat values ko ignore karte hain)
  const catIn = first(sp.cat);
  const cat = catCount.has(catIn) ? catIn : "All";
  // subcategory: sirf chuni hui category ke andar
  const subCount = new Map();
  for (const p of base) if (cat !== "All" && p.category === cat && p.subcategory) subCount.set(p.subcategory, (subCount.get(p.subcategory) || 0) + 1);
  const subs = order([...subCount.keys()], (tree.find((c) => c.name === cat)?.subs || []).map((s) => s.name));
  const subIn = first(sp.sub);
  const sub = subCount.has(subIn) ? subIn : "";
  const mat = mats.get(first(sp.mat).toLowerCase()) || "";
  const colour = colours.get(first(sp.colour).toLowerCase())?.name || "";
  const num = (k, d) => {
    const raw = first(sp[k]).trim();
    const n = Number(raw);
    return raw !== "" && Number.isFinite(n) ? n : d;
  };
  let curLo = Math.min(Math.max(num("min", lo), lo), hi);
  let curHi = Math.min(Math.max(num("max", hi), lo), hi);
  if (curLo > curHi) [curLo, curHi] = [curHi, curLo];
  const stock = first(sp.stock) === "1";
  const sort = SORTS[first(sp.sort)] ? first(sp.sort) : "featured";

  let list = base.filter(
    (p) =>
      (cat === "All" || p.category === cat) &&
      (!sub || p.subcategory === sub) &&
      (!mat || eq(matKey(p), mat)) &&
      (!colour || eq(colKey(p), colour)) &&
      p.price >= curLo && p.price <= curHi &&
      (!stock || p.stock > 0)
  );
  if (sort === "newest") list = [...list].sort((a, b) => b.id - a.id);
  else if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price || a.id - b.id);
  else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price || a.id - b.id);
  else if (sort === "discount") list = [...list].sort((a, b) => pct(b) - pct(a) || a.id - b.id);

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const pageNo = Math.min(Math.max(parseInt(first(sp.page), 10) || 1, 1), pages);
  const shown = list.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  // URL banane wala helper: href({ cat: "Tote" })
  const cur = {
    q: term, cat: cat === "All" ? "" : cat, sub, mat, colour,
    min: curLo > lo ? curLo : "", max: curHi < hi ? curHi : "",
    stock: stock ? "1" : "", sort: sort === "featured" ? "" : sort,
  };
  const href = (over = {}) => {
    const p = new URLSearchParams();
    const m = { ...cur, ...over };
    if ("cat" in over && !("sub" in over)) m.sub = ""; // category badalne par subcategory hat jati hai
    for (const [k, v] of Object.entries(m)) if (v !== "" && v != null) p.set(k, String(v));
    const s = p.toString();
    return "/products" + (s ? "?" + s : "");
  };

  // lagaye hue filters ke chhote chips (har ek ko hatane ke link ke saath)
  const chips = [];
  if (cat !== "All") chips.push({ label: cat, href: href({ cat: "" }) });
  if (sub) chips.push({ label: sub, href: href({ sub: "" }) });
  if (mat) chips.push({ label: mat, href: href({ mat: "" }) });
  if (colour) chips.push({ label: colour, href: href({ colour: "" }) });
  if (cur.min !== "" || cur.max !== "") chips.push({ label: `₹${curLo.toLocaleString("en-IN")} – ₹${curHi.toLocaleString("en-IN")}`, href: href({ min: "", max: "" }) });
  if (stock) chips.push({ label: "In stock only", href: href({ stock: "" }) });

  return {
    cats, catCount, mats: [...mats.values()].sort(), colours: [...colours.values()],
    lo, hi, cat, sub, subs, subCount, mat, colour, curLo, curHi, stock, sort,
    list, shown, pages, pageNo, href, chips,
    clearAll: "/products" + (term ? "?q=" + encodeURIComponent(term) : ""),
  };
}
