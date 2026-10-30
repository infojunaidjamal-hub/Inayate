import { SITE } from "@/lib/site";
import Link from "next/link";
import BagArt from "@/components/BagArt";
import { getCart } from "@/lib/cart";
import { inr } from "@/lib/db";
import { changeQty, removeItem } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cart – Inayate Bags" };

export default async function CartPage() {
  const cart = await getCart();
  if (!cart.items.length) {
    return (
      <>
        <h2>Aapka cart khali hai</h2>
        <Link href="/products" className="btn">Shopping shuru karein</Link>
      </>
    );
  }
  return (
    <>
      <h2>Your Cart</h2>
      {cart.items.map(({ p, qty, line }) => (
        <div className="row" key={p.id}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="th" style={{ cursor: "default", overflow: "hidden" }}>{p.image ? <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BagArt main={p.colour_main} dark={p.colour_dark} />}</span>
            <span>
              <Link href={`/products/${p.id}`}>{p.name}</Link><br />
              <span className="mut">{inr(p.price)}</span>
              {p.stock <= 5 && <span className="tag y" style={{ marginLeft: 8 }}>Only {p.stock} left</span>}
            </span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <form action={changeQty}>
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="delta" value="-1" />
              <button className="btn o s">−</button>
            </form>
            <b>{qty}</b>
            <form action={changeQty}>
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="delta" value="1" />
              <button className="btn o s" disabled={qty >= Math.min(p.stock, 10)}>+</button>
            </form>
            <form action={removeItem}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn o s" title="Hatayein">✕</button>
            </form>
          </span>
          <b>{inr(line)}</b>
        </div>
      ))}
      <div className="row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
      <div className="row"><span>Shipping</span><span>{cart.shipping ? inr(cart.shipping) : "FREE"}</span></div>
      {cart.shipping > 0 && <p className="mut" style={{ fontSize: 12 }}>{inr(SITE.freeShippingAbove - cart.subtotal)} aur ka saman lene par shipping free.</p>}
      <div className="row"><b>Total</b><b>{inr(cart.total)}</b></div>
      <p><Link href="/checkout" className="btn a">Proceed to Checkout</Link></p>
    </>
  );
}
