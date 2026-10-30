import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { logout } from "./actions";
import { readCart } from "@/lib/cart";
import { all, inr } from "@/lib/db";
import { SITE } from "@/lib/site";
import { siteUrl } from "@/lib/seo";
import { expireUnpaidOrders } from "@/lib/orders";
import AccountMenu from "@/components/AccountMenu";
import CartProvider from "@/components/CartProvider";
import CartButton from "@/components/CartButton";
import CartDrawer from "@/components/CartDrawer";
import BackToTop from "@/components/BackToTop";
import { IconSearch, IconShop } from "@/components/Icons";

export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: `${SITE.name} – Handbag Store`,
  description: SITE.tagline,
  openGraph: { siteName: SITE.name, type: "website", locale: "en_IN" },
};

const CSS = `
/* ---------- HEADER ---------- */
header.hd a,.hd-item,.hd-menu a,footer.ft a{text-decoration:none}
header.hd{background:var(--bg);border-bottom:1px solid var(--line)}
.hd-bar{max-width:1100px;margin:auto;padding:12px 16px;display:flex;align-items:center;gap:22px}
.hd-logo{margin:0;font:600 21px 'Playfair Display',serif;letter-spacing:2.5px;text-transform:uppercase;white-space:nowrap}
.hd-search{flex:1;position:relative;min-width:0}
.hd-search input{margin:0;padding:11px 48px 11px 20px;border-radius:30px;background:#fff;border:1px solid var(--line);font-size:14px}
.hd-search input:focus{outline:2px solid var(--acc);border-color:var(--acc)}
.hd-search button{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;border:0;background:var(--acc);color:#fff;display:grid;place-items:center;cursor:pointer}
.hd-nav{display:flex;align-items:center;gap:22px;flex-wrap:nowrap}
.hd-item{display:flex;align-items:center;gap:7px;font:500 14px Poppins,sans-serif;white-space:nowrap;position:relative;background:none;border:0;padding:0;color:var(--ink);cursor:pointer}
.hd-item:hover{color:var(--acc)}
.hd-cart em{position:absolute;top:-8px;left:12px;background:var(--acc);color:#fff;font:500 10px Poppins;font-style:normal;min-width:17px;height:17px;border-radius:9px;display:grid;place-items:center;padding:0 4px}
.hd-acc{position:relative}
.hd-menu{position:absolute;right:0;top:calc(100% + 12px);background:#fff;border:1px solid var(--line);border-radius:14px;min-width:176px;padding:6px;box-shadow:0 14px 30px #2a262326;z-index:30}
.hd-menu a,.hd-menu button{display:block;width:100%;text-align:left;padding:9px 12px;border-radius:9px;font:400 13.5px Poppins;color:var(--ink);background:none;border:0;cursor:pointer}
.hd-menu a:hover,.hd-menu button:hover{background:var(--bg);color:var(--acc)}
@media(max-width:780px){
  .hd-bar{flex-wrap:wrap;gap:10px 16px;padding:10px 16px}
  .hd-logo{margin-right:auto;font-size:19px}
  .hd-nav{gap:18px}
  .hd-search{order:3;flex:1 1 100%}
}
@media(max-width:430px){.hd-item span{display:none}.hd-nav{gap:20px}.hd-acc .hd-item span{display:none}}

/* ---------- PROMO STRIP (Vertical Slide with Pause) ---------- */
.promo{background:var(--ink);color:var(--bg);font-size:12.5px;letter-spacing:.3px;height:38px;overflow:hidden;position:relative;display:flex;justify-content:center;align-items:center}
.promo-slider{display:flex;flex-direction:column;animation: slideVertical 9s ease infinite}
.promo-slider:hover{animation-play-state:paused}
.promo-item{height:38px;display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
.promo-item b{color:#f6e3a8;font-weight:500}

@keyframes slideVertical {
  0%, 27% { transform: translateY(0); }
  33%, 60% { transform: translateY(-38px); }
  66%, 93% { transform: translateY(-76px); }
  100% { transform: translateY(0); }
}

@media(max-width:600px){.promo{font-size:11.5px}}
.hd-acc .hd-item span{max-width:120px;overflow:hidden;text-overflow:ellipsis}

/* ---------- FOOTER (compact) ---------- */
footer.ft{background:#241f1c;color:#e8dfd4;border:0;padding:30px 16px 14px;text-align:left;font-size:13px}
.ft-in{max-width:1100px;margin:auto}
.ft-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1.4fr;gap:24px}
.ft-logo{font:600 24px 'Playfair Display',serif;letter-spacing:2px;text-transform:uppercase;color:#fff;margin-bottom:6px}
.ft p{margin:0 0 6px;color:#bfb3a6}
.ft h4{font:500 12px Poppins;letter-spacing:1.5px;text-transform:uppercase;color:#fff;margin:0 0 10px}
.ft a{display:block;margin:0 0 6px;color:#e8dfd4}
.ft a:hover{color:#f6e3a8}
.ft-soc{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.ft-soc a{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid #ffffff44;border-radius:50%;color:#e8dfd4;text-decoration:none;transition:all 0.2s}
.ft-soc a:hover{border-color:#f6e3a8;color:#f6e3a8;background:#ffffff0a}
.ft-soc svg{width:16px;height:16px;fill:currentColor}
.ft-bottom{display:flex;justify-content:space-between;align-items:center;gap:8px 20px;flex-wrap:wrap;margin-top:18px;padding-top:12px;border-top:1px solid #ffffff22}
.ft-pay{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ft-pay span.l{color:#bfb3a6;margin-right:4px;font-size:12px}
.ft-pay span.c{background:#ffffff14;border:1px solid #ffffff2a;border-radius:6px;padding:2px 9px;font-size:11px;letter-spacing:.4px}
.ft-copy{color:#9a8f84;font-size:12px}
@media(max-width:860px){.ft-grid{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.ft-grid{grid-template-columns:1fr 1fr;gap:18px}.ft-grid>div:first-child,.ft-grid>div:last-child{grid-column:1/-1}.ft-bottom{flex-direction:column;align-items:flex-start}}
`;

export default async function RootLayout({ children }) {
  expireUnpaidOrders();
  const user = await getUser();
  const cartCount = (await readCart()).reduce((n, i) => n + i.qty, 0);
  const cats = all("SELECT DISTINCT category FROM products WHERE status = 'Active' ORDER BY category LIMIT 4");

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Poppins:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{CSS}</style>
      </head>
      <body>
        <CartProvider initialCount={cartCount}>
        <div className="promo">
          <div className="promo-slider">
            <div className="promo-item">
              <span>✨ Free shipping above <b>{inr(SITE.freeShippingAbove)}</b></span>
            </div>
            <div className="promo-item">
              <span>📦 Cash on Delivery available across India</span>
            </div>
            <div className="promo-item">
              <span>🔄 Easy {SITE.returnDays}-day hassle-free returns</span>
            </div>
          </div>
        </div>
        <header className="hd">
          <div className="hd-bar">
            <Link href="/" className="hd-logo">{SITE.name}</Link>

            <form action="/products" method="get" className="hd-search" role="search">
              <input name="q" type="search" placeholder="Search for bags, totes, slings..." aria-label="Search products" autoComplete="off" />
              <button type="submit" aria-label="Search"><IconSearch /></button>
            </form>

            <nav className="hd-nav">
              <Link href="/products" className="hd-item"><IconShop /><span>Shop</span></Link>
              <AccountMenu user={user ? { name: user.name, role: user.role } : null} logout={logout} />
              <CartButton />
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="ft">
          <div className="ft-in">
            <div className="ft-grid">
              <div>
                <div className="ft-logo">{SITE.name}</div>
                <p>{SITE.tagline}</p>
                
                {/* Social Media Circular Icon-Only Links */}
                <div className="ft-soc">
                  <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                    <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11 11 0 0 1-4.6-4.1c-.4-.5-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.6l-.4.5c-.2.2-.3.3-.1.6.7 1.1 1.5 1.9 2.7 2.5.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.4 0 .2 0 .8-.3 1.4z"/></svg>
                  </a>
                  
                  <a href="https://instagram.com/inayatebags" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>

                  <a href="https://facebook.com/inayatebags" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.37 14.5 5 15.5 5H18V0h-3.808C10.59 0 9 1.581 9 4.75V8z"/></svg>
                  </a>
                </div>
              </div>

              <div>
                <h4>Shop</h4>
                <Link href="/products">All Products</Link>
                {cats.map((c) => (
                  <Link key={c.category} href={`/products?cat=${encodeURIComponent(c.category)}`}>{c.category}</Link>
                ))}
              </div>

              <div>
                <h4>Help</h4>
                <Link href="/about">About Us</Link>
                <Link href="/contact">Contact Us</Link>
                <Link href="/shipping">Shipping and Returns</Link>
                <Link href="/terms">Terms and Conditions</Link>
                <Link href="/privacy">Privacy Policy</Link>
              </div>

              <div>
                <h4>Contact</h4>
                <p>{SITE.address}</p>
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                <p style={{ marginTop: 4 }}>{SITE.hours}</p>
              </div>
            </div>

            <div className="ft-bottom">
              <div className="ft-pay">
                <span className="l">We accept</span>
                {["UPI", "VISA", "Mastercard", "RuPay", "Netbanking", "COD"].map((m) => (
                  <span key={m} className="c">{m}</span>
                ))}
              </div>
              <div className="ft-copy">© {new Date().getFullYear()} {SITE.name}. All rights reserved.</div>
            </div>
          </div>
        </footer>

        {/* Back to Top Component */}
        <BackToTop />

        {/* WhatsApp Floating Button */}
        <a
          className="wa"
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp par chat karein"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11 11 0 0 1-4.6-4.1c-.4-.5-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.6l-.4.5c-.2.2-.3.3-.1.6.7 1.1 1.5 1.9 2.7 2.5.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.4 0 .2 0 .8-.3 1.4z" /></svg>
        </a>

        <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}