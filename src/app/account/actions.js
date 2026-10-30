"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { returnWindowOpen } from "@/lib/orders";
import { SITE } from "@/lib/site";

async function buyerOnly(next = "/account") {
  const user = await getUser();
  if (!user) redirect("/login?next=" + next);
  if (user.role === "seller") redirect("/seller");
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

export async function deleteAddress(form) {
  const user = await buyerOnly("/account/addresses");
  run("DELETE FROM addresses WHERE id = ? AND user_id = ?", Number(form.get("id")), user.id);
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
  const o = one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", no, user.id);
  if (o && ["Placed", "Confirmed", "Awaiting Payment"].includes(o.status)) {
    transaction(() => {
      for (const i of all("SELECT * FROM order_items WHERE order_id = ?", o.id)) {
        if (i.product_id) run("UPDATE products SET stock = stock + ? WHERE id = ?", i.qty, i.product_id); // stock wapas
      }
      run(
        "UPDATE orders SET status = 'Cancelled', pay_status = ? WHERE id = ?",
        o.pay_status === "Paid" ? "Refund Initiated" : "Cancelled", o.id
      );
    });
  }
  revalidatePath("/", "layout");
  redirect("/order/" + no);
}

export async function requestReturn(prev, form) {
  const user = await buyerOnly();
  const no = String(form.get("order_no") || "");
  const reason = String(form.get("reason") || "").trim();
  const o = one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", no, user.id);
  if (!o || o.status !== "Delivered") return { error: "Is order ka return abhi nahi ho sakta." };
  if (!returnWindowOpen(o)) return { error: `Return ki ${SITE.returnDays} din ki seema khatam ho chuki hai.` };
  if (reason.length < 5) return { error: "Return ki wajah thodi detail mein likhein." };
  if (one("SELECT id FROM returns WHERE order_id = ?", o.id)) return { error: "Return request pehle se ho chuki hai." };
  transaction(() => {
    run("INSERT INTO returns (order_id, reason) VALUES (?, ?)", o.id, reason);
    run("UPDATE orders SET status = 'Return Requested' WHERE id = ?", o.id);
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
