"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  ord: '<path d="M6 2 3 6v14h18V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  ret: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  pay: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  prod: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  vid: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
  cus: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>',
  sub: '<path d="M4 4h16v16H4zM4 8l8 6 8-6"/>',
  xl: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13l4 5M13 13l-4 5"/>',
  rep: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/>',
  cat: '<path d="M3 7h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 18h7"/>',
  grp: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M17 14v6M14 17h6"/>',
  team: '<circle cx="9" cy="7" r="3"/><path d="M3 21a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  act: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  sec: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  ins: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
  blog: '<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4M8 12h8M8 16h5"/>',
  inv: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8M9 9h3"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
const Icon = ({ k }) => <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />;

// extras = purane menu ke wo links jo is patch ko pehle se pata nahi the (jaise Subscribers CSV)
export default function SideNav({ extras = [], allow = [] }) {
  const path = usePathname();
  const [n, setN] = useState({});

  // badge ke numbers har page badalne par taaza hote hain
  useEffect(() => {
    let off = false;
    fetch("/seller/counts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => { if (!off) setN(d); })
      .catch(() => {});
    return () => { off = true; };
  }, [path]);

  const isPeople = (e) => /subscri|customer/i.test(e.label);
  const ex = (e) => ({ href: e.href, label: e.label, icon: /subscri/i.test(e.label) ? "sub" : "more", plain: true, perm: /subscri/i.test(e.label) ? "reports" : "orders" });
  const groups = [
    ["Overview", [{ href: "/seller", label: "Dashboard", icon: "dash", exact: true, perm: "dashboard" }]],
    ["Sales", [
      { href: "/seller/process", label: "Order process", icon: "ord", badge: n.process, perm: "orders" },
      { href: "/seller/orders", label: "Orders", icon: "ord", perm: "orders" },
      { href: "/seller/returns", label: "Returns & Refunds", icon: "ret", badge: (n.returns || 0) + (n.refunds || 0) + (n.rto || 0), perm: "returns" },
      { href: "/seller/alerts", label: "Back-in-stock requests", icon: "bell", badge: n.alerts, perm: "products" },
      { href: "/seller/invoices", label: "GST invoices", icon: "inv", perm: "invoices" },
      { href: "/seller/payments", label: "Payments", icon: "pay", perm: "payments" },
      { href: "/seller/outbox", label: "Message outbox", icon: "sub", perm: "orders" },
      { href: "/seller/chats", label: "Chatbot log", icon: "chat", perm: "chats" },
    ]],
    ["Logistics", [
      { href: "/seller/tracking", label: "Tracking", icon: "ord", perm: "orders" },
      { href: "/seller/ndr", label: "NDR", icon: "ret", badge: n.ndr, perm: "orders" },
      { href: "/seller/couriers", label: "Courier partners", icon: "prod", perm: "logistics" },
    ]],
    ["Catalogue", [
      { href: "/seller/products", label: "Products", icon: "prod", badge: n.products, soft: true, perm: "products" },
      { href: "/seller/categories", label: "Categories", icon: "cat", perm: "products" },
      { href: "/seller/groups", label: "Listing groups", icon: "grp", perm: "products" },
      { href: "/seller/videos", label: "Style videos", icon: "vid", perm: "products" },
      { href: "/seller/bulk", label: "Bulk upload (Excel)", icon: "xl", perm: "products" },
      { href: "/seller/blog", label: "Blog", icon: "blog", perm: "blog" },
    ]],
    ["People", [{ href: "/seller/customers", label: "Customers", icon: "cus", perm: "customers" }, { href: "/seller/subscribers", label: "Subscribers", icon: "sub", perm: "customers" }, ...extras.filter(isPeople).map(ex)]],
    ["Reports", [{ href: "/seller/insights", label: "Insights", icon: "ins", perm: "insights" }, { href: "/seller/reports", label: "Reports & Excel", icon: "rep", perm: "reports" }]],
    ["Admin", [
      { href: "/seller/team", label: "Team", icon: "team", perm: "team" },
      { href: "/seller/settings", label: "Business & GST", icon: "set", perm: "settings" },
      { href: "/seller/activity", label: "Activity log", icon: "act", perm: "activity" },
      { href: "/seller/security", label: "Security", icon: "sec", perm: "security" },
    ]],
  ].map(([t, items]) => [t, items.filter((i) => allow.includes(i.perm))]).filter(([, items]) => items.length);
  const more = extras.filter((e) => !isPeople(e)).map(ex).filter((i) => allow.includes(i.perm));
  if (more.length) groups.push(["More", more]);

  return (
    <nav className="sp-nav" aria-label="Seller menu">
      {groups.map(([title, items]) => (
        <div key={title}>
          <p className="sp-gl">{title}</p>
          {items.map((it) => {
            const on = it.exact ? path === it.href : !it.plain && path.startsWith(it.href);
            const inner = <><Icon k={it.icon} />{it.label}{it.badge > 0 && <b className={it.soft ? "soft" : ""}>{it.badge}</b>}</>;
            return it.plain
              ? <a key={it.href} href={it.href}>{inner}</a>
              : <Link key={it.href} href={it.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{inner}</Link>;
          })}
        </div>
      ))}
    </nav>
  );
}
