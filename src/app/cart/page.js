import { SITE } from "@/lib/site";
import Link from "next/link";
import BagArt from "@/components/BagArt";
import { getCart } from "@/lib/cart";
import { inr } from "@/lib/db";
import { changeQty, removeItem } from "./actions";
import "@/components/stock.css";

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
      {cart.items.map(({ p, key, name, image, price, stock, qty, line, soldOut }) => (
        <div className="row" key={key} style={{ flexWrap: "wrap", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 220px", minWidth: 0 }}>
            <span className="th" style={{ cursor: "default", overflow: "hidden", opacity: soldOut ? 0.55 : 1 }}>{image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BagArt main={p.colour_main} dark={p.colour_dark} />}</span>
            <span>
              <Link href={`/products/${p.id}`}>{name}</Link><br />
              <span className="mut">{inr(price)}</span>
              {soldOut ? <span className="tag r" style={{ marginLeft: 8 }}>Out of stock</span> : stock <= 5 && <span className="tag y" style={{ marginLeft: 8 }}>Only {stock} left</span>}
              {soldOut && <><br /><Link href={`/products/${p.id}#notify`} className="cd-notify">Notify me when back</Link></>}
            </span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!soldOut && (
              <>
                <form action={changeQty}>
                  <input type="hidden" name="key" value={key} /><input type="hidden" name="delta" value="-1" />
                  <button className="btn o s" style={{ minWidth: 44, minHeight: 44 }} aria-label={`Decrease quantity of ${name}`} disabled={qty <= 1}>−</button>
                </form>
                <b>{qty}</b>
                <form action={changeQty}>
                  <input type="hidden" name="key" value={key} /><input type="hidden" name="delta" value="1" />
                  <button className="btn o s" style={{ minWidth: 44, minHeight: 44 }} aria-label={`Increase quantity of ${name}`} disabled={qty >= Math.min(stock, 10)}>+</button>
                </form>
              </>
            )}
            <form action={removeItem}>
              <input type="hidden" name="key" value={key} />
              <button className="btn o s" style={{ minHeight: 44 }} aria-label={`Remove ${name}`} title="Hatayein">✕</button>
            </form>
          </span>
          <b>{soldOut ? "—" : inr(line)}</b>
        </div>
      ))}
      {cart.hasSoldOut && <p className="cart-out" role="alert">Kuch items sold out hain. Unhe hata dein ya &quot;Notify me&quot; chunein. Checkout tabhi khulega.</p>}
      <div className="row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
      <div className="row"><span>Shipping</span><span>{cart.shipping ? inr(cart.shipping) : "FREE"}</span></div>
      {cart.shipping > 0 && SITE.freeShippingAbove > 0 && <p className="mut" style={{ fontSize: 12 }}>{inr(SITE.freeShippingAbove - cart.subtotal)} aur ka saman lene par shipping free.</p>}
      <div className="row"><b>Total</b><b>{inr(cart.total)}</b></div>
      <p>{cart.hasSoldOut || cart.subtotal === 0 ? <button className="btn a" disabled>Remove sold-out items to checkout</button> : <Link href="/checkout" className="btn a">Proceed to Checkout</Link>}</p>
    </>
  );
}
