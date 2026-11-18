"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU, Icon, initial } from "./accountItems";
import { logout } from "@/app/actions";
import "./account.css";

export default function AccountSidebar({ user, counts }) {
  const path = usePathname();
  const [ask, setAsk] = useState(false);
  return (
    <aside className="ac-side">
      <div className="ac-pc">
        <div className={`ac-av${user.shape === "square" ? " sq" : ""}`}>{user.avatar ? <img src={user.avatar} alt="" /> : initial(user.name)}</div>
        <div>
          <b style={{ fontSize: 16 }}>{user.name}</b>
          <div style={{ fontSize: 12, color: "var(--mut)" }}>📞 {user.mobile}{user.since ? <><br />Member since {user.since}</> : null}</div>
        </div>
      </div>
      <nav className="ac-nav">
        {MENU.map((m) => {
          const on = m.href === "/account" ? path === "/account" : path.startsWith(m.href);
          return (
            <Link key={m.href} href={m.href} className={"ac-mi" + (on ? " on" : "")} aria-current={on ? "page" : undefined}>
              <Icon k={m.icon} /><span>{m.label}</span>
              {m.count && counts[m.count] > 0 ? <span className="ac-badge">{counts[m.count]}</span> : null}
            </Link>
          );
        })}
        <div className="ac-sep" />
        <button className="ac-mi ac-out" onClick={() => setAsk(true)}><Icon k="out" /><span>Logout</span></button>
      </nav>
      {ask && (
        <div className="ac-m" onClick={() => setAsk(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px" }}>Logout karna hai?</h3>
            <p style={{ color: "var(--mut)" }}>Aap dobara login karke apna account dekh sakte hain.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn o" onClick={() => setAsk(false)}>Nahi</button>
              <form action={logout}><button className="btn a">Haan, logout</button></form>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
