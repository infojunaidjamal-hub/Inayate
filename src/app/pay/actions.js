"use server";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyPayment } from "@/lib/payments";
import { one, run } from "@/lib/db";
import { getUser } from "@/lib/auth";

async function myOrder(orderNo) {
  const user = await getUser();
  if (!user || user.role === "seller") return null;
  return one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", orderNo, user.id) ?? null;
}

// Razorpay par order banata hai (paisa paise mein: Rs 1 = 100 paise)
export async function createRazorpayOrder(orderNo) {
  const o = await myOrder(String(orderNo));
  if (!o) return { error: "Order nahi mila. Dobara login karein." };
  if (o.status !== "Awaiting Payment") return { error: "Is order ka payment ho chuka hai ya order cancel hai." };

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { error: ".env mein Razorpay keys nahi mili. Website band karke dobara chalayein." };

  try {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const rzpOrder = await rzp.orders.create({
      amount: Math.round(o.total * 100),
      currency: "INR",
      receipt: o.order_no,
    });
    run("UPDATE orders SET razorpay_order_id = ? WHERE id = ?", rzpOrder.id, o.id);
    return { keyId, rzpOrderId: rzpOrder.id, amount: rzpOrder.amount };
  } catch (e) {
    console.error("Razorpay order error:", e);
    return { error: "Razorpay se connect nahi ho paya. Keys sahi hain ya nahi check karein." };
  }
}

// Payment ke baad check karta hai ki payment asli hai (signature match)
export async function verifyPayment(orderNo, resp) {
  const o = await myOrder(String(orderNo));
  if (!o) return { error: "Order nahi mila." };

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = resp || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return { error: "Payment ki detail adhoori hai." };
  if (o.razorpay_order_id !== razorpay_order_id) return { error: "Payment is order se match nahi hua." };
  if (o.pay_status === "Paid") return { ok: true };

  if (!process.env.RAZORPAY_KEY_SECRET) return { error: "Server par Razorpay secret key nahi mili." };
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(razorpay_signature));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { error: "Payment verify nahi ho paya. Agar paisa kata hai to humse sampark karein." };
  }

  if (o.status !== "Awaiting Payment") {
    // paisa kat gaya par order pehle hi cancel ya expire ho chuka tha: seller ko refund dena hoga
    run("UPDATE orders SET pay_status = 'Refund Initiated', razorpay_payment_id = ? WHERE id = ?", razorpay_payment_id, o.id);
    revalidatePath("/", "layout");
    return { error: "Ye order cancel ya expire ho chuka tha. Aapka paisa wapas kiya jayega." };
  }
  run(
    "UPDATE orders SET pay_status = 'Paid', status = 'Placed', razorpay_payment_id = ? WHERE id = ? AND status = 'Awaiting Payment'",
    razorpay_payment_id, o.id
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

// "Paisa kat gaya par order pending dikh raha hai" ke liye: Razorpay se seedha poochta hai
export async function checkPayment(form) {
  const o = await myOrder(String(form.get("order_no") || ""));
  if (!o || !o.razorpay_order_id) redirect("/account/orders");
  let msg = "Abhi tak is order ka payment nahi mila. Agar paisa kata hai to kuch der baad dobara check karein.";
  try {
    const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const r = await rzp.orders.fetchPayments(o.razorpay_order_id);
    const hit = (r.items || []).find((p) => p.status === "captured" && p.amount === Math.round(o.total * 100));
    if (hit) {
      const x = applyPayment(o, hit.id, hit.amount);
      msg = x.refundDue ? "Order cancel ho chuka tha, aapka paisa wapas kiya jayega." : "Payment mil gaya! Aapka order confirm ho gaya.";
    }
  } catch (e) {
    console.error("checkPayment:", e?.error?.description || e?.message);
  }
  revalidatePath("/", "layout");
  redirect(`/order/${o.order_no}?msg=${encodeURIComponent(msg)}`);
}
