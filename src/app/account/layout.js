import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function AccountLayout({ children }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  if (user.role === "seller") redirect("/seller");
  return (
    <>
      <div className="tabs">
        <Link href="/account">Overview</Link>
        <Link href="/account/orders">My Orders</Link>
        <Link href="/account/addresses">Addresses</Link>
        <Link href="/account/wishlist">Wishlist</Link>
        <Link href="/account/password">Password</Link>
      </div>
      {children}
    </>
  );
}
