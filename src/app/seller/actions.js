"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, transaction } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { SITE } from "@/lib/site";
import { logAct } from "@/lib/activity";
import { giveStock } from "@/lib/catalog";
import { moveOrder, rtoStartEvent, advanceRto, addEvent, notifyReturn } from "@/lib/orderFlow";
import { applyImages } from "@/lib/images";
import { refundOrder } from "@/lib/refunds";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { clearFails } from "@/lib/throttle";

/* ---------- Products ---------- */
export async function saveProduct(prev, form) {
  const me = await requirePerm("products"); // har action mein check zaroori hai
  const id = Number(form.get("id") || 0);
  const g = (k) => String(form.get(k) ?? "").trim();
  const v = {
    name: g("name"), sku: g("sku"), category: g("category"), price: g("price"), mrp: g("mrp"),
    stock: g("stock"), material: g("material"), colours: g("colours"), size: g("size"),
    weight_g: g("weight_g"), gst_percent: g("gst_percent") || "12", description: g("description"),
    status: g("status"), colour_main: g("colour_main"), colour_dark: g("colour_dark"),
    specs: g("specs").slice(0, 3000), group_key: g("group_key").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40),
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

  const vals = [v.name, v.sku, v.category, price, mrp, stock, v.material, v.colours, v.size, weight, gst, v.description, v.status, v.colour_main, v.colour_dark, v.specs, v.group_key || null];
  if (id) {
    if (!one("SELECT id FROM products WHERE id = ?", id)) return fail("Product nahi mila.");
    run(
      `UPDATE products SET name=?, sku=?, category=?, price=?, mrp=?, stock=?, material=?, colours=?, size=?,
       weight_g=?, gst_percent=?, description=?, status=?, colour_main=?, colour_dark=?, specs=?, group_key=? WHERE id=?`,
      ...vals, id
    );
  } else {
    run(
      `INSERT INTO products (name, sku, category, price, mrp, stock, material, colours, size, weight_g, gst_percent,
       description, status, colour_main, colour_dark, specs, group_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ...vals
    );
  }
  const pid = id || Number(one("SELECT last_insert_rowid() AS i").i);
  logAct(me, id ? "Product badla" : "Product jodha", `${v.name} (${v.sku})`);
  const imgMsg = await applyImages(pid, form);
  revalidatePath("/", "layout");
  redirect(imgMsg ? `/seller/products/${pid}?imgerr=${encodeURIComponent(imgMsg)}` : "/seller/products");
}

/* ---------- Orders ---------- */

export async function updateOrder(prev, form) {
  const me = await requirePerm("ship");
  const no = String(form.get("order_no") || "");
  const to = String(form.get("status") || "");
  const courier = String(form.get("courier") || "").trim();
  const awb = String(form.get("awb") || "").trim();
  const note = String(form.get("note") || "").trim();
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o) return { error: "Order nahi mila." };
  if (to === "Cancelled" && !can(me.role, "cancel")) return { error: "Order cancel karne ki ijazat aapke role ko nahi hai." };
  if (to === "Delivered" && !can(me.role, "deliver")) return { error: "Delivered mark karne ki ijazat aapke role ko nahi hai." };
  if (o.status === "On Hold" && to === "Confirmed") return { error: "On Hold order ko Verify button se aage badhayein." };

  let err = null;
  transaction(() => {
    if (to) {
      const r = moveOrder(o, to, { by: me, courier, awb, note });
      if (r.error) err = r.error;
      else if (to === "RTO") rtoStartEvent(o.id, me);
    } else if (courier || awb) {
      run("UPDATE orders SET courier = ?, awb = ? WHERE id = ?", courier || o.courier, awb || o.awb, o.id);
    }
  });
  if (err) return { error: err };
  logAct(me, "Order update", `${no}: ${o.status}${to ? " → " + to : ""}${courier || awb ? " · " + (courier || o.courier || "") + " " + (awb || o.awb || "") : ""}`);
  revalidatePath("/", "layout");
  redirect(`/seller/orders/${no}`);
}

// On Hold order: Verify (Confirmed) ya Reject (Cancelled, wajah zaroori)
export async function holdDecision(prev, form) {
  const me = await requirePerm("verify");
  const no = String(form.get("order_no") || "");
  const decision = String(form.get("decision") || "");
  const note = String(form.get("note") || "").trim();
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o || !["On Hold", "Placed"].includes(o.status)) return { error: "Ye order ab On Hold nahi hai." };
  if (decision === "reject" && note.length < 3) return { error: "Reject karne ki wajah likhein." };
  let err = null;
  transaction(() => {
    const r = decision === "reject"
      ? moveOrder(o, "Cancelled", { by: me, note: `Rejected by seller: ${note}` })
      : moveOrder(o, "Confirmed", { by: me, detail: "Verified by seller" + (note ? `: ${note}` : "") });
    if (r.error) err = r.error;
  });
  if (err) return { error: err };
  logAct(me, decision === "reject" ? "Hold order reject kiya" : "Hold order verify kiya", no);
  revalidatePath("/", "layout");
  redirect(`/seller/orders/${no}`);
}

// RTO ka agla step
export async function rtoStep(form) {
  const { rtoNext } = await import("./logistics/actions");
  return rtoNext(form);
}

/* ---------- Returns ---------- */
export async function decideReturn(form) {
  const me = await requirePerm("returns");
  const id = Number(form.get("id"));
  const decision = String(form.get("decision") || "");
  const r = one("SELECT * FROM returns WHERE id = ?", id);
  if (!r) return;
  const order = one("SELECT * FROM orders WHERE id = ?", r.order_id);
  transaction(() => {
    if (decision === "approve" && r.status === "Requested") {
      run("UPDATE returns SET status = 'Approved', stage = 'accepted' WHERE id = ?", id);
      run("UPDATE orders SET status = 'Return Approved' WHERE id = ?", r.order_id);
      addEvent(r.order_id, { kind: "return", code: "accepted", label: "Accepted by seller", by: me, who: "seller" });
      notifyReturn(order, "Your return is accepted", `your return request for order ${order.order_no} is accepted. We will arrange the pickup.`);
    } else if (decision === "reject" && r.status === "Requested") {
      run("UPDATE returns SET status = 'Rejected', stage = 'rejected' WHERE id = ?", id);
      run("UPDATE orders SET status = 'Return Rejected' WHERE id = ?", r.order_id);
      addEvent(r.order_id, { kind: "return", code: "rejected", label: "Not accepted by seller", by: me, who: "seller" });
      notifyReturn(order, "Your return request", `we could not accept the return request for order ${order.order_no}.`);
    }
  });
  logAct(me, decision === "approve" ? "Return approve kiya" : decision === "reject" ? "Return reject kiya" : "Return", `Return #${id}`);
  revalidatePath("/", "layout");
}

// Return (CR) ka agla step: pickup -> picked -> transit -> received -> qc
const CR_NEXT = { accepted: ["pickup", "Pickup scheduled"], pickup: ["picked", "Picked up by courier"], picked: ["transit", "In transit back to seller"], transit: ["received", "Received by seller"], received: ["qc", "Quality check"] };
export async function returnStage(form) {
  const me = await requirePerm("returns");
  const id = Number(form.get("id"));
  const r = one("SELECT * FROM returns WHERE id = ?", id);
  const nx = r && r.status === "Approved" ? CR_NEXT[r.stage] : null;
  if (nx) {
    transaction(() => {
      run("UPDATE returns SET stage = ? WHERE id = ?", nx[0], id);
      addEvent(r.order_id, { kind: "return", code: nx[0], label: nx[1], by: me, who: "seller" });
    });
    logAct(me, "Return step", `Return #${id}: ${nx[1]}`);
  }
  revalidatePath("/", "layout");
}

// Refund: online order par Razorpay se, COD par manual record. Return se aaye to return bhi "Refunded" ho jata hai
export async function refundAction(form) {
  const me = await requirePerm("refund");
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
      run("UPDATE returns SET status = 'Refunded', stage = 'refunded' WHERE id = ?", returnId);
      run("UPDATE orders SET status = 'Refunded' WHERE id = ?", o.id);
      addEvent(o.id, { kind: "return", code: "refunded", label: "Refund issued", by: me, who: "seller" });
    });
  }
  notifyReturn(o, "Your refund", `your refund for order ${no} is issued. It reaches you in ${SITE.refundDays}.`);
  logAct(me, "Refund kiya", `${no} · ₹${o.total}`);
  revalidatePath("/", "layout");
  redirect(`${back}?ok=${encodeURIComponent(res.refundId ? `Razorpay se refund ho gaya (${res.refundId})` : "Refund record ho gaya")}`);
}

// Customer password bhool jaye to temporary password banata hai (seller use WhatsApp par bhejta hai)
export async function resetCustomerPassword(prev, form) {
  const me = await requirePerm("team");
  const u = one("SELECT id, mobile, role FROM users WHERE id = ?", Number(form.get("id")));
  if (!u || u.role !== "buyer") return { error: "Customer nahi mila." };
  const letters = "abcdefghjkmnpqrstuvwxyz23456789"; // milte-julte akshar (l, 1, O, 0) nahi
  const password = Array.from(randomBytes(10), (b) => letters[b % letters.length]).join("");
  run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(password), u.id);
  clearFails(`buyer:${u.mobile}`);
  logAct(me, "Customer ka password reset kiya", `${u.mobile} (ID ${u.id})`);
  return { password };
}
