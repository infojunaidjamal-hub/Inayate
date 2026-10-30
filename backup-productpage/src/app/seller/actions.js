"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import { NEXT_STATUS } from "@/lib/format";
import { applyImages } from "@/lib/images";
import { refundOrder } from "@/lib/refunds";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { clearFails } from "@/lib/throttle";

/* ---------- Products ---------- */
export async function saveProduct(prev, form) {
  await requireSeller(); // har action mein check zaroori hai
  const id = Number(form.get("id") || 0);
  const g = (k) => String(form.get(k) ?? "").trim();
  const v = {
    name: g("name"), sku: g("sku"), category: g("category"), price: g("price"), mrp: g("mrp"),
    stock: g("stock"), material: g("material"), colours: g("colours"), size: g("size"),
    weight_g: g("weight_g"), gst_percent: g("gst_percent") || "12", description: g("description"),
    status: g("status"), colour_main: g("colour_main"), colour_dark: g("colour_dark"),
  };
  const fail = (error) => ({ error, values: v });

  if (v.name.length < 2) return fail("Product ka naam likhein.");
  if (!v.sku) return fail("SKU likhein (jaise MB-TOTE-01).");
  if (!v.category) return fail("Category likhein.");
  const price = Number(v.price), stock = Number(v.stock);
  const mrp = v.mrp ? Number(v.mrp) : price;
  const weight = v.weight_g ? Number(v.weight_g) : null;
  const gst = Number(v.gst_percent);
  if (!Number.isInteger(price) || price <= 0) return fail("Price poora number hona chahiye (jaise 1499).");
  if (!Number.isInteger(mrp) || mrp < price) return fail("MRP, price se kam nahi ho sakta.");
  if (!Number.isInteger(stock) || stock < 0) return fail("Stock 0 ya usse zyada poora number hona chahiye.");
  if (weight !== null && (!Number.isInteger(weight) || weight < 0)) return fail("Weight gram mein poora number likhein.");
  if (!Number.isInteger(gst) || gst < 0 || gst > 28) return fail("GST % 0 se 28 ke beech rakhein.");
  if (!["Active", "Draft"].includes(v.status)) return fail("Status chuniye.");
  if (!/^#[0-9a-fA-F]{6}$/.test(v.colour_main) || !/^#[0-9a-fA-F]{6}$/.test(v.colour_dark)) return fail("Colour sahi chuniye.");
  if (one("SELECT id FROM products WHERE sku = ? AND id <> ?", v.sku, id)) return fail("Ye SKU kisi aur product ka hai. Alag SKU rakhein.");

  const vals = [v.name, v.sku, v.category, price, mrp, stock, v.material, v.colours, v.size, weight, gst, v.description, v.status, v.colour_main, v.colour_dark];
  if (id) {
    if (!one("SELECT id FROM products WHERE id = ?", id)) return fail("Product nahi mila.");
    run(
      `UPDATE products SET name=?, sku=?, category=?, price=?, mrp=?, stock=?, material=?, colours=?, size=?,
       weight_g=?, gst_percent=?, description=?, status=?, colour_main=?, colour_dark=? WHERE id=?`,
      ...vals, id
    );
  } else {
    run(
      `INSERT INTO products (name, sku, category, price, mrp, stock, material, colours, size, weight_g, gst_percent,
       description, status, colour_main, colour_dark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ...vals
    );
  }
  const pid = id || Number(one("SELECT last_insert_rowid() AS i").i);
  const imgMsg = await applyImages(pid, form);
  revalidatePath("/", "layout");
  redirect(imgMsg ? `/seller/products/${pid}?imgerr=${encodeURIComponent(imgMsg)}` : "/seller/products");
}

/* ---------- Orders ---------- */

export async function updateOrder(prev, form) {
  await requireSeller();
  const no = String(form.get("order_no") || "");
  const to = String(form.get("status") || "");
  const courier = String(form.get("courier") || "").trim();
  const awb = String(form.get("awb") || "").trim();
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o) return { error: "Order nahi mila." };

  if (to) {
    if (!(NEXT_STATUS[o.status] || []).includes(to)) return { error: `"${o.status}" se "${to}" nahi ho sakta.` };
    if (to === "Shipped" && (!courier || !awb)) return { error: "Ship karne ke liye courier ka naam aur tracking ID dono likhein." };
  }

  transaction(() => {
    if (courier || awb) run("UPDATE orders SET courier = ?, awb = ? WHERE id = ?", courier || o.courier, awb || o.awb, o.id);
    if (to === "Cancelled") {
      for (const i of all("SELECT * FROM order_items WHERE order_id = ?", o.id)) {
        if (i.product_id) run("UPDATE products SET stock = stock + ? WHERE id = ?", i.qty, i.product_id); // stock wapas
      }
      run("UPDATE orders SET status = 'Cancelled', pay_status = ? WHERE id = ?", o.pay_status === "Paid" ? "Refund Initiated" : "Cancelled", o.id);
    } else if (to === "Delivered") {
      // COD ka paisa delivery par milta hai
      run("UPDATE orders SET status = 'Delivered', delivered_at = datetime('now'), pay_status = ? WHERE id = ?", o.pay_method === "COD" ? "Paid" : o.pay_status, o.id);
    } else if (to) {
      run("UPDATE orders SET status = ? WHERE id = ?", to, o.id);
    }
  });
  revalidatePath("/", "layout");
  redirect(`/seller/orders/${no}`);
}

/* ---------- Returns ---------- */
export async function decideReturn(form) {
  await requireSeller();
  const id = Number(form.get("id"));
  const decision = String(form.get("decision") || "");
  const r = one("SELECT * FROM returns WHERE id = ?", id);
  if (!r) return;
  transaction(() => {
    if (decision === "approve" && r.status === "Requested") {
      run("UPDATE returns SET status = 'Approved' WHERE id = ?", id);
      run("UPDATE orders SET status = 'Return Approved' WHERE id = ?", r.order_id);
    } else if (decision === "reject" && r.status === "Requested") {
      run("UPDATE returns SET status = 'Rejected' WHERE id = ?", id);
      run("UPDATE orders SET status = 'Return Rejected' WHERE id = ?", r.order_id);
    }
  });
  revalidatePath("/", "layout");
}

// Refund: online order par Razorpay se, COD par manual record. Return se aaye to return bhi "Refunded" ho jata hai
export async function refundAction(form) {
  await requireSeller();
  const no = String(form.get("order_no") || "");
  const returnId = Number(form.get("return_id") || 0);
  const note = String(form.get("note") || "");
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  const back = returnId ? "/seller/returns" : `/seller/orders/${no}`;
  const fail = (m) => redirect(`${back}?err=${encodeURIComponent(m)}`);

  if (!o) fail("Order nahi mila.");
  if (returnId) {
    const r = one("SELECT * FROM returns WHERE id = ?", returnId);
    if (!r || r.order_id !== o.id || r.status !== "Approved") fail("Pehle return approve karein.");
  }
  const res = await refundOrder(o, note);
  if (res.error) fail(res.error);

  if (returnId) {
    transaction(() => {
      run("UPDATE returns SET status = 'Refunded' WHERE id = ?", returnId);
      run("UPDATE orders SET status = 'Refunded' WHERE id = ?", o.id);
    });
  }
  revalidatePath("/", "layout");
  redirect(`${back}?ok=${encodeURIComponent(res.refundId ? `Razorpay se refund ho gaya (${res.refundId})` : "Refund record ho gaya")}`);
}

// Customer password bhool jaye to temporary password banata hai (seller use WhatsApp par bhejta hai)
export async function resetCustomerPassword(prev, form) {
  await requireSeller();
  const u = one("SELECT id, mobile, role FROM users WHERE id = ?", Number(form.get("id")));
  if (!u || u.role !== "buyer") return { error: "Customer nahi mila." };
  const letters = "abcdefghjkmnpqrstuvwxyz23456789"; // milte-julte akshar (l, 1, O, 0) nahi
  const password = Array.from(randomBytes(10), (b) => letters[b % letters.length]).join("");
  run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(password), u.id);
  clearFails(`buyer:${u.mobile}`);
  return { password };
}
