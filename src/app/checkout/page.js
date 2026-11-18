import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getCartSnapshot } from "@/lib/cart";
import { all } from "@/lib/db";
import CheckoutForm from "./CheckoutForm";
import "./checkout.css";
import "@/components/stock.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout – Inayate Bags" };

export default async function Checkout() {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  if (user.role !== "buyer") redirect("/seller");
  const cart = await getCartSnapshot();
  if (!cart.items.length) redirect("/cart");
  const addresses = all("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id", user.id);

  return (
    <div className="ck">
      <ol className="ck-steps" aria-label="Checkout progress">
        <li className="done"><i>✓</i>Cart</li>
        <li className="now" aria-current="step"><i>2</i>Checkout</li>
        <li><i>3</i>Payment</li>
      </ol>
      <h2>Checkout</h2>
      <p className="ck-lead">Almost there. Confirm where to send your order and how you would like to pay.</p>
      <CheckoutForm addresses={addresses} initial={cart} userName={user.name} userMobile={user.mobile} />
    </div>
  );
}
