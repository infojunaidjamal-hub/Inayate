// Catalogue ke helpers: categories, variants, stock, kam stock
import { all, one, run } from "@/lib/db";
import { ensureDailyBackup } from "@/lib/backup";

export const LOW_STOCK_AT = 3; // 3 se kam bachne par "kam stock"

/* ---------- Roz ka backup ---------- */
export function dailyBackup() {
  const g = globalThis;
  const day = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  if (g.__maisonBackupDay === day) return;
  one("SELECT 1"); // database khul jaye
  if (g.__maisonDbRW) ensureDailyBackup(g.__maisonDbRW);
  g.__maisonBackupDay = day;
}

/* ---------- Categories ---------- */
// Hidden category (ya subcategory) ke products shop / home / search mein nahi dikhte.
export const VISIBLE_SQL = `(category_id IS NULL OR category_id NOT IN (SELECT id FROM categories WHERE visible = 0))
  AND (subcategory_id IS NULL OR subcategory_id NOT IN (SELECT id FROM categories WHERE visible = 0))`;

// [{ id, name, visible, photo, position, count, subs: [{ id, name, visible, photo, count }] }]
export function categoryTree({ onlyVisible = false } = {}) {
  const rows = all("SELECT * FROM categories ORDER BY position, id");
  const counts = Object.fromEntries(all("SELECT category_id c, COUNT(*) n FROM products WHERE category_id IS NOT NULL GROUP BY category_id").map((r) => [r.c, r.n]));
  const subCounts = Object.fromEntries(all("SELECT subcategory_id c, COUNT(*) n FROM products WHERE subcategory_id IS NOT NULL GROUP BY subcategory_id").map((r) => [r.c, r.n]));
  const mains = rows.filter((r) => !r.parent_id && (!onlyVisible || r.visible));
  return mains.map((m) => ({
    ...m, count: counts[m.id] || 0,
    subs: rows.filter((s) => s.parent_id === m.id && (!onlyVisible || (s.visible && m.visible))).map((s) => ({ ...s, count: subCounts[s.id] || 0 })),
  }));
}

// Naam se category dhoondho; na mile to bana do (Excel upload ke liye). Wapas deta hai { id, created }
export function ensureCategory(name, parentId = null) {
  const n = String(name || "").trim();
  if (!n) return null;
  const ex = one("SELECT id FROM categories WHERE COALESCE(parent_id,0) = ? AND lower(name) = lower(?)", parentId || 0, n);
  if (ex) return { id: ex.id, created: false };
  const pos = one("SELECT COALESCE(MAX(position), -1) + 1 p FROM categories WHERE COALESCE(parent_id,0) = ?", parentId || 0).p;
  const r = run("INSERT INTO categories (name, parent_id, position) VALUES (?,?,?)", n, parentId, pos);
  return { id: Number(r.lastInsertRowid), created: true };
}

// Product ki category (id aur text dono) set karta hai. Text naam isliye rakhte hain ki shop / reports / Excel purane tareeke se chalte rahen
export function setProductCategory(productId, categoryId, subcategoryId = null) {
  const c = categoryId ? one("SELECT id, name FROM categories WHERE id = ? AND parent_id IS NULL", categoryId) : null;
  const s = c && subcategoryId ? one("SELECT id, name FROM categories WHERE id = ? AND parent_id = ?", subcategoryId, c.id) : null;
  run("UPDATE products SET category_id = ?, category = COALESCE(?, category), subcategory_id = ?, subcategory = ? WHERE id = ?",
    c ? c.id : null, c ? c.name : null, s ? s.id : null, s ? s.name : null, productId);
}

/* ---------- Variants ---------- */
export const hasVariants = (p) => !!p?.option_names && p.option_names !== "[]";
export const optionNames = (p) => { try { const a = JSON.parse(p?.option_names || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };

export function variantsOf(productId, { activeOnly = false } = {}) {
  return all(`SELECT * FROM product_variants WHERE product_id = ? ${activeOnly ? "AND active = 1" : ""} ORDER BY position, id`, productId)
    .map((v) => ({ ...v, opts: (() => { try { return JSON.parse(v.opts); } catch { return []; } })() }));
}

// Variants wale product par price / mrp / stock "summary" hote hain: sabse kam price, kul stock.
// Isse shop, search, Excel, reports bina badle chalte rehte hain.
export function refreshSummary(productId) {
  const vs = all("SELECT price, mrp, stock FROM product_variants WHERE product_id = ? AND active = 1", productId);
  if (!vs.length) return;
  const pool = vs.some((v) => v.stock > 0) ? vs.filter((v) => v.stock > 0) : vs;
  const best = [...pool].sort((a, b) => a.price - b.price)[0];
  run("UPDATE products SET price = ?, mrp = ?, stock = ? WHERE id = ?", best.price, best.mrp, vs.reduce((s, v) => s + v.stock, 0), productId);
}

// Cards ke liye: har product par has_variants aur price_max (jis par "From" likhna ho)
export function withVariantInfo(rows) {
  const ids = rows.filter(hasVariants).map((r) => r.id);
  if (!ids.length) return rows.map((r) => ({ ...r, has_variants: false, price_max: r.price }));
  const m = new Map(all(`SELECT product_id, MAX(price) mx FROM product_variants WHERE active = 1 AND product_id IN (${ids.map(() => "?").join(",")}) GROUP BY product_id`, ...ids).map((r) => [r.product_id, r.mx]));
  return rows.map((r) => (hasVariants(r) ? { ...r, has_variants: true, price_max: m.get(r.id) || r.price } : { ...r, has_variants: false, price_max: r.price }));
}

/* ---------- Stock (variant ho ya na ho, sab yahin se) ---------- */
// Order ke time stock kam karna. false = itna stock nahi tha.
export function takeStock(productId, variantId, qty) {
  if (variantId) {
    const r = run("UPDATE product_variants SET stock = stock - ? WHERE id = ? AND product_id = ? AND active = 1 AND stock >= ?", qty, variantId, productId, qty);
    if (r.changes !== 1) return false;
    refreshSummary(productId);
    return true;
  }
  return run("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", qty, productId, qty).changes === 1;
}

// Cancel / expire par stock wapas
export function giveStock(productId, variantId, qty) {
  if (!productId) return;
  if (variantId) {
    if (run("UPDATE product_variants SET stock = stock + ? WHERE id = ? AND product_id = ?", qty, variantId, productId).changes) refreshSummary(productId);
    return;
  }
  run("UPDATE products SET stock = stock + ? WHERE id = ?", qty, productId);
}

/* ---------- Kam stock ---------- */
// Simple product: stock < 3.  Variants wala: koi bhi chalu variant ka stock < 3.  Wapas: products (stock = sabse kam wala variant)
export function lowStockProducts() {
  const simple = all("SELECT * FROM products WHERE status = 'Active' AND (option_names IS NULL OR option_names = '[]') AND stock < ? ORDER BY stock, id", LOW_STOCK_AT);
  const withV = all(
    `SELECT p.*, MIN(v.stock) AS low FROM products p JOIN product_variants v ON v.product_id = p.id
      WHERE p.status = 'Active' AND v.active = 1 GROUP BY p.id HAVING MIN(v.stock) < ? ORDER BY low, p.id`, LOW_STOCK_AT
  ).map(({ low, ...p }) => ({ ...p, stock: low }));
  return [...simple, ...withV].sort((a, b) => a.stock - b.stock || a.id - b.id);
}
