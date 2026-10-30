"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBag } from "./Icons";
import { useCart } from "./CartProvider";

// Header cart link. A normal click opens the side drawer; middle-click, ctrl/cmd-click
// and no-JS still go to the real /cart page. On /cart and /checkout it is a plain link.
export default function CartButton() {
  const { cart, openCart } = useCart();
  const pathname = usePathname();
  const plain = pathname.startsWith("/cart") || pathname.startsWith("/checkout");

  const onClick = (e) => {
    if (plain || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openCart();
  };

  return (
    <Link href="/cart" className="hd-item hd-cart" onClick={onClick} aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}>
      <IconBag /><span>Cart</span>
      {cart.count > 0 && <em aria-hidden="true">{cart.count}</em>}
    </Link>
  );
}
