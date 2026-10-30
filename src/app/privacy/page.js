import { SITE } from "@/lib/site";

export const metadata = { title: `Privacy Policy – ${SITE.name}` };

export default function Privacy() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2>Privacy Policy</h2>
      <p className="mut" style={{ marginTop: -8 }}>Last updated: {SITE.updated}</p>
      <div className="card pad">
        <h3>What we collect</h3>
        <p>When you create an account or place an order, we collect your name, mobile number, email, delivery address and order history. If you write a review, we also keep that review.</p>

        <h3>How we use it</h3>
        <ul>
          <li>To process, ship and deliver your orders.</li>
          <li>To contact you about your order, returns or refunds.</li>
          <li>To keep your account, wishlist and past orders available to you.</li>
        </ul>

        <h3>Payments</h3>
        <p>Online payments are handled by Razorpay. Your card, UPI or bank details go directly to Razorpay. We never see or store them. We only keep a payment reference so we can match a payment to your order.</p>

        <h3>Who we share it with</h3>
        <p>We share only what is needed with our courier partners (your name, address and phone, to deliver the parcel) and with our payment provider (to take payment and process refunds). We do not sell your personal information.</p>

        <h3>Cookies</h3>
        <p>We use small cookies to keep you logged in and to remember the items in your cart. We do not use them for advertising.</p>

        <h3>Security</h3>
        <p>Passwords are stored in a protected (hashed) form. No website can promise perfect security, but we take reasonable care to protect your information.</p>

        <h3>Your choices</h3>
        <p>You can update or delete your saved addresses from My Account. To correct or delete your account details, write to us and we will help.</p>

        <h3>Contact</h3>
        <p style={{ marginBottom: 0 }}>Privacy questions? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </div>
    </div>
  );
}
