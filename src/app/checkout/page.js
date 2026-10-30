import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { all, inr } from "@/lib/db";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout – Inayate Bags" };

export default async function Checkout() {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  if (user.role === "seller") redirect("/seller");
  const cart = await getCart();
  if (!cart.items.length) redirect("/cart");
  const addresses = all("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id", user.id);

  return (
    <>
      <h2>Checkout</h2>
      <div className="two">
        <CheckoutForm addresses={addresses} total={cart.total} userName={user.name} />
        <div>
          <div className="card pad">
            <h3>Order Summary</h3>
            {cart.items.map(({ p, qty, line }) => (
              <div className="row" key={p.id}><span>{p.name} × {qty}</span><span>{inr(line)}</span></div>
            ))}
            <div className="row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
            <div className="row"><span>Shipping</span><span>{cart.shipping ? inr(cart.shipping) : "FREE"}</span></div>
            <div className="row" style={{ border: 0 }}><b>Total</b><b>{inr(cart.total)}</b></div>
          </div>
        </div>
      </div>
    </>
  );
}
