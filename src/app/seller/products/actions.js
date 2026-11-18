"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { isColourOption, isHex, parseSwatches } from "@/lib/swatch";
import { applyImages } from "@/lib/images";
import { setProductCategory, refreshSummary } from "@/lib/catalog";

const refresh = () => { revalidatePath("/", "layout"); revalidatePath("/products"); };
const HEX = /^#[0-9a-fA-F]{6}$/;
const toInt = (x) => (/^\d+$/.test(String(x).trim()) ? Number(x) : NaN);

// Seller ke chune colours: sirf colour option ki maujooda values ke liye, sahi hex hi rakhte hain
function cleanSwatches(raw, names, rows) {
  const ci = names.findIndex((n) => isColourOption(n));
  if (ci < 0) return null;
  const present = new Set(rows.map((r) => r.opts[ci]));
  const out = {};
  for (const [k, val] of Object.entries(parseSwatches(raw))) if (present.has(k) && isHex(val)) out[k] = String(val).toLowerCase();
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

// ---------- variants ka data check ----------
function parseVariants(v, pid) {
  let names = [];
  try { names = v.option_names ? JSON.parse(v.option_names) : []; } catch { return { error: "Variants ka data padh nahi paya. Page refresh karke dobara try karein." }; }
  if (!Array.isArray(names) || names.length === 0) return { names: [], rows: [] };
  names = names.map((n) => String(n ?? "").trim());
  if (names.length > 3) return { error: "At most 3 options are allowed (for example Colour, Size, Material)." };
  if (names.some((n) => !n || n.length > 30)) return { error: "Every option needs a name (up to 30 characters)." };
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return { error: "Option names must be different." };

  let rows;
  try { rows = JSON.parse(v.variants || "[]"); } catch { return { error: "Variants ka data padh nahi paya." }; }
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Add at least one value for each option, or turn variants off." };
  if (rows.length > 100) return { error: "A product can have at most 100 variants." };

  const mySkus = new Set();
  const combos = new Set();
  const ownIds = new Set(pid ? all("SELECT id FROM product_variants WHERE product_id = ?", pid).map((r) => r.id) : []);
  const imgs = new Set(pid ? all("SELECT url FROM product_images WHERE product_id = ?", pid).map((r) => r.url) : []);
  const out = [];
  for (const [i, r] of rows.entries()) {
    const opts = Array.isArray(r.opts) ? r.opts.map((x) => String(x ?? "").trim()) : [];
    const where = `Variant ${i + 1}`;
    if (opts.length !== names.length || opts.some((x) => !x || x.length > 40)) return { error: `${where}: every option needs a value (up to 40 characters).` };
    const ck = opts.join("\u0001").toLowerCase();
    if (combos.has(ck)) return { error: `${opts.join(" / ")} is added twice.` };
    combos.add(ck);
    const label = opts.join(" / ");
    const sku = String(r.sku ?? "").trim();
    if (!sku || sku.length > 40) return { error: `${label}: SKU is needed (up to 40 characters).` };
    if (mySkus.has(sku.toLowerCase())) return { error: `SKU "${sku}" is used twice in this product.` };
    mySkus.add(sku.toLowerCase());
    const price = toInt(r.price), stock = toInt(r.stock === "" || r.stock == null ? 0 : r.stock);
    let mrp = r.mrp === "" || r.mrp == null ? price : toInt(r.mrp);
    if (!Number.isInteger(price) || price <= 0) return { error: `${label}: price should be a whole number above 0.` };
    if (!Number.isInteger(stock) || stock < 0) return { error: `${label}: stock should be 0 or more.` };
    if (!Number.isInteger(mrp) || mrp < price) mrp = price;
    const vid = Number(r.id) || 0;
    out.push({ id: ownIds.has(vid) ? vid : 0, opts, label, sku, price, mrp, stock, active: r.active ? 1 : 0, image: r.image && imgs.has(r.image) ? r.image : null, position: i });
  }
  if (!out.some((r) => r.active)) return { error: "At least one variant must be active." };
  // SKU kisi aur product ya variant ka na ho
  for (const r of out) {
    const pc = one("SELECT id, name FROM products WHERE lower(sku) = lower(?) AND id <> ?", r.sku, pid || 0);
    if (pc) return { error: `Variant SKU "${r.sku}" is already the SKU of the listing "${pc.name}" (#${pc.id}). Use a different SKU for this variant.` };
    const vc = one("SELECT v.id, p.name, p.id AS pid FROM product_variants v JOIN products p ON p.id = v.product_id WHERE lower(v.sku) = lower(?) AND v.id <> ? AND v.product_id <> ?", r.sku, r.id, pid || 0);
    if (vc) return { error: `Variant SKU "${r.sku}" is already used by a variant of "${vc.name}" (#${vc.pid}). Use a different SKU.` };
  }
  return { names, rows: out };
}

// Agla khali SKU suggest karta hai (BS-1 -> BS-1-2)
function freeSku(base) {
  let sku = `${base}-2`, n = 3;
  while (one("SELECT id FROM products WHERE lower(sku) = lower(?)", sku) || one("SELECT id FROM product_variants WHERE lower(sku) = lower(?)", sku)) sku = `${base}-${n++}`;
  return sku;
}

/* ---------- Save (naya / edit) ---------- */
export async function saveProduct(prev, form) {
  const me = await requirePerm("products");
  const id = Number(form.get("id") || 0);
  const g = (k) => String(form.get(k) ?? "").trim();
  const v = {
    name: g("name"), sku: g("sku"), category_id: g("category_id"), subcategory_id: g("subcategory_id"),
    price: g("price"), mrp: g("mrp"), stock: g("stock"), material: g("material"), colours: g("colours"), size: g("size"),
    weight_g: g("weight_g"), gst_percent: g("gst_percent") || "12", hsn: g("hsn").replace(/\D/g, ""), description: g("description"),
    status: g("status"), colour_main: g("colour_main"), colour_dark: g("colour_dark"),
    specs: g("specs").slice(0, 3000), group_key: g("group_key").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40),
    box_l: g("box_l"), box_w: g("box_w"), box_h: g("box_h"),
    option_names: g("option_names"), variants: g("variants"), option_swatches: g("option_swatches"),
    rating_start: g("rating_start"), rating_start_count: g("rating_start_count"), show_rating: form.get("show_rating") ? "1" : "",
  };
  const fail = (error) => ({ error, values: v });

  if (v.name.length < 2) return fail("Write the product name.");
  if (!v.sku) return fail("Write a SKU (for example MB-TOTE-01).");
  const cat = one("SELECT id, name FROM categories WHERE id = ? AND parent_id IS NULL", Number(v.category_id));
  if (!cat) return fail("Choose a category.");
  const sub = v.subcategory_id ? one("SELECT id FROM categories WHERE id = ? AND parent_id = ?", Number(v.subcategory_id), cat.id) : null;
  if (v.subcategory_id && !sub) return fail("This subcategory does not belong to the chosen category.");

  const vr = parseVariants(v, id);
  if (vr.error) return fail(vr.error);
  // Variants listing ke waqt nahi bante. Jis listing mein pehle se hain wahi edit / band ho sakte hain.
  if (vr.rows.length && !(id && one("SELECT 1 x FROM product_variants WHERE product_id = ? LIMIT 1", id))) {
    return fail("Variants cannot be created while listing. List each colour as its own listing, then join them in Seller > Listing groups.");
  }
  const withVariants = vr.rows.length > 0;

  let price, mrp, stock;
  if (withVariants) {
    const first = vr.rows.find((r) => r.active) || vr.rows[0];
    price = first.price; mrp = first.mrp; stock = vr.rows.reduce((s, r) => s + (r.active ? r.stock : 0), 0); // refreshSummary baad mein sahi karega
  } else {
    price = Number(v.price); stock = Number(v.stock); mrp = v.mrp ? Number(v.mrp) : price;
    if (!Number.isInteger(price) || price <= 0) return fail("Price should be a whole number (for example 1499).");
    if (!Number.isInteger(mrp) || mrp < price) return fail("MRP cannot be less than the price.");
    if (!Number.isInteger(stock) || stock < 0) return fail("Stock should be 0 or more.");
  }
  const weight = v.weight_g ? Number(v.weight_g) : null;
  const gst = Number(v.gst_percent);
  const box = [v.box_l, v.box_w, v.box_h].map((x) => (x === "" ? null : Number(x)));
  if (box.some((x) => x !== null && (!Number.isInteger(x) || x < 1 || x > 300))) return fail("Box size (L, W, H) cm mein 1 se 300 ke beech poora number hona chahiye.");
  if (weight !== null && (!Number.isInteger(weight) || weight < 0)) return fail("Weight should be a whole number in grams.");
  if (!Number.isInteger(gst) || gst < 0 || gst > 28) return fail("GST % should be between 0 and 28.");
  if (v.hsn && ![4, 6, 8].includes(v.hsn.length)) return fail("HSN code should have 4, 6 or 8 digits.");
  if (!["Active", "Draft"].includes(v.status)) return fail("Choose a status.");
  if (!HEX.test(v.colour_main) || !HEX.test(v.colour_dark)) return fail("Choose the colours properly.");
  const clash = one("SELECT id, name FROM products WHERE lower(sku) = lower(?) AND id <> ?", v.sku, id);
  if (clash) return fail(`SKU "${v.sku}" is already used by the listing "${clash.name}" (#${clash.id}). Every listing needs its own SKU. Try "${freeSku(v.sku)}". (If you want them shown together as colours, save this listing and then join both in Seller > Groups.)`);
  const vclash = one("SELECT p.id, p.name FROM product_variants x JOIN products p ON p.id = x.product_id WHERE lower(x.sku) = lower(?) AND x.product_id <> ?", v.sku, id);
  if (vclash) return fail(`SKU "${v.sku}" is already used by a variant of "${vclash.name}" (#${vclash.id}). Try "${freeSku(v.sku)}".`);

  // rating
  let rs = null, rc = 0;
  if (v.rating_start || v.rating_start_count) {
    rs = Number(v.rating_start); rc = v.rating_start_count === "" ? 0 : toInt(v.rating_start_count);
    if (!(rs >= 1 && rs <= 5)) return fail("Starting rating should be between 1 and 5.");
    if (!Number.isInteger(rc) || rc < 1 || rc > 100000) return fail("Enter how many ratings the starting rating is based on (1 or more).");
    rs = Math.round(rs * 10) / 10;
  }
  const showRating = v.show_rating ? 1 : 0;

  if (id && !one("SELECT id FROM products WHERE id = ?", id)) return fail("Product not found.");
  const optionNames = withVariants ? JSON.stringify(vr.names) : null;
  const swatchesJson = withVariants ? cleanSwatches(v.option_swatches, vr.names, vr.rows) : null;

  let pid = id;
  try {
    transaction(() => {
      const vals = [v.name, v.sku, cat.name, price, mrp, stock, v.material, v.colours, v.size, weight, gst, v.description, v.status, v.colour_main, v.colour_dark, v.specs, v.group_key || null, optionNames, rs, rc, showRating];
      if (id) {
        run(`UPDATE products SET name=?, sku=?, category=?, price=?, mrp=?, stock=?, material=?, colours=?, size=?, weight_g=?, gst_percent=?, description=?, status=?, colour_main=?, colour_dark=?, specs=?, group_key=?, option_names=?, rating_start=?, rating_start_count=?, show_rating=? WHERE id=?`, ...vals, id);
      } else {
        pid = Number(run(`INSERT INTO products (name, sku, category, price, mrp, stock, material, colours, size, weight_g, gst_percent, description, status, colour_main, colour_dark, specs, group_key, option_names, rating_start, rating_start_count, show_rating) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, ...vals).lastInsertRowid);
      }
      setProductCategory(pid, cat.id, sub ? sub.id : null);
      run("UPDATE products SET option_swatches = ? WHERE id = ?", swatchesJson, pid);
      run("UPDATE products SET box_l = ?, box_w = ?, box_h = ? WHERE id = ?", box[0], box[1], box[2], pid); // courier ke volumetric weight ke liye
      run("UPDATE products SET hsn = ? WHERE id = ?", v.hsn || null, pid); // GST invoice ke liye HSN

      // variants: purani rows ko update (id wahi rehti hai, cart / orders ki wajah se), nayi ko insert
      const existing = all("SELECT id FROM product_variants WHERE product_id = ?", pid).map((r) => r.id);
      const keep = new Set(vr.rows.filter((r) => r.id).map((r) => r.id));
      for (const eid of existing) if (keep.has(eid)) run("UPDATE product_variants SET sku = '~' || id || '~' WHERE id = ?", eid); // SKU badalne ki takkar se bachne ke liye
      for (const r of vr.rows) {
        if (r.id) run("UPDATE product_variants SET sku=?, opts=?, label=?, price=?, mrp=?, stock=?, image=?, active=?, position=? WHERE id=? AND product_id=?", r.sku, JSON.stringify(r.opts), r.label, r.price, r.mrp, r.stock, r.image, r.active, r.position, r.id, pid);
        else run("INSERT INTO product_variants (product_id, sku, opts, label, price, mrp, stock, image, active, position) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, r.sku, JSON.stringify(r.opts), r.label, r.price, r.mrp, r.stock, r.image, r.active, r.position);
      }
      for (const eid of existing.filter((x) => !keep.has(x))) {
        // jis variant par order ho chuka hai use hatate nahi, band kar dete hain
        if (one("SELECT 1 x FROM order_items WHERE variant_id = ? LIMIT 1", eid)) run("UPDATE product_variants SET active = 0, sku = sku || '~old' || id WHERE id = ?", eid);
        else run("DELETE FROM product_variants WHERE id = ?", eid);
      }
      if (withVariants) refreshSummary(pid);
    });
  } catch (e) {
    console.error("saveProduct:", e);
    return fail("Could not save. Check that the SKUs are not used anywhere else.");
  }

  // Product ban chuka hai. Photo mein dikkat aaye to bhi yahin se edit page par bhej do, taaki dobara save dabane par "SKU already used" na aaye.
  let imgMsg = "";
  try {
    imgMsg = await applyImages(pid, form);
    // hataayi gayi photo kisi variant mein lagi thi to wo hata do
    run("UPDATE product_variants SET image = NULL WHERE product_id = ? AND image IS NOT NULL AND image NOT IN (SELECT url FROM product_images WHERE product_id = ?)", pid, pid);
  } catch (e) {
    console.error("saveProduct photos:", e);
    imgMsg = "The listing was saved, but its photos could not be saved. Open it and add the photos again.";
  }
  logAct(me, id ? "Product badla" : "Product jodha", `${v.name} (${v.sku})`);
  refresh();
  redirect(imgMsg ? `/seller/products/${pid}?imgerr=${encodeURIComponent(imgMsg)}` : "/seller/products");
}

/* ---------- Duplicate ---------- */
function uniqueSku(base) {
  let sku = `${base}-COPY`, n = 2;
  while (one("SELECT id FROM products WHERE lower(sku) = lower(?)", sku) || one("SELECT id FROM product_variants WHERE lower(sku) = lower(?)", sku)) sku = `${base}-COPY${n++}`;
  return sku;
}

function duplicateOne(id) { // ("use server" file mein sirf async functions export ho sakte hain, isliye ye export nahi)
  const p = one("SELECT * FROM products WHERE id = ?", id);
  if (!p) return null;
  const skip = new Set(["id", "created_at", "name", "sku", "status", "stock", "rating_start", "rating_start_count"]);
  const cols = all("PRAGMA table_info(products)").map((c) => c.name).filter((c) => !skip.has(c));
  let newId = 0;
  transaction(() => {
    newId = Number(run(
      `INSERT INTO products (name, sku, status, stock, rating_start, rating_start_count, ${cols.join(", ")}) VALUES (?, ?, 'Draft', 0, NULL, 0, ${cols.map(() => "?").join(", ")})`,
      `${p.name} (Copy)`, uniqueSku(p.sku), ...cols.map((c) => p[c])
    ).lastInsertRowid);
    for (const im of all("SELECT url, position FROM product_images WHERE product_id = ? ORDER BY position, id", id)) run("INSERT INTO product_images (product_id, url, position) VALUES (?,?,?)", newId, im.url, im.position);
    for (const vv of all("SELECT * FROM product_variants WHERE product_id = ? AND active = 1 ORDER BY position, id", id)) {
      run("INSERT INTO product_variants (product_id, sku, opts, label, price, mrp, stock, image, active, position) VALUES (?,?,?,?,?,?,0,?,1,?)", newId, uniqueSku(vv.sku), vv.opts, vv.label, vv.price, vv.mrp, vv.image, vv.position);
    }
    if (p.option_names && p.option_names !== "[]") refreshSummary(newId);
  });
  return newId;
}

// List ki row ka "Duplicate" button: id bind hokar aati hai (formAction wale button par name/value kaam nahi karte)
export async function duplicateById(id) {
  await requirePerm("products");
  const nid = duplicateOne(Number(id));
  refresh();
  redirect(nid ? `/seller/products/${nid}` : "/seller/products");
}

export async function duplicateProduct(form) {
  await requirePerm("products");
  const nid = duplicateOne(Number(form.get("id")));
  refresh();
  redirect(nid ? `/seller/products/${nid}` : "/seller/products");
}

/* ---------- List par bulk kaam ---------- */
export async function bulkProducts(form) {
  await requirePerm("products");
  const ids = [...new Set(form.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);
  const intent = String(form.get("intent") || "");
  if (!ids.length) return;
  if (intent === "active" || intent === "draft") {
    run(`UPDATE products SET status = ? WHERE id IN (${ids.map(() => "?").join(",")})`, intent === "active" ? "Active" : "Draft", ...ids);
  } else if (intent === "duplicate") {
    for (const id of ids.slice(0, 20)) duplicateOne(id);
  }
  refresh();
}
