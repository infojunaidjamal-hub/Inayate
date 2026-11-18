import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { categoryTree } from "@/lib/catalog";
import { moveCategory, updateCategory, deleteCategory } from "./actions";
import AddCategory from "./AddCategory";
import "./categories.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories – Seller Panel" };

// ek category (ya subcategory) ki row. "Edit" dabane par neeche edit panel khulta hai (?edit=id)
function Block({ c, sub, editing }) {
  const canDelete = c.count === 0 && !(c.subs && c.subs.length);
  return (
    <div>
      <div className={"cg-row" + (sub ? " sub" : "")}>
        <span className="cg-th">{c.photo ? <img src={c.photo} alt="" /> : null}</span>
        <span className="cg-name"><b>{c.name}</b><small>{c.count} {c.count === 1 ? "product" : "products"}</small></span>
        <span className={"tag " + (c.visible ? "g" : "y")}>{c.visible ? "Visible" : "Hidden"}</span>
        <span className="cg-ctl">
          <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" /><button aria-label={`Move ${c.name} up`}>Up</button></form>
          <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" /><button aria-label={`Move ${c.name} down`}>Down</button></form>
          <Link href={editing ? "/seller/categories" : `/seller/categories?edit=${c.id}`} className="cg-editlink" aria-label={`Edit ${c.name}`}>{editing ? "Close" : "Edit"}</Link>
        </span>
      </div>
      {editing && (
        <div className={"cg-edit" + (sub ? " sub" : "")}>
          <form action={updateCategory}>
            <input type="hidden" name="id" value={c.id} />
            <label>Name<input name="name" defaultValue={c.name} required /></label>
            <label>New photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
            {c.photo && <label><input type="checkbox" name="remove_photo" /> Remove photo</label>}
            <label><input type="checkbox" name="visible" defaultChecked={!!c.visible} /> Visible in shop</label>
            <button className="btn a">Save</button>
          </form>
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={c.id} />
            <button className="btn o s" disabled={!canDelete}>Delete</button>
            {!canDelete && <span className="mut" style={{ marginLeft: 8, fontSize: 12 }}>Can be deleted only when it has no products or subcategories. Hide it instead.</span>}
          </form>
        </div>
      )}
    </div>
  );
}

export default async function CategoriesPage({ searchParams }) {
  await requirePerm("products");
  const sp = await searchParams;
  const err = String(Array.isArray(sp.err) ? sp.err[0] : sp.err || "");
  const editId = Number(Array.isArray(sp.edit) ? sp.edit[0] : sp.edit) || 0;
  const tree = categoryTree();

  return (
    <>
      <h1 style={{ margin: 0 }}>Categories</h1>
      <p className="mut" style={{ margin: "4px 0 18px" }}>Organise the shop. Categories and subcategories are picked from dropdowns in the product form.</p>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="cg">
        <div>
          <div className="cg-list">
            {tree.length === 0 && <p className="mut" style={{ padding: 16, margin: 0 }}>No categories yet. Add the first one on the right.</p>}
            {tree.map((c) => (
              <div key={c.id}>
                <Block c={c} editing={editId === c.id} />
                {c.subs.map((s) => <Block key={s.id} c={s} sub editing={editId === s.id} />)}
              </div>
            ))}
          </div>
          <p className="cg-note">Existing categories were imported automatically. Nothing was deleted. A hidden category and its products are not shown in the shop, home page or search. The products stay safe and can be shown again any time.</p>
        </div>
        <AddCategory mains={tree.map((m) => ({ id: m.id, name: m.name }))} />
      </div>
    </>
  );
}
