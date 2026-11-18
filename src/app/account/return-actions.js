"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { storeImage, deleteStored } from "@/lib/images";
import { addEvent } from "@/lib/orderFlow";
import { returnWindowOpen } from "@/lib/orders";
import { RETURN_REASONS } from "@/lib/format";
import { SITE } from "@/lib/site";
import { checkDest, destLabel } from "@/lib/returns";

const MAX_PHOTO = 5 * 1024 * 1024;

async function buyerOnly() {
  const u = await getUser();
  if (!u || u.role !== "buyer") redirect("/login");
  return u;
}

// Buyer: kaun se item (aur kitne) wapas karne hain + wajah + photos
export async function requestReturn(prev, form) {
  const user = await buyerOnly();
  const no = String(form.get("order_no") || "");
  const code = String(form.get("reason_code") || "");
  const comment = String(form.get("comment") || "").trim().slice(0, 500);
  const o = one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", no, user.id);
  if (!o || o.status !== "Delivered") return { error: "Is order ka return abhi nahi ho sakta." };
  if (!returnWindowOpen(o)) return { error: `Return ki ${SITE.returnDays} din ki seema khatam ho chuki hai.` };
  const rr = RETURN_REASONS.find((r) => r[0] === code);
  if (!rr) return { error: "Return ki wajah chuniye." };
  if (code === "other" && comment.length < 5) return { error: "Kripya wajah thodi detail mein likhein." };
  if (one("SELECT id FROM returns WHERE order_id = ?", o.id)) return { error: "Return request pehle se ho chuki hai." };

  // kaun se items
  const sel = [];
  for (const i of all("SELECT * FROM order_items WHERE order_id = ?", o.id)) {
    const q = Math.max(0, Math.min(Number(form.get(`qty_${i.id}`) || 0) | 0, i.qty));
    if (q > 0) sel.push({ id: i.id, qty: q });
  }
  if (!sel.length) return { error: "Kam se kam ek item chuniye jo wapas karna hai." };

  const files = ["photo1", "photo2", "photo3"].map((k) => form.get(k)).filter((f) => f && typeof f !== "string" && f.size > 0);
  if (rr[2] && files.length < 2) return { error: `"${rr[1]}" ke liye kam se kam 2 photo zaroori hain.` };
  const urls = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO) { for (const u of urls) await deleteStored(u); return { error: "Har photo 5 MB se chhoti honi chahiye." }; }
    const r = await storeImage(f, "return-");
    if (r.error) { for (const u of urls) await deleteStored(u); return { error: r.error }; }
    urls.push(r.url);
  }
  const reason = comment ? `${rr[1]}: ${comment}` : rr[1];
  transaction(() => {
    const rid = Number(run("INSERT INTO returns (order_id, reason, reason_code, photos, stage) VALUES (?, ?, ?, ?, 'requested')", o.id, reason, code, JSON.stringify(urls)).lastInsertRowid);
    for (const s of sel) run("INSERT INTO return_items (return_id, order_item_id, qty) VALUES (?,?,?)", rid, s.id, s.qty);
    run("UPDATE orders SET status = 'Return Requested' WHERE id = ?", o.id);
    addEvent(o.id, { kind: "return", code: "requested", label: "Return requested", detail: rr[1], who: "buyer" });
    addEvent(o.id, { code: "Return Requested", label: "Return requested", detail: rr[1], who: "buyer" });
  });
  revalidatePath("/", "layout");
  redirect("/order/" + no);
}

// Buyer: return accept hone ke baad refund kahan chahiye (refund se pehle tak badal sakta hai)
export async function chooseRefund(prev, form) {
  const user = await buyerOnly();
  const no = String(form.get("order_no") || "");
  const o = one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", no, user.id);
  const r = o && one("SELECT * FROM returns WHERE order_id = ?", o.id);
  if (!r || r.status !== "Approved") return { error: "Abhi refund ka tarika chunne ka samay nahi hai." };
  const c = checkDest(o, form);
  if (c.error) return { error: c.error };
  run("UPDATE returns SET refund_dest = ?, refund_upi = ?, refund_bank = ? WHERE id = ?", c.dest, c.upi || null, c.bank || null, r.id);
  addEvent(o.id, { kind: "note", code: "refund_choice", label: "Refund method chosen", detail: destLabel(c.dest), who: "buyer" });
  revalidatePath(`/order/${no}`);
  return { ok: `Theek hai. Refund "${destLabel(c.dest)}" mein jayega.` };
}
