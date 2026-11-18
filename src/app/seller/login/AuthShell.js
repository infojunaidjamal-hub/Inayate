import "../seller.css";
import { SITE } from "@/lib/site";

// Login, OTP aur setup teeno ka same design: left mein brand, right mein form
export default function AuthShell({ title, sub, step, aside, children }) {
  return (
    <div className="st-auth">
      <div className="st-hero">
        <div className="st-brand">{SITE.name}</div>
        <div>
          <h2>{aside?.h || "Apni dukaan ka poora control, ek jagah."}</h2>
          <p>{aside?.p || "Products, orders, payments aur returns. Sirf store ke owner aur unke staff ke liye."}</p>
          {!aside && (
            <ul>
              <li><i>📦</i>Orders pack aur ship karein</li>
              <li><i>💳</i>Payments aur refunds dekhein</li>
              <li><i>👜</i>Products aur photos manage karein</li>
            </ul>
          )}
        </div>
        <small>© {new Date().getFullYear()} {SITE.name} · Store Admin</small>
      </div>
      <div className="st-side">
        <div className="st-box">
          <div className="st-brand st-brand-m">{SITE.name}</div>
          {step && <div className="st-step">{step}</div>}
          <h1>{title}</h1>
          {sub && <p className="st-mut" style={{ margin: "4px 0 6px" }}>{sub}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
