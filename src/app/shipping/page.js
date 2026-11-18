import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = { title: `Shipping and Returns – ${SITE.name}` };

export default function Shipping() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2>Shipping and Returns</h2>
      <p className="mut" style={{ marginTop: -8 }}>Last updated: {SITE.updated}</p>
      <div className="card pad">
        <h3>Shipping</h3>
        <p>We deliver across India.</p>
        <ul>
          <li>Standard shipping is <b>free</b> on every order. Express delivery (where available) costs ₹199. You can check the delivery date for your pincode on the product page.</li>
          <li>Orders are dispatched within {SITE.dispatchDays}.</li>
          <li>Delivery usually takes {SITE.deliveryDays} after dispatch, depending on your location.</li>
          <li>Once your order is shipped, the courier name and tracking ID appear on your order page under My Account.</li>
          <li>Cash on Delivery is available. Please keep the exact amount ready for the delivery person.</li>
        </ul>

        <h3>Cancelling an order</h3>
        <p>You can cancel an order yourself from its order page until it is packed and shipped. If you already paid online, the amount is refunded to your original payment method. After the order is shipped, it cannot be cancelled, but you can return it once it arrives.</p>

        <h3>Returns</h3>
        <p>You can request a return within {SITE.returnDays} days of delivery if:</p>
        <ul>
          <li>the item is unused and in its original condition and packaging, or</li>
          <li>the item is damaged, defective or different from what you ordered.</li>
        </ul>
        <p>To start a return, open your delivered order under My Account and use the return option. Tell us the reason, and share photos by email or WhatsApp if the item arrived damaged. We will review the request and update you on the order page.</p>
        <p>If an item arrives damaged or wrong, please tell us within 48 hours of delivery so we can sort it out quickly.</p>

        <h3>Refunds</h3>
        <ul>
          <li>Once a return is approved and the item reaches us, your refund is processed within {SITE.refundDays}.</li>
          <li>Online payments are refunded to the original payment method (card, UPI or bank).</li>
          <li>For Cash on Delivery orders, we will ask for your UPI ID or bank details to send the refund.</li>
          <li>Shipping charges are not refunded unless the return is due to our mistake.</li>
        </ul>

        <h3>Need help?</h3>
        <p style={{ marginBottom: 0 }}>Please <Link href="/contact" style={{ textDecoration: "underline" }}>contact us</Link> with your order number and we will help you.</p>
      </div>
    </div>
  );
}
