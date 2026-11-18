"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU, Icon, shortName, initial } from "./accountItems";
import { logout } from "@/app/actions";
import "./account.css";

// Header mein naam par click karne par khulne wala menu
export default function AccountMenu({ user, counts }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const click = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div className="acm" ref={box}>
      <button className="acm-b" onClick={() => setOpen(!open)} aria-haspopup="true" aria-expanded={open}>
        <span className={`ac-av${user.shape === "square" ? " sq" : ""}`}>{user.avatar ? <img src={user.avatar} alt="" /> : initial(user.name)}</span>
        <span className="acm-nm">{shortName(user.name)}</span><span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="acm-dd" role="menu">
          <div className="acm-top">
            <span className={`ac-av${user.shape === "square" ? " sq" : ""}`}>{user.avatar ? <img src={user.avatar} alt="" /> : initial(user.name)}</span>
            <div style={{ minWidth: 0 }}><b>{user.name}</b><div style={{ fontSize: 12, color: "var(--mut)" }}>{user.mobile}</div></div>
          </div>
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="acm-mi" role="menuitem">
              <Icon k={m.icon} /><span>{m.label}</span>
              {m.count && counts[m.count] > 0 ? <span className="ac-badge">{counts[m.count]}</span> : null}
            </Link>
          ))}
          <div className="ac-sep" />
          <form action={logout} onSubmit={(e) => { if (!window.confirm("Logout karna hai?")) e.preventDefault(); }}>
            <button className="acm-mi ac-out"><Icon k="out" /><span>Logout</span></button>
          </form>
        </div>
      )}
    </div>
  );
}
