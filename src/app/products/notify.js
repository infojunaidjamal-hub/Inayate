"use server";
import { revalidatePath } from "next/cache";
import { all, one, run } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { clientIp, minutesLocked, recordFail } from "@/lib/throttle";

// "Notify me when back": mobile ya email save hota hai. Seller panel mein list dikhti hai.
export async function notifyMe(prev, form) {
  const id = Number(form.get("id"));
  const raw = String(form.get("contact") || "").trim();
  const p = one("SELECT id, stock FROM products WHERE id = ? AND status = 'Active'", id);
  if (!p) return { error: "Ye product abhi available nahi hai." };
  if (p.stock > 0) return { ok: "Achhi khabar: ye wapas stock mein aa gaya hai. Aap ise abhi kharid sakte hain.", back: true };

  const mobile = raw.replace(/[\s-]/g, "").replace(/^\+?91/, "");
  let kind, contact;
  if (/^[6-9]\d{9}$/.test(mobile)) { kind = "mobile"; contact = mobile; }
  else if (/^\S+@\S+\.\S+$/.test(raw) && raw.length <= 120) { kind = "email"; contact = raw.toLowerCase(); }
  else return { error: "10 digit ka sahi mobile number ya email daalein." };

  // bot / spam se bachav: ek IP se 15 minute mein 20 se zyada request nahi
  const key = `notify:${await clientIp()}`;
  const wait = minutesLocked(key);
  if (wait) return { error: `Bahut zyada request hui. ${wait} minute baad try karein.` };
  recordFail(key, 20);

  if (one("SELECT COUNT(*) c FROM stock_alerts WHERE contact = ? AND status = 'waiting'", contact).c >= 20) return { error: "Is number / email par bahut saari requests hain." };
  const me = await getUser();
  const r = run("INSERT OR IGNORE INTO stock_alerts (product_id, user_id, contact, kind) VALUES (?,?,?,?)", id, me && me.role === "buyer" ? me.id : null, contact, kind);
  revalidatePath(`/products/${id}`);
  return { ok: r.changes ? `Ho gaya. Wapas stock mein aate hi hum ${contact} par batayenge.` : `Aapki request pehle se saved hai. Hum ${contact} par batayenge.` };
}

// Buyer apne account mein "Back in stock" ka card hata sake
export async function dismissAlert(form) {
  const me = await getUser();
  if (!me || me.role !== "buyer") return;
  run("UPDATE stock_alerts SET status = 'done' WHERE id = ? AND user_id = ?", Number(form.get("id")), me.id);
  revalidatePath("/account");
}

export async function myWaiting(productId, userId) {
  return all("SELECT id FROM stock_alerts WHERE product_id = ? AND user_id = ? AND status = 'waiting'", productId, userId).length > 0;
}
