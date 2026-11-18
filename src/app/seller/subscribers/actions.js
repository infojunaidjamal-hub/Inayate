"use server";
// Phase 8: Subscribers ka management (jodna, unsubscribe / resubscribe, hatana). Har kaam activity log mein likha jaata hai.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { EMAIL } from "@/lib/customers";

const back = (kind, msg) => redirect(`/seller/subscribers${msg ? `?${kind}=${encodeURIComponent(msg)}` : ""}`);
const done = (msg) => { revalidatePath("/seller/subscribers"); back("ok", msg); };
const row = (form) => one("SELECT * FROM subscribers WHERE id = ?", Number(form.get("id")));

export async function addSubscriber(form) {
  const me = await requirePerm("customers");
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return back("err", "Please enter a valid email address.");
  const r = run("INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, 'manual')", email);
  if (!r.changes) return back("err", "This email is already in the list.");
  logAct(me, "Subscriber added", email);
  done("Subscriber added.");
}

export async function toggleSubscriber(form) {
  const me = await requirePerm("customers");
  const s = row(form);
  if (!s) return back("err", "Subscriber not found.");
  const off = !s.unsubscribed_at;
  run(`UPDATE subscribers SET unsubscribed_at = ${off ? "datetime('now')" : "NULL"} WHERE id = ?`, s.id);
  logAct(me, off ? "Subscriber unsubscribed" : "Subscriber resubscribed", s.email);
  done(off ? "Unsubscribed. Do not send them emails." : "Subscribed again.");
}

export async function removeSubscriber(form) {
  const me = await requirePerm("customers");
  const s = row(form);
  if (s) {
    run("DELETE FROM subscribers WHERE id = ?", s.id);
    logAct(me, "Subscriber removed", s.email);
  }
  done("Subscriber removed.");
}
