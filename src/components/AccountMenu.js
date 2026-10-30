"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconUser } from "./Icons";

// Header ka "Account" button. Login nahi hai to Login page par le jata hai,
// login hai to chhota menu kholta hai (orders, wishlist, logout...).
export default function AccountMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const box = useRef(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  if (!user) {
    return (
      <Link href="/login" className="hd-item"><IconUser /><span>Account</span></Link>
    );
  }

  const first = String(user.name || "Account").split(" ")[0];

  return (
    <div className="hd-acc" ref={box}>
      <button type="button" className="hd-item" onClick={() => setOpen(!open)} aria-expanded={open}>
        <IconUser /><span>{first} ▾</span>
      </button>
      {open && (
        <div className="hd-menu">
          {user.role === "seller" ? (
            <Link href="/seller">Seller Panel</Link>
          ) : (
            <>
              <Link href="/account">My Account</Link>
              <Link href="/account/orders">My Orders</Link>
              <Link href="/account/wishlist">Wishlist</Link>
              <Link href="/account/addresses">Addresses</Link>
              <Link href="/account/password">Change Password</Link>
            </>
          )}
          <form action={logout}><button type="submit">Logout</button></form>
        </div>
      )}
    </div>
  );
}
