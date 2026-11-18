// Razorpay ka paisa mila: order ko Paid karo (webhook aur "payment check" dono yahi use karte hain)
import { run } from "@/lib/db";
import { routeNewOrder } from "@/lib/orderFlow";

export function applyPayment(order, paymentId, paidPaise) {
  if (!order) return { error: "Order nahi mila." };
  if (order.pay_status === "Paid") return { ok: true, already: true };
  if (Number(paidPaise) !== Math.round(order.total * 100)) return { error: "Amount order se match nahi hua." };

  if (order.status === "Awaiting Payment") {
    run(
      "UPDATE orders SET pay_status = 'Paid', status = 'Placed', razorpay_payment_id = ? WHERE id = ? AND status = 'Awaiting Payment'",
      paymentId, order.id
    );
    routeNewOrder(order.id); // rules dekho: On Hold ya Confirmed
    return { ok: true, paid: true };
  }
  // paisa kat gaya par order pehle hi cancel ya expire ho chuka tha: seller ko refund dena hoga
  if (order.pay_status !== "Refund Initiated" && order.pay_status !== "Refunded") {
    run("UPDATE orders SET pay_status = 'Refund Initiated', razorpay_payment_id = ? WHERE id = ?", paymentId, order.id);
  }
  return { ok: true, refundDue: true };
}
