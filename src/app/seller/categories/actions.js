"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { storeImage, deleteStored } from "@/lib/images";
import { clean } from "@/lib/text";

const done = () => { revalidatePath("/seller", "layout"); revalidatePath("/products"); revalidatePath("/"); };
const bad = (msg) => redirect("/seller/categories?err=" + encodeURIComponent(msg));

export async function addCategory(prev, form) {
  await requirePerm("products");
  const name = clean(form.get("name"));
  const parent = Number(form.get("parent") || 0) || null;
  if (name.length < 2 || name.length > 40) return { error: "Name should be 2 to 40 characters.", values: { name, parent: String(parent || "") } };
  if (parent && !one("SELECT id FROM categories WHERE id = ? AND parent_id IS NULL", parent)) return { error: "Pick a main category as the parent.", values: { name } };
  if (one("SELECT id FROM categories WHERE COALESCE(parent_id,0) = ? AND lower(name) = lower(?)", parent || 0, name)) return { error: "This name already exists here.", values: { name, parent: String(parent || "") } };
  let photo = null;
  const file = form.get("photo");
  if (file && typeof file !== "string" && file.size > 0) {
    const r = await storeImage(file, "cat-");
    if (r.error) return { error: r.error, values: { name, parent: String(parent || "") } };
    photo = r.url;
  }
  const pos = one("SELECT COALESCE(MAX(position), -1) + 1 p FROM categories WHERE COALESCE(parent_id,0) = ?", parent || 0).p;
  run("INSERT INTO categories (name, parent_id, position, photo) VALUES (?,?,?,?)", name, parent, pos, photo);
  done();
  return { ok: `"${name}" added.` };
}

export async function updateCategory(form) {
  await requirePerm("products");
  const id = Number(form.get("id"));
  const c = one("SELECT * FROM categories WHERE id = ?", id);
  if (!c) return bad("Category not found.");
  const name = clean(form.get("name"));
  if (name.length < 2 || name.length > 40) return bad("Name should be 2 to 40 characters.");
  if (one("SELECT id FROM categories WHERE COALESCE(parent_id,0) = ? AND lower(name) = lower(?) AND id <> ?", c.parent_id || 0, name, id)) return bad("This name already exists here.");
  let photo = c.photo;
  if (form.get("remove_photo")) photo = null;
  const file = form.get("photo");
  if (file && typeof file !== "string" && file.size > 0) {
    const r = await storeImage(file, "cat-");
    if (r.error) return bad(r.error);
    photo = r.url;
  }
  const visible = form.get("visible") ? 1 : 0;
  transaction(() => {
    run("UPDATE categories SET name = ?, visible = ?, photo = ? WHERE id = ?", name, visible, photo, id);
    // shop / reports / Excel text naam se bhi chalte hain, isliye wahan bhi naya naam
    if (c.parent_id) run("UPDATE products SET subcategory = ? WHERE subcategory_id = ?", name, id);
    else run("UPDATE products SET category = ? WHERE category_id = ?", name, id);
  });
  if (c.photo && c.photo !== photo) await deleteStored(c.photo);
  done();
  redirect("/seller/categories");
}

export async function moveCategory(form) {
  await requirePerm("products");
  const id = Number(form.get("id"));
  const dir = form.get("dir") === "up" ? -1 : 1;
  const c = one("SELECT * FROM categories WHERE id = ?", id);
  if (!c) return;
  const sibs = all("SELECT id FROM categories WHERE COALESCE(parent_id,0) = ? ORDER BY position, id", c.parent_id || 0).map((r) => r.id);
  const i = sibs.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= sibs.length) return;
  [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
  transaction(() => sibs.forEach((sid, pos) => run("UPDATE categories SET position = ? WHERE id = ?", pos, sid)));
  done();
}

export async function deleteCategory(form) {
  await requirePerm("products");
  const id = Number(form.get("id"));
  const c = one("SELECT * FROM categories WHERE id = ?", id);
  if (!c) return bad("Category not found.");
  if (one("SELECT id FROM products WHERE category_id = ? OR subcategory_id = ? LIMIT 1", id, id)) return bad("This category still has products. Move them first, or hide the category instead.");
  if (one("SELECT id FROM categories WHERE parent_id = ? LIMIT 1", id)) return bad("Delete its subcategories first.");
  run("DELETE FROM categories WHERE id = ?", id);
  if (c.photo) await deleteStored(c.photo);
  done();
  redirect("/seller/categories");
}
