import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, one, inr } from "@/lib/db";
import { withCovers } from "@/lib/images";
import { categoryTree, lowStockProducts, LOW_STOCK_AT } from "@/lib/catalog";
import { bulkProducts, duplicateById } from "./actions";
import BulkControls from "./BulkControls";
import "./products.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products – Seller Panel" };
const PER = 25;
const g = (sp, k) => String(Array.isArray(sp[k]) ? sp[k][0] : sp[k] ?? "").trim();

export default async function SellerProducts({ searchParams }) {
  await requirePerm("products");
  const sp = await searchParams;
  const f = { q: g(sp, "q").slice(0, 60), cat: g(sp, "cat"), status: ["Active", "Draft"].includes(g(sp, "status")) ? g(sp, "status") : "", stock: ["low", "out", "in"].includes(g(sp, "stock")) ? g(sp, "stock") : "" };
  const low = lowStockProducts();
  const lowIds = new Map(low.map((p) => [p.id, p.stock]));

  const w = [], params = [];
  if (f.q) { const l = `%${f.q}%`; w.push("(p.name LIKE ? OR p.sku LIKE ? OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.sku LIKE ?))"); params.push(l, l, l); }
  if (f.cat) { w.push("(p.category_id = ? OR p.subcategory_id = ?)"); params.push(Number(f.cat), Number(f.cat)); }
  if (f.status) { w.push("p.status = ?"); params.push(f.status); }
  if (f.stock === "out") w.push("p.stock = 0");
  if (f.stock === "in") w.push("p.stock > 0");
  if (f.stock === "low") { if (low.length) { w.push(`p.id IN (${low.map(() => "?").join(",")})`); params.push(...low.map((p) => p.id)); } else w.push("0"); }
  const where = w.length ? "WHERE " + w.join(" AND ") : "";

  const total = one(`SELECT COUNT(*) n FROM products p ${where}`, ...params).n;
  const pages = Math.max(1, Math.ceil(total / PER));
  const page = Math.min(Math.max(parseInt(g(sp, "page"), 10) || 1, 1), pages);
  const rows = withCovers(all(
    `SELECT p.*, (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS vcount,
            (SELECT MIN(price) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS vmin,
            (SELECT MAX(price) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS vmax
       FROM products p ${where} ORDER BY p.id DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`, ...params));
  const tree = categoryTree();

  const url = (over = {}) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...over })) if (v !== "" && v != null) p.set(k, String(v));
    const s = p.toString();
    return "/seller/products" + (s ? "?" + s : "");
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Products</h1>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/seller/bulk" className="btn o">Bulk upload (Excel)</Link>
          <Link href="/seller/products/new" className="btn a">+ Add product</Link>
        </span>
      </div>
      <p className="mut" style={{ margin: "4px 0 16px" }}>Search, filter and update many products at once.</p>

      {low.length > 0 && f.stock !== "low" && (
        <div className="pl-alert"><b>{low.length} {low.length === 1 ? "product has" : "products have"} fewer than {LOW_STOCK_AT} left.</b> <Link href={url({ stock: "low", page: "" })} style={{ textDecoration: "underline" }}>Show low stock</Link></div>
      )}

      <form action="/seller/products" className="pl-filter" role="search">
        <label style={{ flex: 1, minWidth: 200 }}>Search<input name="q" defaultValue={f.q} placeholder="Name or SKU" /></label>
        <label>Category
          <select name="cat" defaultValue={f.cat}>
            <option value="">All</option>
            {tree.flatMap((c) => [<option key={c.id} value={c.id}>{c.name}</option>, ...c.subs.map((s) => <option key={s.id} value={s.id}>&nbsp;&nbsp;{c.name} › {s.name}</option>)])}
          </select>
        </label>
        <label>Status<select name="status" defaultValue={f.status}><option value="">All</option><option>Active</option><option>Draft</option></select></label>
        <label>Stock<select name="stock" defaultValue={f.stock}><option value="">All</option><option value="in">In stock</option><option value="low">Low stock (under {LOW_STOCK_AT})</option><option value="out">Out of stock</option></select></label>
        <button className="btn a">Apply</button>
        {(f.q || f.cat || f.status || f.stock) && <Link href="/seller/products" style={{ alignSelf: "center", textDecoration: "underline", fontSize: 13 }}>Clear</Link>}
      </form>

      <form action={bulkProducts} id="plist">
        <BulkControls formId="plist" />
        <div className="pl-tw">
          <table>
            <thead><tr><th></th><th>Product</th><th>Category</th><th>Variants</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="mut" style={{ padding: 18 }}>No products found.</td></tr>}
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} style={{ width: "auto", margin: 0 }} /></td>
                  <td>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="pl-th">{p.image ? <img src={p.image} alt="" /> : <i style={{ background: p.colour_main }} />}</span>
                      <span><Link href={`/seller/products/${p.id}`}><b>{p.name}</b></Link><br /><span className="mut">{p.sku}</span></span>
                    </span>
                  </td>
                  <td>{p.category}{p.subcategory ? <span className="mut"> › {p.subcategory}</span> : null}</td>
                  <td>{p.vcount ? `${p.vcount} ${p.vcount === 1 ? "variant" : "variants"}` : <span className="mut">None</span>}</td>
                  <td>{p.vcount && p.vmax > p.vmin ? `${inr(p.vmin)} to ${inr(p.vmax)}` : inr(p.price)}</td>
                  <td>{p.stock}{lowIds.has(p.id) && <span className="tag y" style={{ marginLeft: 6 }}>{lowIds.get(p.id) === 0 ? "Out of stock" : `Low: ${lowIds.get(p.id)} left`}</span>}</td>
                  <td><span className={"tag " + (p.status === "Active" ? "g" : "y")}>{p.status}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link href={`/seller/products/${p.id}`} style={{ textDecoration: "underline" }}>Edit</Link>
                    {" · "}
                    <button type="submit" formAction={duplicateById.bind(null, p.id)} className="pl-link">Duplicate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      {pages > 1 && (
        <nav className="pl-pages" aria-label="Pages">
          {page > 1 && <Link href={url({ page: page - 1 > 1 ? page - 1 : "" })}>‹ Prev</Link>}
          <span className="mut">Page {page} of {pages}</span>
          {page < pages && <Link href={url({ page: page + 1 })}>Next ›</Link>}
        </nav>
      )}
      <p className="mut" style={{ fontSize: 13 }}>{total} {total === 1 ? "product" : "products"}. Excel upload understands Category, Subcategory and variant SKUs.</p>
    </>
  );
}
