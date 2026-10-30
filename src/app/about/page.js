import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = { title: `About – ${SITE.name}` };

export default function About() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2>About {SITE.name}</h2>
      <div className="card pad" style={{ marginBottom: 14 }}>
        <p style={{ marginTop: 0 }}>
          {SITE.name} is an online handbag store. {SITE.tagline} We keep our range simple:
          totes, slings and everyday bags that look good, carry well and stay affordable.
        </p>
        <p style={{ marginBottom: 0 }}>
          Every order is checked and packed with care before it leaves us, and our support team
          is only a message away if you need help with a size, a colour or an order.
        </p>
      </div>

      <div className="perks">
        <div className="card pad">🚚 <b>Free shipping</b><br />on orders above ₹{SITE.freeShippingAbove.toLocaleString("en-IN")}</div>
        <div className="card pad">↩️ <b>Easy returns</b><br />within {SITE.returnDays} days of delivery</div>
        <div className="card pad">🔒 <b>Secure payments</b><br />UPI, cards and netbanking via Razorpay</div>
        <div className="card pad">💵 <b>Cash on Delivery</b><br />available on all orders</div>
      </div>

      <p style={{ marginTop: 22 }}>
        <Link href="/products" className="btn a">Shop now</Link>{" "}
        <Link href="/contact" className="btn o">Contact us</Link>
      </p>
    </div>
  );
}
