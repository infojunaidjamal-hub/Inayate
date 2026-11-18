import Link from "next/link";
import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import AccountMenu from "./AccountMenu";
import { IconUser } from "./Icons";
import AuthPopup from "./AuthPopup";

// Header mein bas yehi ek line lagani hai: <AccountMenuLoader />
// Login nahi hai to "Login" link, seller hai to "Seller Panel", buyer hai to naya menu.
export default async function AccountMenuLoader() {
  const u = await getUser();
  if (!u) return <AuthPopup />; // login nahi hai: Login button, jo popup kholta hai
  if (u.role !== "buyer") return <Link href="/seller" className="hd-item"><IconUser /><span>Store Admin</span></Link>;
  const c = (t) => one(`SELECT COUNT(*) c FROM ${t} WHERE user_id = ?`, u.id).c;
  return (
    <AccountMenu
      user={{ name: u.name, mobile: u.mobile, avatar: u.avatar || null, shape: u.avatar_shape || "circle" }}
      counts={{ orders: c("orders"), addr: c("addresses"), wish: c("wishlist") }}
    />
  );
}
