"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { colourLabel } from "@/lib/group";

const keyOf = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const idsOf = (form, name) => [...new Set(form.getAll(name).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 60);
const firstColour = (p) => colourLabel(p, false).slice(0, 40);
const grouped = (p) => !!(p.group_key && String(p.group_key).trim());
const refreshSite = () => { revalidatePath("/", "layout"); revalidatePath("/seller/groups"); };

// Naya group-key: kisi aur group ke naam se na takraye
function uniqueKey(base) {
  const b = base || "group";
  let k = b, n = 2;
  while (one("SELECT 1 x FROM products WHERE group_key = ? LIMIT 1", k)) k = `${b.slice(0, 36)}-${n++}`;
  return k;
}

/* ---------- Naya group: kai listings ko ek saath jodo ---------- */
export async function createGroup(prev, form) {
  const me = await requirePerm("products");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const picks = idsOf(form, "pick");
  if (picks.length < 2) return { error: "Choose at least 2 listings to make a group." };
  const rows = all(`SELECT id, name, colours, specs, colour_main, group_label, group_key FROM products WHERE id IN (${picks.map(() => "?").join(",")})`, ...picks);
  if (rows.length !== picks.length) return { error: "One of the chosen listings was not found. Refresh the page and try again." };
  const busy = rows.find(grouped);
  if (busy) return { error: `"${busy.name}" is already in a group. Remove it from that group first.` };
  const first = rows.find((r) => r.id === picks[0]);
  const key = uniqueKey(keyOf(name) || keyOf(first.name));
  transaction(() => {
    picks.forEach((id, i) => {
      const r = rows.find((x) => x.id === id);
      run("UPDATE products SET group_key = ?, group_label = ?, group_pos = ? WHERE id = ?", key, firstColour(r) || null, i, id);
    });
  });
  logAct(me, "Listing group banaya", `${key} (${picks.length} listings)`);
  refreshSite();
  redirect(`/seller/groups?made=${encodeURIComponent(key)}`);
}

/* ---------- Group save: labels, order, remove, add ---------- */
export async function saveGroup(form) {
  const me = await requirePerm("products");
  const key = String(form.get("key") ?? "");
  const members = all("SELECT id FROM products WHERE group_key = ? ORDER BY group_pos, id", key);
  if (!key || !members.length) redirect("/seller/groups");
  const adds = idsOf(form, "add");
  const addRows = adds.length ? all(`SELECT id, colours, specs, colour_main, group_label, group_key FROM products WHERE id IN (${adds.map(() => "?").join(",")})`, ...adds).filter((r) => !grouped(r)) : [];
  transaction(() => {
    for (const m of members) {
      if (form.get(`remove_${m.id}`)) {
        run("UPDATE products SET group_key = NULL, group_label = NULL, group_pos = 0 WHERE id = ?", m.id);
        continue;
      }
      const label = String(form.get(`label_${m.id}`) ?? "").trim().slice(0, 40) || null;
      const pos = Number.parseInt(String(form.get(`pos_${m.id}`) ?? "0"), 10);
      run("UPDATE products SET group_label = ?, group_pos = ? WHERE id = ?", label, Number.isInteger(pos) ? Math.min(Math.max(pos, 0), 999) : 0, m.id);
    }
    let next = members.length + 1;
    for (const r of addRows) run("UPDATE products SET group_key = ?, group_label = ?, group_pos = ? WHERE id = ?", key, firstColour(r) || null, 900 + next++, r.id);
    // 1 hi listing bachi to group ka matlab nahi, use khol do
    const left = all("SELECT id FROM products WHERE group_key = ?", key);
    if (left.length < 2) for (const l of left) run("UPDATE products SET group_key = NULL, group_label = NULL, group_pos = 0 WHERE id = ?", l.id);
  });
  logAct(me, "Listing group badla", key);
  refreshSite();
  redirect("/seller/groups?saved=1");
}

/* ---------- Group khatam (listings waise hi rehti hain) ---------- */
export async function disbandGroup(form) {
  const me = await requirePerm("products");
  const key = String(form.get("key") ?? "");
  if (key) run("UPDATE products SET group_key = NULL, group_label = NULL, group_pos = 0 WHERE group_key = ?", key);
  logAct(me, "Listing group hataya", key);
  refreshSite();
  redirect("/seller/groups?saved=1");
}
