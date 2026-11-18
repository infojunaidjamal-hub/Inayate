// Excel se products banane / update karne ka hisaab-kitab (check + apply)
import { all, run, transaction } from "@/lib/db";
import { categoryTree, ensureCategory, setProductCategory, refreshSummary, hasVariants } from "@/lib/catalog";

export const MAX_ROWS = 500;

// key = database ka column, header = Excel mein dikhne wala naam, aliases = jo naam bhi chal jayein
export const FIELDS = [
  { key: "sku", header: "SKU", width: 16, aliases: ["sku", "code", "productcode"], need: "Zaroori", help: "Product ki pehchan. Ye SKU pehle se hai to wahi product update hoga, nahi hai to naya banega." },
  { key: "name", header: "Name", width: 28, aliases: ["name", "naam", "productname", "product", "title"], need: "Naye product ke liye zaroori", help: "Product ka naam." },
  { key: "category", header: "Category", width: 14, aliases: ["category", "type"], need: "Optional", help: "Jaise Tote, Sling. Seller panel ki Categories se naam se match hoti hai; nayi ho to bana di jati hai. Naye product mein khali ho to General." },
  { key: "subcategory", header: "Subcategory", width: 16, aliases: ["subcategory", "subcat", "subcategoryname"], need: "Optional", help: "Category ke andar ki sub-category, jaise Laptop Tote. Nayi ho to bana di jati hai." },
  { key: "price", header: "Price", width: 10, aliases: ["price", "sellingprice", "rate"], need: "Naye product ke liye zaroori", help: "Bechne ka daam (rupaye, poora number)." },
  { key: "mrp", header: "MRP", width: 10, aliases: ["mrp", "listprice"], need: "Optional", help: "Cut wala daam. Khali ho ya price se kam ho to price jitna ho jata hai." },
  { key: "stock", header: "Stock", width: 8, aliases: ["stock", "qty", "quantity"], need: "Optional", help: "Naya TOTAL stock (jodna nahi, wahi stock ban jata hai)." },
  { key: "status", header: "Status", width: 10, aliases: ["status"], need: "Optional", help: "Active ya Draft. Naye product mein khali ho to Draft banta hai (photos lagane ke baad Active karein)." },
  { key: "material", header: "Material", width: 18, aliases: ["material"], need: "Optional", help: "Jaise Cotton Canvas." },
  { key: "colours", header: "Colours", width: 18, aliases: ["colours", "colors", "colour", "color"], need: "Optional", help: "Pehla colour is product ka colour maana jata hai (shop ke filter mein)." },
  { key: "size", header: "Size", width: 14, aliases: ["size", "dimensions"], need: "Optional", help: "Jaise 30 x 35 x 8 cm." },
  { key: "weight_g", header: "Weight (g)", width: 11, aliases: ["weightg", "weight", "weightgrams"], need: "Optional", help: "Gram mein, poora number." },
  { key: "gst_percent", header: "GST %", width: 8, aliases: ["gst", "gstpercent", "gstrate"], need: "Optional", help: "0 se 28 ke beech. Naye product mein khali ho to 12." },
  { key: "description", header: "Description", width: 40, aliases: ["description", "desc", "details"], need: "Optional", help: "Product ka vivaran." },
  { key: "colour_main", header: "Colour code (hex)", width: 18, aliases: ["colourcodehex", "colourcode", "colorcode", "colourhex", "hex"], need: "Optional", help: "Jaise #b8865b. Shop par photo na ho to isi rang ka bag dikhta hai." },
];
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------- Excel ki rows ko records mein badlo ---------- */
export function parseRecords(table) {
  const hi = table.findIndex((r) => (r || []).some((c) => String(c).trim() !== ""));
  if (hi < 0) return { error: "File khali hai" };
  const map = {}, ignored = [];
  table[hi].forEach((h, i) => {
    const f = FIELDS.find((x) => x.aliases.includes(norm(h)));
    if (f && !(f.key in map)) map[f.key] = i;
    else if (String(h).trim()) ignored.push(String(h).trim());
  });
  if (!("sku" in map)) return { error: 'Pehli row mein "SKU" naam ka column nahi mila. Template download karke use karein.' };
  const records = [];
  for (let r = hi + 1; r < table.length; r++) {
    const row = table[r] || [];
    if (!row.some((c) => String(c ?? "").trim() !== "")) continue;
    const rec = { rowNum: r + 1 };
    for (const f of FIELDS) rec[f.key] = f.key in map ? String(row[map[f.key]] ?? "").trim() : "";
    records.push(rec);
  }
  if (!records.length) return { error: "Header ke neeche koi product nahi mila" };
  if (records.length > MAX_ROWS) return { error: `Ek baar mein ${MAX_ROWS} se zyada rows nahi chalengi (aapki file mein ${records.length} hain). File ko do hisson mein baant lein.` };
  return { records, ignored };
}

/* ---------- Check ---------- */
const numClean = (s) => String(s).replace(/[₹,\s]/g, "");
function toInt(s, label, { min = 0, max = 1e9 } = {}) {
  const c = numClean(s);
  if (!/^\d+(\.0+)?$/.test(c)) return { err: `${label} poora number hona chahiye ("${s}" nahi chalega)` };
  const n = Number(c);
  if (n < min || n > max) return { err: `${label} ${min} se ${max} ke beech hona chahiye` };
  return { v: n };
}
const darken = (hex) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.72).toString(16).padStart(2, "0")).join("");
const LIMITS = { name: 120, category: 40, subcategory: 40, material: 80, colours: 80, size: 60, description: 2000, sku: 40 };
const LABEL = Object.fromEntries(FIELDS.map((f) => [f.key, f.header]));

// ctx = { variants: currentVariants(), cats: categoryList() }
export function validateImport(records, products, ctx = { variants: [], cats: [] }) {
  const bySku = new Map(products.filter((p) => p.sku).map((p) => [String(p.sku).toLowerCase(), p]));
  const byV = new Map((ctx.variants || []).map((v) => [String(v.sku).toLowerCase(), v]));
  const activeLeft = new Map(); // product -> abhi kitne variants chalu bache (file ke hisaab se)
  for (const v of ctx.variants || []) if (v.active) activeLeft.set(v.product_id, (activeLeft.get(v.product_id) || 0) + 1);
  const catNote = (out, catName, subName) => {
    const c = (ctx.cats || []).find((x) => x.name.toLowerCase() === String(catName || "").toLowerCase());
    if (catName && !c) out.notes.push(`Nayi category banegi: ${catName}`);
    if (subName && !(c && c.subs.some((s) => s.toLowerCase() === subName.toLowerCase()))) out.notes.push(`Nayi subcategory banegi: ${subName}`);
  };
  const seen = new Map();
  const rows = records.map((rec) => {
    const out = { rowNum: rec.rowNum, sku: rec.sku, name: rec.name, action: "", changes: [], errors: [], notes: [], op: null };
    const err = (m) => out.errors.push(m);
    const sku = String(rec.sku || "").trim();
    if (!sku) err("SKU khali hai");
    else if (sku.length > LIMITS.sku) err("SKU 40 akshar se chhota rakhein");
    else if (seen.has(sku.toLowerCase())) err(`Ye SKU file mein row ${seen.get(sku.toLowerCase())} par pehle aa chuka hai`);
    else seen.set(sku.toLowerCase(), rec.rowNum);

    // jo cells bhare hain unhe parse karo
    const p = {};
    for (const k of ["name", "category", "subcategory", "material", "colours", "size", "description"]) {
      const v = String(rec[k] ?? "").trim();
      if (!v) continue;
      if (v.length > LIMITS[k]) err(`${LABEL[k]} ${LIMITS[k]} akshar se chhota rakhein`);
      else p[k] = v;
    }
    for (const [k, o] of [["price", { min: 1, max: 10000000 }], ["mrp", { min: 1, max: 10000000 }], ["stock", { min: 0, max: 1000000 }], ["weight_g", { min: 1, max: 100000 }], ["gst_percent", { min: 0, max: 28 }]]) {
      if (!String(rec[k] ?? "").trim()) continue;
      const r = toInt(rec[k], LABEL[k], o);
      if (r.err) err(r.err); else p[k] = r.v;
    }
    if (String(rec.status ?? "").trim()) {
      const s = String(rec.status).trim().toLowerCase();
      if (s === "active") p.status = "Active"; else if (s === "draft") p.status = "Draft";
      else err(`Status sirf Active ya Draft ho sakta hai ("${rec.status}" nahi chalega)`);
    }
    if (String(rec.colour_main ?? "").trim()) {
      let h = String(rec.colour_main).trim();
      if (/^[0-9a-f]{6}$/i.test(h)) h = "#" + h;
      if (/^#[0-9a-f]{6}$/i.test(h)) { p.colour_main = h.toLowerCase(); p.colour_dark = darken(p.colour_main); }
      else err(`Colour code #b8865b jaisa hona chahiye ("${rec.colour_main}" nahi chalega)`);
    }

    const ex = sku ? bySku.get(sku.toLowerCase()) : null;
    const vx = !ex && sku ? byV.get(sku.toLowerCase()) : null;
    if (vx) {
      // variant ki row: sirf Price, MRP, Stock aur Status (Active / Draft) badal sakte hain
      out.name = out.name || `${vx.product_name} (${vx.label})`;
      const set = {};
      if ("price" in p) set.price = p.price;
      if ("mrp" in p) set.mrp = p.mrp;
      if ("stock" in p) set.stock = p.stock;
      if (p.status) set.active = p.status === "Active" ? 1 : 0;
      if ("price" in set || "mrp" in set) {
        const price = set.price ?? vx.price, mrp = set.mrp ?? vx.mrp;
        if (mrp < price) { set.mrp = price; out.notes.push("MRP price se kam tha, barabar kar diya"); }
      }
      for (const k of Object.keys(set)) if (String(vx[k]) === String(set[k])) delete set[k];
      const L = { price: "Price", mrp: "MRP", stock: "Stock", active: "Status" };
      for (const [k, v] of Object.entries(set)) out.changes.push({ field: L[k], from: k === "active" ? (vx.active ? "Active" : "Draft") : vx[k], to: k === "active" ? (v ? "Active" : "Draft") : v });
      if ("active" in set && !set.active) {
        const left = (activeLeft.get(vx.product_id) || 0) - 1;
        activeLeft.set(vx.product_id, left);
        if (left < 1) err("Product ka kam se kam ek variant Active rehna chahiye");
      }
      if (!out.errors.length) {
        if (Object.keys(set).length) { out.action = "update"; out.op = { type: "vupdate", id: vx.id, product_id: vx.product_id, set }; out.notes.unshift("Variant ki row"); }
        else out.action = "same";
      }
    } else if (!ex) {
      // naya product
      if (!p.name || p.name.length < 2) err("Naye product ke liye Name zaroori hai");
      if (p.price === undefined && !String(rec.price ?? "").trim()) err("Naye product ke liye Price zaroori hai");
      if (!out.errors.length) {
        catNote(out, p.category || "General", p.subcategory);
        const f = { sku, name: p.name, category: p.category || "General", subcategory: p.subcategory || null, price: p.price, mrp: p.mrp ?? p.price, stock: p.stock ?? 0, status: p.status || "Draft",
          material: p.material || null, colours: p.colours || null, size: p.size || null, weight_g: p.weight_g ?? null, gst_percent: p.gst_percent ?? 12,
          description: p.description || null, colour_main: p.colour_main || "#b8865b", colour_dark: p.colour_dark || "#8a5d3a" };
        if (f.mrp < f.price) { f.mrp = f.price; out.notes.push("MRP price se kam tha, barabar kar diya"); }
        out.action = "new";
        out.op = { type: "insert", fields: f };
        out.summary = `${f.status} · ₹${f.price} · stock ${f.stock}`;
      }
    } else {
      // purana product update
      out.name = out.name || ex.name;
      const set = { ...p };
      if (hasVariants(ex) && ("price" in set || "mrp" in set || "stock" in set)) err("Is product mein variants hain. Price, MRP aur Stock variant ki SKU wali row mein badlein");
      if (p.category && !p.subcategory) set.subcategory = ""; // category badli to purani subcategory hat jayegi
      if (p.subcategory && !p.category) set.category = ex.category;
      if (set.category !== undefined || set.subcategory !== undefined) catNote(out, set.category ?? ex.category, set.subcategory);
      if ("price" in set || "mrp" in set) {
        const price = set.price ?? ex.price, mrp = set.mrp ?? ex.mrp ?? price;
        if (mrp < price) { set.mrp = price; out.notes.push("MRP price se kam tha, barabar kar diya"); }
      }
      for (const k of Object.keys(set)) if (String(ex[k] ?? "") === String(set[k])) delete set[k];
      if ("category" in set === false && "subcategory" in set && set.subcategory === "" && !ex.subcategory) delete set.subcategory;
      if (!("colour_main" in set)) delete set.colour_dark; // rang nahi badla to dark rang bhi nahi
      for (const [k, v] of Object.entries(set)) if (k !== "colour_dark") out.changes.push({ field: LABEL[k] || k, from: ex[k] ?? "", to: v });
      if (!out.errors.length) {
        if (Object.keys(set).length) { out.action = "update"; out.op = { type: "update", id: ex.id, set }; }
        else out.action = "same";
      }
    }
    if (out.errors.length) out.action = "error";
    return out;
  });
  const counts = { new: 0, update: 0, same: 0, error: 0 };
  rows.forEach((r) => counts[r.action]++);
  return { rows, counts };
}

const UPDATABLE = new Set(["name", "price", "mrp", "stock", "status", "material", "colours", "size", "weight_g", "gst_percent", "description", "colour_main", "colour_dark"]);
const INSERT_COLS = ["name", "sku", "category", "price", "mrp", "stock", "material", "colours", "size", "weight_g", "gst_percent", "description", "status", "colour_main", "colour_dark"];

export function currentProducts() {
  return all("SELECT id, sku, name, category, subcategory, option_names, price, mrp, stock, status, material, colours, size, weight_g, gst_percent, description, colour_main, colour_dark FROM products");
}
export function currentVariants() {
  return all("SELECT v.id, v.product_id, v.sku, v.label, v.price, v.mrp, v.stock, v.active, p.name AS product_name FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.sku NOT LIKE '%~%' ORDER BY v.product_id, v.position, v.id");
}
export const categoryList = () => categoryTree().map((c) => ({ name: c.name, subs: c.subs.map((s) => s.name) }));
export const importContext = () => ({ variants: currentVariants(), cats: categoryList() });

// Category / subcategory naam se lagao (nayi ho to bana do)
function applyCategory(productId, catName, subName) {
  const c = ensureCategory(catName || "General", null);
  const s = subName ? ensureCategory(subName, c.id) : null;
  setProductCategory(productId, c.id, s ? s.id : null);
}

// Dobara check karke (taaza database ke saath) sahi rows ko lagata hai. Ya sab lagta hai, ya kuch nahi.
export function applyImport(records) {
  const products = currentProducts();
  const v = validateImport(records, products, importContext());
  const touched = new Set();
  transaction(() => {
    for (const r of v.rows) {
      if (r.op?.type === "insert") {
        const id = Number(run(`INSERT INTO products (${INSERT_COLS.join(",")}) VALUES (${INSERT_COLS.map(() => "?").join(",")})`, ...INSERT_COLS.map((c) => r.op.fields[c] ?? null)).lastInsertRowid);
        applyCategory(id, r.op.fields.category, r.op.fields.subcategory);
      } else if (r.op?.type === "update") {
        const keys = Object.keys(r.op.set).filter((k) => UPDATABLE.has(k));
        if (keys.length) run(`UPDATE products SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`, ...keys.map((k) => r.op.set[k]), r.op.id);
        if ("category" in r.op.set || "subcategory" in r.op.set) {
          const ex = products.find((p) => p.id === r.op.id);
          applyCategory(r.op.id, r.op.set.category ?? ex.category, "subcategory" in r.op.set ? r.op.set.subcategory : ex.subcategory);
        }
      } else if (r.op?.type === "vupdate") {
        const keys = Object.keys(r.op.set).filter((k) => ["price", "mrp", "stock", "active"].includes(k));
        if (keys.length) run(`UPDATE product_variants SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`, ...keys.map((k) => r.op.set[k]), r.op.id);
        touched.add(r.op.product_id);
      }
    }
    for (const pid of touched) refreshSummary(pid);
  });
  return v.counts;
}

/* ---------- Template ---------- */
export const HEADERS = FIELDS.map((f) => ({ key: f.key, header: f.header, width: f.width, type: ["price", "mrp", "stock", "weight_g", "gst_percent"].includes(f.key) ? "int" : "text" }));

// "Abhi ke products" template: simple product ek row, variants wale product ki har variant ek row
export function templateRows() {
  const rows = [];
  const vs = currentVariants();
  for (const p of all("SELECT * FROM products ORDER BY id")) {
    if (hasVariants(p)) {
      for (const v of vs.filter((x) => x.product_id === p.id)) {
        rows.push({ ...p, sku: v.sku, name: `${p.name} (${v.label})`, price: v.price, mrp: v.mrp, stock: v.stock, status: v.active ? "Active" : "Draft" });
      }
    } else rows.push(p);
  }
  return rows;
}

export function instructionRows() {
  const rules = [
    ["SKU = product ki pehchan", "", "SKU pehle se database mein hai to wo product update hoga. Nahi hai to naya product banega."],
    ["Khali cell", "", "Update mein khali cell ka matlab: purani value waisi hi rahegi. Kuch bhi delete nahi hota."],
    ["Naya product", "", "Name aur Price zaroori hain. Status khali ho to Draft banta hai (photos product edit page se lagayein, phir Active karein)."],
    ["Stock", "", "Jo number likhenge wahi naya total stock ban jayega."],
    ["Category / Subcategory", "", "Naam seller panel ki Categories se match hota hai (chhote-bade akshar ka farak nahi). Naya naam likha to preview mein \"Nayi category banegi\" dikhega aur Apply par ban jayegi."],
    ["Variants", "", "Variants wale product ki har variant ki apni SKU wali row hoti hai. Us row mein sirf Price, MRP, Stock aur Status (Active / Draft) badalte hain. Naye variants product edit page se banate hain."],
    ["Photos", "", "Photos Excel se nahi judti. Wo product edit page se lagti hain."],
    ["Limit", "", `Ek baar mein ${MAX_ROWS} rows tak. File 1 MB se chhoti rakhein.`],
    ["Check pehle", "", "Upload ke baad pehle check dikhega. Kuch tab tak nahi badalta jab tak aap Apply na dabayein."],
  ].map(([a, b, c]) => ({ col: a, need: b, help: c }));
  const cols = FIELDS.map((f) => ({ col: f.header, need: f.need, help: f.help }));
  return [...rules, { col: "", need: "", help: "" }, { col: "COLUMNS", need: "", help: "" }, ...cols];
}

export function templateColumnsForInstructions() {
  return [{ key: "col", header: "Column / Niyam", width: 26 }, { key: "need", header: "Zaroori?", width: 28 }, { key: "help", header: "Matlab", width: 90 }];
}
