"use server";
import { redirect } from "next/navigation";
import { one, run, transaction } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getCart, clearCart } from "@/lib/cart";

export async function placeOrder(prev, form) {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  if (user.role === "seller") redirect("/seller");

  const cart = await getCart();
  if (!cart.items.length) return { error: "Aapka cart khali hai." };

  const online = String(form.get("pay") || "cod") === "online";

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
    if (addr.name.length < 2) return { error: "Naam likhein." };
    if (addr.line.length < 5) return { error: "Poora address likhein (ghar, society, area)." };
    if (!addr.city || !addr.state) return { error: "City aur state likhein." };
    if (!/^\d{6}$/.test(addr.pincode)) return { error: "6 digit ka sahi pincode daalein." };
  } else {
    addr = one("SELECT * FROM addresses WHERE id = ? AND user_id = ?", Number(choice), user.id);
    if (!addr) return { error: "Address chuniye." };
  }

  let orderNo;
  try {
    orderNo = transaction(() => {
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
        `INSERT INTO orders (order_no,user_id,ship_name,ship_mobile,ship_address,subtotal,shipping,total,pay_method,pay_status,status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        no, user.id, addr.name, user.mobile, shipTo, cart.subtotal, cart.shipping, cart.total,
        online ? "Online" : "COD",
        online ? "Payment Pending" : "COD Pending",
        online ? "Awaiting Payment" : "Placed"
      );
      for (const { p, qty } of cart.items) {
        // stock tabhi ghatega jab kaafi ho (do log ek saath khareedein to bhi safe)
        const r = run("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", qty, p.id, qty);
        if (r.changes !== 1) throw new Error("STOCK:" + p.name);
        run("INSERT INTO order_items (order_id,product_id,name,price,qty) VALUES (?,?,?,?,?)", o.lastInsertRowid, p.id, p.name, p.price, qty);
      }
      return no;
    });
  } catch (e) {
    if (String(e.message).startsWith("STOCK:")) {
      return { error: `"${e.message.slice(6)}" ka stock ab kam hai. Cart check karke dobara try karein.` };
    }
    throw e;
  }

  await clearCart();
  redirect(online ? `/pay/${orderNo}` : `/order/${orderNo}?placed=1`);
}
