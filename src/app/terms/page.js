import { SITE } from "@/lib/site";

export const metadata = { title: `Terms and Conditions – ${SITE.name}` };

export default function Terms() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2>Terms and Conditions</h2>
      <p className="mut" style={{ marginTop: -8 }}>Last updated: {SITE.updated}</p>
      <div className="card pad">
        <h3>1. About these terms</h3>
        <p>By using this website and placing an order with {SITE.name}, you agree to these terms. Please read them before you shop.</p>

        <h3>2. Products and prices</h3>
        <p>All prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise. Product photos and colours are for reference; the actual colour may look slightly different on your screen. We may change prices or product details at any time, but the price you see when you place an order is the price you pay.</p>

        <h3>3. Orders</h3>
        <p>An order is confirmed once you place it with Cash on Delivery, or once your online payment is successful. We may cancel an order if an item is out of stock, if there is a pricing or listing error, or if we cannot reach you on the details given. If we cancel a paid order, you get a full refund.</p>

        <h3>4. Payments</h3>
        <p>You can pay online (UPI, cards, netbanking) or by Cash on Delivery. Online payments are processed securely by Razorpay. We do not see or store your card or UPI details.</p>

        <h3>5. Shipping, cancellation and returns</h3>
        <p>Delivery timelines, cancellation, returns and refunds are explained on our Shipping and Returns page, which is part of these terms.</p>

        <h3>6. Your account</h3>
        <p>You are responsible for keeping your password safe and for the details you give us. Please give a correct name, mobile number and delivery address so your order reaches you.</p>

        <h3>7. Reviews</h3>
        <p>Reviews should be honest and based on your own experience. We may remove reviews that are abusive, false or unrelated to the product.</p>

        <h3>8. Limitation of liability</h3>
        <p>We try to keep this website accurate and available, but we do not promise that it will always be free of errors or interruptions. To the extent allowed by law, our liability for any order is limited to the amount you paid for it.</p>

        <h3>9. Governing law</h3>
        <p>These terms are governed by the laws of India. Any dispute will be subject to the courts of {SITE.city}.</p>

        <h3>10. Changes to these terms</h3>
        <p>We may update these terms from time to time. The date at the top shows when they were last changed.</p>

        <h3>11. Contact</h3>
        <p style={{ marginBottom: 0 }}>Questions about these terms? Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </div>
    </div>
  );
}
