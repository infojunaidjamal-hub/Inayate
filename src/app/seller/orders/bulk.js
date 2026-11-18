"use server";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/auth";
import { one, transaction } from "@/lib/db";
import { moveOrder } from "@/lib/orderFlow";

// Kai orders ko ek saath aage badhao (sirf Confirmed / Packed). Wahi niyam jo ek order par lagte hain (NEXT_STATUS).
// Shipped / Delivered / Cancelled yahan nahi hain: Shipped mein har order ka courier + tracking ID alag chahiye.
export async function bulkAdvance(nos, to) {
  const me = await requirePerm("ship");
  if (!["Confirmed", "Packed"].includes(to)) return { error: "Ye action bulk mein nahi ho sakta" };
  const list = [...new Set((Array.isArray(nos) ? nos : []).map((n) => String(n).slice(0, 30)))].slice(0, 100);
  if (!list.length) return { error: "Koi order nahi chuna" };

  const done = [], skipped = [];
  transaction(() => {
    for (const no of list) {
      const o = one("SELECT * FROM orders WHERE order_no = ?", no);
      if (!o) { skipped.push({ no, reason: "Order nahi mila" }); continue; }
      if (o.status === "On Hold") { skipped.push({ no, reason: "On Hold hai, pehle Order process mein verify karein" }); continue; }
      const r = moveOrder(o, to, { by: me });
      if (r.error) skipped.push({ no, reason: r.error }); else done.push(no);
    }
  });
  revalidatePath("/seller", "layout");
  return { to, done: done.length, skipped };
}
