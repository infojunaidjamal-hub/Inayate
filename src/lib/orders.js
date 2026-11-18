// Order ke helpers: adhura payment expire karna, return ki din-seema
import { all, one, run, transaction } from "@/lib/db";
import { SITE } from "@/lib/site";
import { giveStock } from "@/lib/catalog";

export const EXPIRY_MIN = 60; // online payment shuru kiya par poora nahi kiya, to itne minute baad order cancel

// "Awaiting Payment" order jo EXPIRY_MIN se purane hain: cancel karo aur stock wapas daalo
export function expireUnpaidOrders() {
  try {
    const rows = all("SELECT id FROM orders WHERE status = 'Awaiting Payment' AND created_at < datetime('now', ?)", `-${EXPIRY_MIN} minutes`);
    for (const o of rows) {
      transaction(() => {
        const r = run("UPDATE orders SET status = 'Cancelled', pay_status = 'Expired' WHERE id = ? AND status = 'Awaiting Payment'", o.id);
        if (r.changes !== 1) return;
        for (const i of all("SELECT * FROM order_items WHERE order_id = ?", o.id)) {
          if (i.product_id) giveStock(i.product_id, i.variant_id, i.qty);
        }
      });
    }
  } catch (e) {
    console.error("expireUnpaidOrders:", e);
  }
}

// Delivery ke baad SITE.returnDays din tak return ho sakta hai (purane orders jinki date nahi hai, unhe chhoot hai)
export function returnWindowOpen(o) {
  if (!o.delivered_at) return true;
  return one("SELECT julianday('now') - julianday(?) AS d", o.delivered_at).d <= SITE.returnDays;
}

export function returnLastDate(o) {
  if (!o.delivered_at) return "";
  const d = new Date(String(o.delivered_at).replace(" ", "T") + "Z");
  d.setDate(d.getDate() + SITE.returnDays);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
