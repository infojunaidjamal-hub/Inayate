"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { returnWindowOpen } from "@/lib/orders";
import { giveStock } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { moveOrder, addEvent, CANCEL_REASONS, RETURN_REASONS } from "@/lib/orderFlow";
import { storeImage, deleteStored } from "@/lib/images";

async function buyerOnly(next = "/account") {
  const user = await getUser();
  if (!user) redirect("/login?next=" + next);
  if (user.role !== "buyer") redirect("/seller");
  return user;
}

/* ---------- Addresses ---------- */
export async function addAddress(prev, form) {
  const user = await buyerOnly("/account/addresses");
  const v = {
    label: String(form.get("label") || "Home").trim() || "Home",
    name: String(form.get("name") || "").trim(),
    line: String(form.get("line") || "").trim(),
    city: String(form.get("city") || "").trim(),
    state: String(form.get("state") || "").trim(),
    pincode: String(form.get("pincode") || "").trim(),
    makeDefault: form.get("makeDefault") === "on",
  };
  const fail = (error) => ({ error, values: v });
  if (v.name.length < 2) return fail("Naam likhein.");
  if (v.line.length < 5) return fail("Poora address likhein (ghar, society, area).");
  if (!v.city || !v.state) return fail("City aur state likhein.");
  if (!/^\d{6}$/.test(v.pincode)) return fail("6 digit ka sahi pincode daalein.");

  transaction(() => {
    const first = one("SELECT COUNT(*) c FROM addresses WHERE user_id = ?", user.id).c === 0;
    const def = first || v.makeDefault;
    if (def) run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user.id);
    run(
      "INSERT INTO addresses (user_id,label,name,line,city,state,pincode,is_default) VALUES (?,?,?,?,?,?,?,?)",
      user.id, v.label, v.name, v.line, v.city, v.state, v.pincode, def ? 1 : 0
    );
  });
  revalidatePath("/account/addresses");
  return { ok: "Address save ho gaya." };
}

export async function updateAddress(prev, form) {
  const user = await buyerOnly("/account/addresses");
  const id = Number(form.get("id"));
  const v = {
    label: String(form.get("label") || "Home").trim() || "Home",
    name: String(form.get("name") || "").trim(),
    line: String(form.get("line") || "").trim(),
    city: String(form.get("city") || "").trim(),
    state: String(form.get("state") || "").trim(),
    pincode: String(form.get("pincode") || "").trim(),
    makeDefault: form.get("makeDefault") === "on",
  };
  if (v.name.length < 2) return { error: "Naam likhein." };
  if (v.line.length < 5) return { error: "Poora address likhein (ghar, society, area)." };
  if (!v.city || !v.state) return { error: "City aur state likhein." };
  if (!/^\d{6}$/.test(v.pincode)) return { error: "6 digit ka sahi pincode daalein." };
  if (!one("SELECT id FROM addresses WHERE id = ? AND user_id = ?", id, user.id)) return { error: "Address nahi mila." };
  transaction(() => {
    if (v.makeDefault) run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user.id);
    run(
      "UPDATE addresses SET label = ?, name = ?, line = ?, city = ?, state = ?, pincode = ?, is_default = CASE WHEN ? = 1 THEN 1 ELSE is_default END WHERE id = ? AND user_id = ?",
      v.label, v.name, v.line, v.city, v.state, v.pincode, v.makeDefault ? 1 : 0, id, user.id
    );
  });
  revalidatePath("/account/addresses");
  return { ok: "Address update ho gaya." };
}

export async function deleteAddress(form) {
  const user = await buyerOnly("/account/addresses");
  const id = Number(form.get("id"));
  transaction(() => {
    const a = one("SELECT is_default FROM addresses WHERE id = ? AND user_id = ?", id, user.id);
    if (!a) return;
    run("DELETE FROM addresses WHERE id = ? AND user_id = ?", id, user.id);
    // default wala hata to sabse purana address default ban jaye
    if (a.is_default) {
      const next = one("SELECT id FROM addresses WHERE user_id = ? ORDER BY id LIMIT 1", user.id);
      if (next) run("UPDATE addresses SET is_default = 1 WHERE id = ?", next.id);
    }
  });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(form) {
  const user = await buyerOnly("/account/addresses");
  const id = Number(form.get("id"));
  if (!one("SELECT id FROM addresses WHERE id = ? AND user_id = ?", id, user.id)) return;
  transaction(() => {
    run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user.id);
    run("UPDATE addresses SET is_default = 1 WHERE id = ?", id);
  });
  revalidatePath("/account/addresses");
}

/* ---------- Wishlist ---------- */
export async function toggleWishlist(form) {
  const productId = Number(form.get("id"));
  const user = await buyerOnly("/products/" + productId);
  if (one("SELECT 1 x FROM wishlist WHERE user_id = ? AND product_id = ?", user.id, productId)) {
    run("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", user.id, productId);
  } else if (one("SELECT id FROM products WHERE id = ?", productId)) {
    run("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)", user.id, productId);
  }
  revalidatePath("/", "layout");
}

/* ---------- Orders ---------- */
export async function cancelOrder(form) {
  const user = await buyerOnly();
  const no = String(form.get("order_no") || "");
  const reason = String(form.get("reason") || "").trim();
  const comment = String(form.get("comment") || "").trim().slice(0, 200);
  const o = one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", no, user.id);
  const back = (m) => redirect("/order/" + no + (m ? "?msg=" + encodeURIComponent(m) : ""));
  if (!o) back("");
  if (!CANCEL_REASONS.includes(reason)) back("Cancel karne ki wajah chuniye.");
  if (reason === "Other" && comment.length < 3) back("Kripya wajah likhein.");
  if (!["Awaiting Payment", "Placed", "On Hold", "Confirmed", "Packed", "Ready to ship"].includes(o.status)) back("Ab ye order cancel nahi ho sakta, wo courier ko de diya gaya hai.");
  let err = null;
  transaction(() => {
    const r = moveOrder(o, "Cancelled", { who: "buyer", force: true, note: comment ? `${reason}: ${comment}` : reason });
    if (r.error) err = r.error;
  });
  revalidatePath("/", "layout");
  back(err || "Order cancel ho gaya.");
}

const RETURN_MAX_PHOTO = 5 * 1024 * 1024;

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

  const files = ["photo1", "photo2", "photo3"].map((k) => form.get(k)).filter((f) => f && typeof f !== "string" && f.size > 0);
  if (rr[2] && files.length < 2) return { error: `"${rr[1]}" ke liye kam se kam 2 photo zaroori hain.` };
  const urls = [];
  for (const f of files) {
    if (f.size > RETURN_MAX_PHOTO) { for (const u of urls) await deleteStored(u); return { error: "Har photo 5 MB se chhoti honi chahiye." }; }
    const r = await storeImage(f, "return-");
    if (r.error) { for (const u of urls) await deleteStored(u); return { error: r.error }; }
    urls.push(r.url);
  }
  const reason = comment ? `${rr[1]}: ${comment}` : rr[1];
  transaction(() => {
    run("INSERT INTO returns (order_id, reason, reason_code, photos, stage) VALUES (?, ?, ?, ?, 'requested')", o.id, reason, code, JSON.stringify(urls));
    run("UPDATE orders SET status = 'Return Requested' WHERE id = ?", o.id);
    addEvent(o.id, { kind: "return", code: "requested", label: "Return requested", detail: rr[1], who: "buyer" });
    addEvent(o.id, { code: "Return Requested", label: "Return requested", detail: rr[1], who: "buyer" });
  });
  revalidatePath("/", "layout");
  redirect("/order/" + no);
}

/* ---------- Reviews ---------- */
export async function submitReview(prev, form) {
  const productId = Number(form.get("product_id"));
  const user = await buyerOnly("/products/" + productId);
  const rating = Number(form.get("rating"));
  const title = String(form.get("title") || "").trim();
  const body = String(form.get("body") || "").trim();
  if (!(rating >= 1 && rating <= 5)) return { error: "Rating (1 se 5 star) chuniye." };
  if (title.length < 2 || body.length < 5) return { error: "Title aur review likhein." };
  // sirf wahi review likh sakta hai jisne product receive kiya ho, aur sirf ek baar
  const bought = one(
    `SELECT 1 x FROM orders o JOIN order_items i ON i.order_id = o.id
     WHERE o.user_id = ? AND o.status = 'Delivered' AND i.product_id = ?`, user.id, productId);
  if (!bought) return { error: "Review sirf wahi likh sakte hain jinhone ye product khareeda ho." };
  if (one("SELECT id FROM reviews WHERE user_id = ? AND product_id = ?", user.id, productId)) {
    return { error: "Aap is product ka review pehle de chuke hain." };
  }
  run(
    "INSERT INTO reviews (product_id,user_id,author,rating,title,body) VALUES (?,?,?,?,?,?)",
    productId, user.id, user.name, rating, title, body
  );
  revalidatePath("/products/" + productId);
  redirect("/products/" + productId);
}
