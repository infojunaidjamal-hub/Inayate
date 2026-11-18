"use server";
import { redirect } from "next/navigation";
import { one, run, transaction } from "@/lib/db";
import { routeNewOrder } from "@/lib/orderFlow";
import { getUser } from "@/lib/auth";
import { getCart, clearCart } from "@/lib/cart";
import { takeStock } from "@/lib/catalog";
import { CHECKOUT, findCoupon, priceOrder, shipOption, rupees } from "@/lib/checkout";
import { minutesLocked, recordFail } from "@/lib/throttle";
import { quote, parcelOfItems } from "@/lib/logistics";
import { chargedKg } from "@/lib/shipMath";

const fail = (field, error) => ({ field, error });

// Checks a coupon against the SERVER's cart value. Returns { coupon } (null = no code) or { error }
function checkCoupon(user, raw, subtotal) {
  const code = String(raw || "").trim().toUpperCase();
  if (!code) return { coupon: null };
  const key = `coupon:${user.id}`;
  const wait = minutesLocked(key);
  if (wait) return { error: `Too many invalid codes. Try again in ${wait} minutes.` };
  const coupon = findCoupon(code);
  if (!coupon) {
    recordFail(key, 8);
    return { error: "This coupon code is not valid." };
  }
  if (subtotal < (coupon.min || 0)) return { error: `${coupon.code} works on orders of ${rupees(coupon.min)} or more.` };
  if (coupon.oncePerUser && usedBefore(user.id, coupon.code)) return { error: "You have already used this coupon." };
  return { coupon };
}

const usedBefore = (userId, code) =>
  !!one("SELECT 1 AS x FROM orders WHERE user_id = ? AND coupon = ? AND status != 'Cancelled'", userId, code);

// Called by the "Apply" button
export async function applyCoupon(code) {
  const user = await getUser();
  if (!user || user.role !== "buyer") return { error: "Please log in again." };
  if (!String(code || "").trim()) return { error: "Enter a coupon code." };
  const cart = await getCart();
  const r = checkCoupon(user, code, cart.subtotal);
  if (r.error) return { error: r.error };
  return { ok: true, code: r.coupon.code };
}

export async function placeOrder(prev, form) {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  if (user.role !== "buyer") redirect("/seller");

  const cart = await getCart();
  if (!cart.items.length) return fail("cart", "Your cart is empty.");
  if (cart.hasSoldOut) return fail("cart", "Some items in your cart are sold out. Remove them to continue.");

  const payRaw = String(form.get("pay") || "");
  if (payRaw !== "online" && payRaw !== "cod") return fail("pay", "Choose a payment method.");
  const online = payRaw === "online";

  const opt = shipOption(String(form.get("ship") || ""));
  if (!opt) return fail("ship", "Choose a shipping method.");

  const choice = String(form.get("address") || "");
  let addr;
  if (choice === "new") {
    addr = {
      name: String(form.get("name") || "").trim(),
      line: String(form.get("line") || "").trim(),
      city: String(form.get("city") || "").trim(),
      state: String(form.get("state") || "").trim(),
      pincode: String(form.get("pincode") || "").trim(),
    };
    if (addr.name.length < 2) return fail("name", "Enter your full name.");
    if (addr.line.length < 5) return fail("line", "Enter the full address (house, society, area).");
    if (!addr.city) return fail("city", "Enter your city.");
    if (!addr.state) return fail("state", "Enter your state.");
    if (!/^\d{6}$/.test(addr.pincode)) return fail("pincode", "Enter a valid 6-digit pincode.");
  } else {
    addr = one("SELECT * FROM addresses WHERE id = ? AND user_id = ?", Number(choice), user.id);
    if (!addr) return fail("address", "Choose a delivery address.");
  }

  // Pincode par delivery, COD aur Express ka check (server par hi, browser ka bharosa nahi)
  const parcel = parcelOfItems(cart.items.map((i) => ({ product_id: i.p.id, qty: i.qty })));
  const qt = quote(addr.pincode, { cod: !online, kg: chargedKg(parcel.weight_g, parcel.l, parcel.w, parcel.h) });
  if (qt.bad) return fail("pincode", "Enter a valid 6-digit pincode.");
  if (qt.deliverable === false) return fail("address", `We do not deliver to ${addr.pincode} yet.`);
  if (!online && qt.cod === false) return fail("pay", "Cash on Delivery is not available for this pincode. Please pay online.");
  if (opt.id === "express" && !qt.express) return fail("ship", "Express delivery is not available for this pincode.");
  const promisedBy = (opt.id === "express" ? qt.express : qt.standard)?.iso || null;

  // order note + gift flag (plain text only, length limited)
  const note = String(form.get("note") || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, CHECKOUT.noteMax);
  const gift = form.get("gift") === "on" ? 1 : 0;

  const cp = checkCoupon(user, form.get("coupon"), cart.subtotal);
  if (cp.error) return fail("coupon", cp.error);

  // The price is always worked out here on the server. The browser never sends an amount.
  const price = priceOrder({ subtotal: cart.subtotal, ship: opt.id, pay: online ? "online" : "cod", coupon: cp.coupon });

  let orderNo;
  try {
    orderNo = transaction(() => {
      // re-check inside the transaction so one-time coupons cannot be used twice
      if (cp.coupon?.oncePerUser && usedBefore(user.id, cp.coupon.code)) throw new Error("COUPON");
      if (choice === "new") {
        const first = one("SELECT COUNT(*) c FROM addresses WHERE user_id = ?", user.id).c === 0;
        run(
          "INSERT INTO addresses (user_id,label,name,line,city,state,pincode,is_default) VALUES (?,?,?,?,?,?,?,?)",
          user.id, "Home", addr.name, addr.line, addr.city, addr.state, addr.pincode, first ? 1 : 0
        );
      }
      const last = one("SELECT MAX(CAST(SUBSTR(order_no, 3) AS INTEGER)) m FROM orders").m || 1040;
      const no = "MB" + (last + 1);
      const shipTo = `${addr.line}, ${addr.city}, ${addr.state} ${addr.pincode}`;
      const o = run(
        `INSERT INTO orders (order_no,user_id,ship_name,ship_mobile,ship_address,subtotal,shipping,total,pay_method,pay_status,status,
                             ship_method,cod_fee,coupon,coupon_discount,online_discount,order_note,gift,promised_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        no, user.id, addr.name, user.mobile, shipTo, cart.subtotal, price.shipping, price.total,
        online ? "Online" : "COD",
        online ? "Payment Pending" : "COD Pending",
        online ? "Awaiting Payment" : "Placed",
        price.shipId, price.codFee, cp.coupon ? cp.coupon.code : null, price.couponDiscount, price.onlineDiscount, note || null, gift, promisedBy
      );
      for (const it of cart.items) {
        // stock only goes down if there is enough (safe when two people buy at the same time). Variant ho to variant ka stock.
        if (!takeStock(it.p.id, it.vid, it.qty)) throw new Error("STOCK:" + it.name);
        run(
          "INSERT INTO order_items (order_id,product_id,name,price,qty,variant_id,variant_label,sku) VALUES (?,?,?,?,?,?,?,?)",
          o.lastInsertRowid, it.p.id, it.name, it.price, it.qty, it.vid, it.label, it.sku
        );
      }
      return no;
    });
  } catch (e) {
    const m = String(e.message);
    if (m.startsWith("STOCK:")) return fail("cart", `"${m.slice(6)}" is low on stock now. Please review your cart and try again.`);
    if (m === "COUPON") return fail("coupon", "You have already used this coupon.");
    throw e;
  }

  await clearCart();
  if (!online) {
    const placed = one("SELECT id FROM orders WHERE order_no = ?", orderNo);
    if (placed) routeNewOrder(placed.id); // rules dekho: On Hold ya Confirmed
  }
  redirect(online ? `/pay/${orderNo}` : `/order/${orderNo}?placed=1`);
}
