"use server";
// Phase 8: Customer 360 ke kaam (edit, block, tags, notes, wallet). Har kaam ki entry activity log mein jaati hai.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { logAct } from "@/lib/activity";
import { getCustomer, MOBILE, EMAIL, TAG } from "@/lib/customers";
import { clean } from "@/lib/text";

const to = (id, tab, kind, msg) => redirect(`/seller/customers/${id}?tab=${tab}${msg ? `&${kind}=${encodeURIComponent(msg)}` : ""}`);
const fail = (id, tab, msg) => to(id, tab, "err", msg);
const done = (id, tab, msg) => { revalidatePath(`/seller/customers/${id}`); to(id, tab, "ok", msg); };

// Har kaam mein: staff ki permission + customer sach mein buyer hai
async function target(form) {
  const me = await requirePerm("customers");
  const c = getCustomer(form.get("id"));
  if (!c) redirect("/seller/customers");
  return { me, c };
}
const who = (c) => `${c.name} (ID ${c.id})`;

export async function saveCustomer(form) {
  const { me, c } = await target(form);
  const name = clean(form.get("name")).slice(0, 60);
  const mobile = String(form.get("mobile") || "").trim();
  const email = clean(form.get("email")).toLowerCase();
  if (name.length < 2) return fail(c.id, "overview", "Please write the customer’s name.");
  if (!MOBILE.test(mobile)) return fail(c.id, "overview", "Mobile number should be 10 digits (starting with 6 to 9).");
  if (email && (email.length > 254 || !EMAIL.test(email))) return fail(c.id, "overview", "That email address does not look right.");
  if (one("SELECT id FROM users WHERE mobile = ? AND id <> ?", mobile, c.id)) return fail(c.id, "overview", "This mobile number already belongs to another account.");
  if (email && one("SELECT id FROM users WHERE lower(email) = ? AND id <> ?", email, c.id)) return fail(c.id, "overview", "This email already belongs to another account.");

  const diff = [];
  if (name !== c.name) diff.push(`name: ${c.name} → ${name}`);
  if (mobile !== c.mobile) diff.push(`mobile: ${c.mobile} → ${mobile}`);
  if (email !== (c.email || "")) diff.push(`email: ${c.email || "(empty)"} → ${email || "(empty)"}`);
  if (!diff.length) return done(c.id, "overview", "Nothing changed.");
  run("UPDATE users SET name = ?, mobile = ?, email = ? WHERE id = ? AND role = 'buyer'", name, mobile, email || null, c.id);
  logAct(me, "Customer details edited", `${who(c)} · ${diff.join(", ")}`);
  done(c.id, "overview", "Details saved.");
}

export async function toggleBlock(form) {
  const { me, c } = await target(form);
  const block = !c.disabled;
  const reason = clean(form.get("reason")).slice(0, 200);
  run("UPDATE users SET disabled = ? WHERE id = ? AND role = 'buyer'", block ? 1 : 0, c.id);
  // Karan apne aap notes mein bhi likh do, taaki baad mein yaad rahe
  run("INSERT INTO customer_notes (user_id, note, author_id, author_name) VALUES (?, ?, ?, ?)", c.id, block ? `Blocked${reason ? `: ${reason}` : ""}` : `Unblocked${reason ? `: ${reason}` : ""}`, me.id, me.name || "-");
  logAct(me, block ? "Customer blocked" : "Customer unblocked", `${who(c)}${reason ? ` · ${reason}` : ""}`);
  done(c.id, "overview", block ? "Customer blocked. They are logged out and cannot log in." : "Customer unblocked. They can log in again.");
}

export async function addTag(form) {
  const { me, c } = await target(form);
  const tag = clean(form.get("tag"));
  if (!TAG.test(tag)) return fail(c.id, "overview", "Tag can have letters, numbers, space, - or _ (up to 20 characters).");
  if (one("SELECT COUNT(*) AS n FROM customer_tags WHERE user_id = ?", c.id).n >= 10) return fail(c.id, "overview", "A customer can have up to 10 tags.");
  const r = run("INSERT OR IGNORE INTO customer_tags (user_id, tag) VALUES (?, ?)", c.id, tag);
  if (r.changes) logAct(me, "Customer tag added", `${who(c)} · ${tag}`);
  done(c.id, "overview", r.changes ? "Tag added." : "That tag is already there.");
}

export async function removeTag(form) {
  const { me, c } = await target(form);
  const tag = clean(form.get("tag"));
  const r = run("DELETE FROM customer_tags WHERE user_id = ? AND tag = ?", c.id, tag);
  if (r.changes) logAct(me, "Customer tag removed", `${who(c)} · ${tag}`);
  done(c.id, "overview", "Tag removed.");
}

export async function addNote(form) {
  const { me, c } = await target(form);
  const note = String(form.get("note") || "").replace(/\r/g, "").trim().slice(0, 500);
  if (!note) return fail(c.id, "notes", "Please write the note.");
  run("INSERT INTO customer_notes (user_id, note, author_id, author_name) VALUES (?, ?, ?, ?)", c.id, note, me.id, me.name || "-");
  logAct(me, "Customer note added", who(c));
  done(c.id, "notes", "Note added.");
}

// Note sirf Owner hata sakta hai (record bana rahe)
export async function deleteNote(form) {
  const { me, c } = await target(form);
  if (!can(me.role, "team")) return fail(c.id, "notes", "Only the Owner can delete notes.");
  const r = run("DELETE FROM customer_notes WHERE id = ? AND user_id = ?", Number(form.get("note_id")), c.id);
  if (r.changes) logAct(me, "Customer note deleted", who(c));
  done(c.id, "notes", "Note deleted.");
}

// Wallet abhi ban raha hai: sirf Owner khate mein credit / debit likh sakta hai. Balance minus nahi ja sakta.
export async function adjustWallet(form) {
  const { me, c } = await target(form);
  if (!can(me.role, "refund")) return fail(c.id, "wallet", "Only the Owner can change wallet credit.");
  const amount = Math.round(Number(form.get("amount")));
  const reason = clean(form.get("reason")).slice(0, 120);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) return fail(c.id, "wallet", "Enter an amount between 1 and 1,00,000 (use a minus sign to deduct).");
  if (reason.length < 3) return fail(c.id, "wallet", "Please write the reason.");
  const bal = one("SELECT COALESCE(SUM(amount), 0) AS b FROM wallet_ledger WHERE user_id = ?", c.id).b;
  if (bal + amount < 0) return fail(c.id, "wallet", `The balance cannot go below zero (current balance ₹${bal}).`);
  run("INSERT INTO wallet_ledger (user_id, amount, reason, by_name) VALUES (?, ?, ?, ?)", c.id, amount, reason, me.name || "-");
  logAct(me, amount > 0 ? "Wallet credit added" : "Wallet deducted", `${who(c)} · ₹${Math.abs(amount)} · ${reason}`);
  done(c.id, "wallet", amount > 0 ? "Credit added." : "Amount deducted.");
}
