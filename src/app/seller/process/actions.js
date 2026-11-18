"use server";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { one, transaction } from "@/lib/db";
import { moveOrder, advanceRto, rtoStartEvent } from "@/lib/orderFlow";
import { logAct } from "@/lib/activity";

// Har order ko uske agle natural step par le jao. Jo nahi ho sakta use reason ke saath chhod do.
const NEXT = { Placed: "Confirmed", Confirmed: "Packed", Packed: "Ready to ship", "Ready to ship": "Picked up", "Picked up": "In transit", "In transit": "Out for delivery", "Out for delivery": "Delivered" };

export async function advanceOrders(nos) {
  const me = await requirePerm("ship");
  const list = [...new Set((Array.isArray(nos) ? nos : []).map((n) => String(n).slice(0, 30)))].slice(0, 100);
  if (!list.length) return { error: "Koi order nahi chuna" };
  const done = [], skipped = [];
  for (const no of list) {
    const o = one("SELECT * FROM orders WHERE order_no = ?", no);
    if (!o) { skipped.push({ no, reason: "Order nahi mila" }); continue; }
    if (o.status === "On Hold") { skipped.push({ no, reason: "Pehle Verify karein (order page par)" }); continue; }
    if (o.status === "RTO" || o.status === "NDR") { skipped.push({ no, reason: o.status === "NDR" ? "NDR page par re-attempt ya RTO karein" : "Returns > RTO page par karein" }); continue; }
    const to = NEXT[o.status];
    if (!to) { skipped.push({ no, reason: `${o.status} se aage nahi badh sakta` }); continue; }
    if (to === "Delivered" && !can(me.role, "deliver")) { skipped.push({ no, reason: "Delivered mark karne ki ijazat nahi" }); continue; }
    let err = null;
    transaction(() => { const r = moveOrder(o, to, { by: me }); if (r.error) err = r.error; });
    if (err) skipped.push({ no, reason: err }); else done.push(no);
  }
  if (done.length) logAct(me, "Order process", `${done.length} order aage badhaye`);
  revalidatePath("/seller", "layout");
  return { done: done.length, skipped };
}
