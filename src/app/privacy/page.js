import { SITE } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";

export const metadata = { title: `Privacy Policy – ${SITE.name}` };

// Is page ki tarikh alag hai (SITE.updated Terms aur Shipping ke liye hai). Jab bhi neeche ka text badlo, ye tarikh bhi badlo.
const UPDATED = "7 November 2026";

export default function Privacy() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2>Privacy Policy</h2>
      <p className="mut" style={{ marginTop: -8 }}>Last updated: {UPDATED}</p>
      <div className="card pad">
        <h3>What we collect</h3>
        <p>When you create an account or place an order, we collect your name, mobile number, email, delivery address and order history. If you write a review, we also keep that review. If you use our chat assistant or join our email list, we keep what you send us there (see below).</p>

        <h3>How we use it</h3>
        <ul>
          <li>To process, ship and deliver your orders.</li>
          <li>To contact you about your order, returns or refunds.</li>
          <li>To keep your account, wishlist and past orders available to you.</li>
          <li>To understand which products and pages are popular, and to improve the shop and our chat answers.</li>
          <li>To send you emails about new arrivals and offers, only if you joined our email list.</li>
        </ul>

        <h3>Payments</h3>
        <p>Online payments are handled by Razorpay. Your card, UPI or bank details go directly to Razorpay. We never see or store them. We only keep a payment reference so we can match a payment to your order.</p>

        <h3>Who we share it with</h3>
        <p>We share only what is needed with our courier partners (your name, address and phone, to deliver the parcel) and with our payment provider (to take payment and process refunds). If you tap a WhatsApp button, WhatsApp opens on your phone and its own privacy terms apply to that conversation. We do not sell your personal information.</p>

        <h3>Cookies and storage on your device</h3>
        <p>We use these small files, set by our own website only. We do not use them for advertising.</p>
        <ul>
          <li><b>Login</b> (<code>maison_session</code>): keeps you logged in until you log out or it expires.</li>
          <li><b>Cart</b> (<code>maison_cart</code>): remembers the items in your cart for up to 30 days.</li>
          <li><b>Anonymous visitor ID</b> (<code>ib_vid</code>): a random code, kept for up to 1 year, used for the shop activity counts described below.</li>
          <li><b>Saved on your device only</b> (not sent to us): recently viewed products, your preferred product grid layout, and whether you have already seen our welcome offer.</li>
        </ul>
        <p>You can delete cookies from your browser settings at any time. The shop still works, but your cart and login will be forgotten.</p>

        <h3>Shop activity (anonymous counts)</h3>
        <p>To see what shoppers like, we count simple actions: a product was shown in a list, a product page was opened, an item was added to the cart, checkout was opened, a payment did not go through, and an order was placed. These counts use the random visitor ID above. They do not contain your name, mobile number, email or IP address, and the visitor ID is not linked to your account. For orders and failed payments we keep the order number so that sales are counted correctly. We keep these records for up to 13 months.</p>

        <h3>Chat assistant</h3>
        <p>Our chat assistant answers from our store information using automatic rules. Your messages are not sent to any outside AI service. When you are logged in, it can show the status of your own orders. It never shows your address, phone number or payment details in the chat.</p>
        <p>We save your chat questions, the topic and language, and whether the assistant could answer, so our team can improve the answers. Long numbers such as phone or card numbers are hidden before saving. If you are logged in, they are linked to your account so our team can help you. Only our staff can read them, and they are deleted after 90 days. Please do not type passwords or card details in the chat.</p>

        <h3>Emails and offers</h3>
        <p>If you give us your email for updates, we use it only to send news and offers from {SITE.name}. Write to us at any time and we will stop sending you emails.</p>

        <h3>Internal notes and blocked accounts</h3>
        <p>Our team may keep short private notes or labels on a customer account, for example a delivery preference or a problem with an order. Customers do not see these notes. We may block an account that is used for fake orders or misuse.</p>

        <h3>How long we keep it</h3>
        <p>We keep your account and order details while your account is active, and for as long as we need them for returns, refunds, accounting and legal requirements. Cart, visitor ID, shop activity and chat records are kept for the periods stated above.</p>

        <h3>Security</h3>
        <p>Passwords are stored in a protected (hashed) form. No website can promise perfect security, but we take reasonable care to protect your information.</p>

        <h3>Your choices</h3>
        <p>You can update or delete your saved addresses from My Account. You can ask us what details we hold about you, ask us to correct them, or ask us to delete your account details. You can also ask us to stop sending emails. Write to us and we will help, as the law of India allows.</p>

        <h3>Contact</h3>
        <p style={{ marginBottom: 0 }}>Privacy questions? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or message us on <a href={waLink()} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
      </div>
    </div>
  );
}
