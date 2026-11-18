import { createHmac, timingSafeEqual } from "node:crypto";
import { one } from "@/lib/db";
import { applyPayment } from "@/lib/payments";
import { logEvent } from "@/lib/track";

// Razorpay yahan khud batata hai ki payment ho gaya (customer ka tab band ho tab bhi)
export async function POST(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook secret set nahi hai", { status: 503 });

  const raw = await req.text(); // signature poori raw body par banta hai
  const sig = req.headers.get("x-razorpay-signature") || "";
  const good = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(good), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("bad signature", { status: 400 });

  let ev;
  try { ev = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  if (ev.event === "payment.captured" || ev.event === "order.paid") {
    const pay = ev.payload?.payment?.entity;
    if (pay?.order_id) {
      const o = one("SELECT * FROM orders WHERE razorpay_order_id = ?", pay.order_id);
      const r = applyPayment(o, pay.id, pay.amount);
      if (r.error) console.error("webhook:", pay.order_id, r.error);
    }
  }
  if (ev.event === "payment.failed") {
    const pay = ev.payload?.payment?.entity;
    const o = pay?.order_id ? one("SELECT id, total FROM orders WHERE razorpay_order_id = ?", pay.order_id) : null;
    if (o) logEvent("payment_failed", { order_id: o.id, value: Math.round(o.total) });
  }
  return Response.json({ ok: true });
}
