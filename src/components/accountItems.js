// Account menu ki list (header ke dropdown aur account page ke sidebar, dono yahi use karte hain)
export const MENU = [
  { href: "/account", icon: "user", label: "Profile" },
  { href: "/account/orders", icon: "bag", label: "My Orders", count: "orders" },
  { href: "/account/addresses", icon: "pin", label: "Addresses", count: "addr" },
  { href: "/account/wishlist", icon: "heart", label: "Wishlist", count: "wish" },
  { href: "/account/returns", icon: "undo", label: "Returns & Refunds" },
  { href: "/account/password", icon: "lock", label: "Password" },
  { href: "/account/help", icon: "help", label: "Help & Support" },
];

const PATHS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  help: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  out: '<path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
};
export function Icon({ k }) {
  return <svg className="ac-ic" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PATHS[k] }} />;
}

// naam sirf digits ho (test account) to "My Account" dikhao, warna pehla naam
export const shortName = (n) => (/^\d+$/.test(String(n).trim()) ? "My Account" : String(n).trim().split(/\s+/)[0]);
export const initial = (n) => (String(n).trim()[0] || "?").toUpperCase();
