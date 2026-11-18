import Link from "next/link";
import "./globals.css";
import { readCart } from "@/lib/cart";
import { inr } from "@/lib/db";
import { SITE } from "@/lib/site";
import { siteUrl } from "@/lib/seo";
import { expireUnpaidOrders } from "@/lib/orders";
import { sweepOrders } from "@/lib/orderFlow";
import AccountMenuLoader from "@/components/AccountMenuLoader";
import CartProvider from "@/components/CartProvider";
import CartButton from "@/components/CartButton";
import CartDrawer from "@/components/CartDrawer";
import BackToTop from "@/components/BackToTop";
import Tracker from "@/components/Tracker";
import { IconSearch, IconShop } from "@/components/Icons";
import SearchBar from "@/components/SearchBar";
import ChatWidget from "@/components/ChatWidget";
import InfoAccordion from "@/components/InfoAccordion";
import FooterAcc from "@/components/FooterAcc";
import { categoryTree } from "@/lib/catalog";
import { POPULAR_SEARCHES, CATEGORY_NOTE } from "@/lib/footerLinks";

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
.hd-nav{display:flex;align-items:center;gap:22px;flex-wrap:nowrap;margin-left:auto}
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

/* ---------- INFO ACCORDION (footer ke just upar) ---------- */
.ia{background:var(--bg)}
.ia-in{max-width:1100px;margin:auto;padding:0 16px}
.ia-btn{width:100%;min-height:56px;display:flex;justify-content:space-between;align-items:center;gap:12px;background:none;border:0;padding:0;cursor:pointer;color:var(--ink);font:500 15px Poppins,sans-serif;text-align:left}
.ia-btn svg{flex:none}
.ia-btn .ia-v{transition:opacity .15s}
.ia-btn[aria-expanded="true"] .ia-v{opacity:0}
.ia-body{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:26px 28px;padding:6px 0 30px}
.ia-body[hidden]{display:none}
.ia-wide{grid-column:span 2}
.ia h5{font:500 12px Poppins;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink);margin:0 0 10px}
.ia ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;font-size:13.5px}
.ia p{margin:0 0 6px;color:#5f564e;font-size:13.5px;line-height:1.6}
.ia a{display:block;color:var(--ink);text-decoration:none}
.ia a:hover{color:var(--acc);text-decoration:underline}
.ia-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.ia-cats>div>a{font-weight:600;font-size:14px;margin-bottom:6px}
.ia-cats ul{gap:5px}
@media(max-width:860px){.ia-body{grid-template-columns:1fr 1fr}.ia-cats{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.ia-body{display:flex;flex-direction:column;gap:22px}.ia-body[hidden]{display:none}.ia-btn{font-size:14px;min-height:52px}}

/* ---------- FOOTER ---------- */
footer.ft{--f-bg:linear-gradient(180deg,#f5e8dd,#ecd6c9);--f-text:#3a322d;--f-head:#2a2623;--f-mut:#6f645c;--f-dim:#8a7f76;--f-line:#2a262322;--f-line2:#2a262344;--f-hover:#a06f45;--f-soft:#ffffff80;--f-badge:#2a26231f;background:var(--f-bg);color:var(--f-text);border:0;padding:34px 16px 16px;text-align:left;font-size:13px}
.ft-in{max-width:1100px;margin:auto;display:flex;flex-direction:column;gap:16px}
.ft-top{display:grid;grid-template-columns:1fr 2fr;gap:44px;align-items:start}
.ft-cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:start}
.ft-logo{font:600 24px 'Playfair Display',serif;letter-spacing:2px;text-transform:uppercase;color:var(--f-head);margin-bottom:6px}
.ft p{margin:0 0 6px;color:var(--f-mut)}
.ft a{display:block;margin:0 0 6px;color:var(--f-text)}
.ft a:hover{color:var(--f-hover)}
.ft-soc{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.ft-soc a{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;margin:0;border:1px solid var(--f-line2);border-radius:50%;color:var(--f-text);text-decoration:none;transition:all 0.2s}
.ft-soc a:hover{border-color:var(--f-hover);color:var(--f-hover);background:var(--f-soft)}
.ft-soc svg{width:16px;height:16px;fill:currentColor}
.fa-btn{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;background:none;border:0;padding:0;color:var(--f-head);font:500 12px Poppins,sans-serif;letter-spacing:1.5px;text-transform:uppercase;text-align:left;cursor:default}
.fa-btn svg{display:none;width:18px;height:18px;flex:none;color:var(--acc);transition:transform .2s}
.fa-body{display:block;margin-top:10px;padding-top:12px;border-top:1px solid var(--f-line)}
.fa-kw{border-top:1px solid var(--f-line)}
.fa-kw .fa-btn{min-height:35px;cursor:pointer}
.fa-kw .fa-btn svg{display:block}
.fa-kw .fa-body{display:none;margin:0;border:0;padding:0 0 12px}
.fa-kw.open .fa-body{display:block}
.fa-kw.open .fa-btn svg{transform:rotate(180deg)}
.ft-pills{display:flex;flex-wrap:wrap;gap:6px}
.ft .ft-pills a{display:inline-block;margin:0;border:1px solid var(--f-line2);background:var(--f-soft);border-radius:14px;padding:4px 11px;font-size:12px;line-height:1.4}
.ft-bottom{display:flex;justify-content:center;align-items:center;gap:10px 26px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--f-line);text-align:center}
.ft-pay{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center}
.ft-pay svg{display:block;border-radius:6px;box-shadow:0 0 0 1px var(--f-badge)}
.ft-copy{color:var(--f-dim);font-size:12px}
@media(max-width:860px){
  .ft-top{grid-template-columns:1fr;gap:18px}
  .ft-cols{grid-template-columns:1fr;gap:0}
  .fa{border-bottom:1px solid var(--f-line)}
  .fa-btn{min-height:48px;cursor:pointer}
  .fa-btn svg{display:block}
  .fa-body{display:none;border:0;margin:0;padding:0 0 12px}
  .fa.open .fa-body{display:block}
  .fa.open .fa-btn svg{transform:rotate(180deg)}
  .fa-body a{padding:7px 0;margin:0}
  .fa-kw{display:block;border-top:0;padding-top:0}
  .fa-kw .fa-btn{width:100%;padding-top:0}
  .fa-kw .fa-body{flex:none}
  .fa-kw .fa-body .ft-pills a{padding:5px 12px}
}
@media(max-width:520px){.ft-bottom{flex-direction:column;gap:10px}footer.ft{padding-bottom:20px}.ft-pay svg{width:clamp(30px,8.6vw,38px);height:auto}.ft-copy{max-width:230px;margin:0 auto;line-height:1.5}}
`;

// ---------- Payment logos (footer) ----------
const W = 60;
const H = 36;

function Badge({ label, children }) {
  return (
    <svg width="40" height="24" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <title>{label}</title>
      <rect width={W} height={H} rx="6" fill="#ffffff" />
      {children}
    </svg>
  );
}

function PayBadges() {
  return (
    <>
      <Badge label="UPI">
        <text x="6" y="23" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="900" fontStyle="italic" fill="#444">UPI</text>
        <path d="M38 9l8 9-8 9h-3.5l8-9-8-9z" fill="#097939" />
        <path d="M44 9l8 9-8 9h-3.5l8-9-8-9z" fill="#ed752e" />
      </Badge>

      <Badge label="Visa">
        <text x="30" y="24" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="17" fontWeight="900" fontStyle="italic" fill="#1a1f71" letterSpacing="-0.5">VISA</text>
      </Badge>

      <Badge label="Mastercard">
        <circle cx="23" cy="18" r="9.5" fill="#eb001b" />
        <circle cx="37" cy="18" r="9.5" fill="#f79e1b" />
        <path d="M30 11.58A9.5 9.5 0 0 1 30 24.42A9.5 9.5 0 0 1 30 11.58z" fill="#ff5f00" />
      </Badge>

      <Badge label="RuPay">
        <text x="6" y="22.5" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="700" fontStyle="italic">
          <tspan fill="#1b3d8f">Ru</tspan><tspan fill="#e8751a">Pay</tspan>
        </text>
        <path d="M50 12l5 6-5 6z" fill="#2a9d4a" />
      </Badge>

      <Badge label="Net Banking">
        <path d="M6 15l9-6 9 6v2H6z" fill="#2d4f7c" />
        <rect x="8" y="18.5" width="2.6" height="7" fill="#2d4f7c" />
        <rect x="13.7" y="18.5" width="2.6" height="7" fill="#2d4f7c" />
        <rect x="19.4" y="18.5" width="2.6" height="7" fill="#2d4f7c" />
        <rect x="6" y="26.5" width="18" height="2" fill="#2d4f7c" />
        <text x="28" y="17" fontFamily="Arial, Helvetica, sans-serif" fontSize="7.5" fontWeight="700" fill="#2d4f7c">Net</text>
        <text x="28" y="26" fontFamily="Arial, Helvetica, sans-serif" fontSize="7.5" fontWeight="700" fill="#2d4f7c">Banking</text>
      </Badge>

      <Badge label="Cash on Delivery">
        <rect x="6" y="11" width="21" height="14" rx="2" fill="#2e8b57" />
        <circle cx="16.5" cy="18" r="3.6" fill="#ffffff" />
        <text x="31" y="23" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="900" fill="#2e8b57">COD</text>
      </Badge>
    </>
  );
}

export default async function RootLayout({ children }) {
  expireUnpaidOrders();
  sweepOrders();
  const cartCount = (await readCart()).reduce((n, i) => n + i.qty, 0);
  // Footer aur info accordion ke liye: seller ki visible categories (sirf jinme product hain)
  const tree = categoryTree({ onlyVisible: true })
    .filter((c) => c.count > 0)
    .map((c) => ({ ...c, subs: c.subs.filter((x) => x.count > 0) }));
  const markets = [["Amazon", SITE.marketplaces?.amazon], ["Flipkart", SITE.marketplaces?.flipkart], ["Meesho", SITE.marketplaces?.meesho], ["Myntra", SITE.marketplaces?.myntra]].filter((m) => m[1]);
  const shipLine = SITE.freeShippingAbove > 0 ? <>Free shipping above {inr(SITE.freeShippingAbove)}</> : <>Free shipping on every order</>;

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
              <span>✨ {SITE.freeShippingAbove > 0 ? <>Free shipping above <b>{inr(SITE.freeShippingAbove)}</b></> : <b>Free shipping on every order</b>}</span>
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

            <SearchBar />

            <nav className="hd-nav">
              <Link href="/products" className="hd-item"><IconShop /><span>Shop</span></Link>
              <AccountMenuLoader />
              <CartButton />
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <InfoAccordion title={`${SITE.name}: your go-to place for handbags online`}>
          <div className="ia-wide">
            <h5>Categories and sub-categories</h5>
            <div className="ia-cats">
              {tree.map((c) => (
                <div key={c.id}>
                  <Link href={`/products?cat=${encodeURIComponent(c.name)}`}>{c.name}</Link>
                  <ul>
                    {c.subs.map((x) => (
                      <li key={x.id}><Link href={`/products?cat=${encodeURIComponent(c.name)}&sub=${encodeURIComponent(x.name)}`}>{x.name}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="ia-wide">
            <h5>Our categories, explained</h5>
            <p>{CATEGORY_NOTE}</p>
          </div>
          <div>
            <h5>Help and support</h5>
            <ul>
              <li><Link href="/account/orders">Track your order</Link></li>
              <li><Link href="/account/returns">Returns and refunds</Link></li>
              <li><Link href="/shipping">Shipping and Returns</Link></li>
              <li><Link href="/contact">Contact us</Link></li>
              <li><Link href="/account/help">Help centre</Link></li>
            </ul>
          </div>
          <div>
            <h5>Contact</h5>
            <p>{SITE.address}</p>
            <ul>
              <li><a href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a></li>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
            </ul>
            <p style={{ marginTop: 6 }}>{SITE.hours}</p>
          </div>
          <div>
            <h5>About</h5>
            <ul>
              <li><Link href="/about">About us</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/contact">Get in touch</Link></li>
            </ul>
          </div>
          <div>
            <h5>Terms and policies</h5>
            <ul>
              <li><Link href="/terms">Terms and Conditions</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/shipping">Shipping and Returns Policy</Link></li>
            </ul>
          </div>
          <div>
            <h5>Shipping and delivery</h5>
            <ul>
              <li>{shipLine}</li>
              <li>Dispatch in {SITE.dispatchDays}</li>
              <li>Delivery in {SITE.deliveryDays}</li>
              <li>Cash on Delivery available</li>
              <li>Easy {SITE.returnDays}-day returns</li>
            </ul>
          </div>
          <div>
            <h5>Your account</h5>
            <ul>
              <li><Link href="/account">My account</Link></li>
              <li><Link href="/account/orders">My orders</Link></li>
              <li><Link href="/account/wishlist">Wishlist</Link></li>
              <li><Link href="/cart">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h5>Payments</h5>
            <ul>
              <li>UPI, cards and Net Banking</li>
              <li>Cash on Delivery</li>
              <li>Refunds go back to the original payment method</li>
            </ul>
          </div>
          {markets.length > 0 && (
            <div>
              <h5>Also available on</h5>
              <ul>
                {markets.map(([n, u]) => (
                  <li key={n}><a href={u} target="_blank" rel="noopener noreferrer">{n}</a></li>
                ))}
              </ul>
            </div>
          )}
        </InfoAccordion>

        <footer className="ft">
          <div className="ft-in">
            <div className="ft-top">
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

              <div className="ft-cols">
                <FooterAcc title="Shop">
                  <Link href="/products">All Products</Link>
                  {tree.map((c) => (
                    <Link key={c.id} href={`/products?cat=${encodeURIComponent(c.name)}`}>{c.name}</Link>
                  ))}
                </FooterAcc>
                <FooterAcc title="Help">
                  <Link href="/account/orders">Track your order</Link>
                  <Link href="/shipping">Shipping and Returns</Link>
                  <Link href="/contact">Contact Us</Link>
                </FooterAcc>
                <FooterAcc title="Company">
                  <Link href="/about">About Us</Link>
                  <Link href="/blog">Blog</Link>
                </FooterAcc>
                <FooterAcc title="Policies">
                  <Link href="/terms">Terms and Conditions</Link>
                  <Link href="/privacy">Privacy Policy</Link>
                  <Link href="/shipping">Shipping Policy</Link>
                </FooterAcc>
              </div>
            </div>

            <FooterAcc title="Popular searches" className="fa-kw">
              <div className="ft-pills">
                {POPULAR_SEARCHES.map((k) => (
                  <Link key={k} href={`/products?q=${encodeURIComponent(k)}`}>{k}</Link>
                ))}
              </div>
            </FooterAcc>

            <div className="ft-bottom">
              <div className="ft-pay" aria-label="Accepted payment methods">
                <PayBadges />
              </div>
              <div className="ft-copy">© {new Date().getFullYear()} {SITE.name}. All rights reserved.</div>
            </div>
          </div>
        </footer>

        {/* Back to Top Component */}
        <BackToTop />
        <Tracker />

        {/* WhatsApp Floating Button */}
        <a
          className="wa"
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp par chat karein"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11 11 0 0 1-4.6-4.1c-.4-.5-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.6l-.4.5c-.2.2-.3.3-.1.6.7 1.1 1.5 1.9 2.7 2.5.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.4 0 .2 0 .8-.3 1.4z" /></svg>
        </a>

        {SITE.chatbot?.enabled !== false && <ChatWidget name={SITE.chatbot?.name || "Assistant"} brand={SITE.name} wa={SITE.whatsapp} />}

        <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}