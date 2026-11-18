"use server";
// Pincode check: buyer ke liye delivery ki tareekh, Express aur COD
import { getCart } from "@/lib/cart";
import { one } from "@/lib/db";
import { quote, parcelOfItems } from "@/lib/logistics";
import { chargedKg } from "@/lib/shipMath";

// productId diya to us product ke hisaab se, nahi to cart ke hisaab se
export async function checkDelivery(pin, productId = 0) {
  const p = String(pin || "").trim();
  let items = [];
  if (productId) {
    const row = one("SELECT id FROM products WHERE id = ?", Number(productId));
    if (row) items = [{ product_id: row.id, qty: 1 }];
  } else {
    const c = await getCart();
    items = c.items.map((i) => ({ product_id: i.p.id, qty: i.qty }));
  }
  const parcel = items.length ? parcelOfItems(items) : { weight_g: 500, l: 0, w: 0, h: 0 };
  const kg = chargedKg(parcel.weight_g, parcel.l, parcel.w, parcel.h);
  const q = quote(p, { cod: false, kg });
  return JSON.parse(JSON.stringify(q));
}
