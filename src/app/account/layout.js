import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import AccountSidebar from "@/components/AccountSidebar";
import "@/components/account.css";

export default async function AccountLayout({ children }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  if (user.role !== "buyer") redirect("/seller");
  const c = (t) => one(`SELECT COUNT(*) c FROM ${t} WHERE user_id = ?`, user.id).c;
  const since = fmtDate(one("SELECT created_at FROM users WHERE id = ?", user.id)?.created_at);
  return (
    <div className="ac">
      <AccountSidebar
        user={{ name: user.name, mobile: user.mobile, avatar: user.avatar || null, shape: user.avatar_shape || "circle", since }}
        counts={{ orders: c("orders"), addr: c("addresses"), wish: c("wishlist") }}
      />
      <div className="ac-main">{children}</div>
    </div>
  );
}
