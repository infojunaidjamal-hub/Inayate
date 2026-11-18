import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions";
import { STAFF, ROLE_LABEL, PERMS, can } from "@/lib/perms";
import { dailyBackup } from "@/lib/catalog";
import SideNav from "./SideNav";
import "./seller.css";

export const metadata = { robots: { index: false, follow: false }, title: "Store Admin" };

// Purane menu ke extra links (patch chalate waqt apne aap bhare jate hain)
const EXTRAS = JSON.parse('[]');

// Seller area ka apna alag design hai. Buyer wala header/footer yahan chhupa rehta hai.
// Staff (Owner / Manager / Operator) nahi hai to sirf page dikhta hai (login, OTP, setup pages apna poora design khud laate hain).
export default async function SellerLayout({ children }) {
  const user = await getUser();
  const staff = !!user && STAFF.includes(user.role);
  if (staff) dailyBackup(); // roz ek baar database ka backup (data/backups)
  const hide = <style>{"body > .promo, body > header, body > footer, body > .wa { display: none; }"}</style>;

  if (!staff) return <>{hide}{children}</>;

  const allow = Object.keys(PERMS).filter((p) => can(user.role, p)); // menu mein sirf wahi jo is role ko milta hai
  return (
    <>
      {hide}
      <div className="sp">
        <aside className="sp-side">
          <div className="sp-who">
            <div className="sp-av">{(user.name || "S").trim().charAt(0).toUpperCase()}</div>
            <b>{user.name}</b>
            <small>Store Admin · {ROLE_LABEL[user.role]}</small>
          </div>
          <SideNav extras={EXTRAS} allow={allow} />
          <div className="sp-foot">
            <Link href="/">View Shop ↗</Link>
            <form action={logout}><button className="sp-out">Logout</button></form>
          </div>
        </aside>
        <div className="sp-main">{children}</div>
      </div>
    </>
  );
}
