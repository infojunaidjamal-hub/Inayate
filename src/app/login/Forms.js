"use client";
import { useState, useActionState } from "react";
import Link from "next/link";
import { buyerLogin, buyerRegister } from "./actions";
import { SITE } from "@/lib/site";
import BagArt from "@/components/BagArt";
import { waLink } from "@/lib/whatsapp";

const MOBILE_OK = /^[6-9]\d{9}$/;
const onlyDigits = (v) => String(v).replace(/\D/g, "").slice(0, 10);

const CSS = `
.au{display:grid;grid-template-columns:.9fr 1.1fr;max-width:960px;margin:8px auto 0;background:var(--card);border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:0 18px 50px #2a26230f}
.au-side{background:linear-gradient(155deg,var(--rose),#f3e3d3);padding:38px 32px;display:flex;flex-direction:column}
.au-eyebrow{letter-spacing:2.5px;font-size:11px;font-weight:500;text-transform:uppercase;color:var(--acc);margin:0 0 10px}
.au-side h2{font-size:clamp(24px,3vw,30px);line-height:1.2;margin:0 0 6px}
.au-art{display:grid;place-items:center;margin:14px 0 18px;flex:1}
.au-art svg{width:min(190px,62%);filter:drop-shadow(0 16px 20px #2a262326)}
.au-side ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.au-side li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;background:#ffffff99;border-radius:12px;padding:9px 12px}
.au-side li b{flex:none;width:20px;height:20px;border-radius:50%;background:var(--acc);color:#fff;display:grid;place-items:center;font-size:11px;margin-top:1px}

.au-main{padding:30px 34px 26px}
.au-tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--bg);border:1px solid var(--line);border-radius:30px;padding:4px;margin-bottom:22px}
.au-tabs button{border:0;background:none;border-radius:26px;padding:11px 10px;font:500 14px Poppins,sans-serif;color:var(--mut);cursor:pointer;transition:all .2s}
.au-tabs button.on{background:var(--ink);color:#fff;box-shadow:0 4px 12px #2a262330}
.au-main h3{font:500 22px 'Playfair Display',serif;margin:0 0 2px}
.au-sub{color:var(--mut);margin:0 0 18px;font-size:13px}

.au-f{margin-bottom:14px}
.au-f label{font-size:13px;color:var(--ink);font-weight:500;margin-bottom:5px}
.au-f small{display:block;margin-top:4px;font-size:12px;color:var(--mut)}
.au-f small.e{color:#b8463c}
.au-f input{margin:0;padding:13px 14px;font-size:15px;border-radius:12px;min-height:48px}
.au-f input:focus{outline:2px solid var(--acc);border-color:var(--acc)}
.au-f.bad input{border-color:#b8463c}
.au-phone{display:flex;align-items:stretch;position:relative}
.au-phone span{display:grid;place-items:center;padding:0 13px;border:1px solid var(--line);border-right:0;border-radius:12px 0 0 12px;background:var(--bg);font-weight:500;font-size:14.5px}
.au-phone input{border-radius:0 12px 12px 0;padding-right:38px}
.au-ok{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#1f8a4c;font-style:normal;font-weight:700}
.au-pw{position:relative}
.au-pw input{padding-right:48px}
.au-pw button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;background:none;border-radius:50%;cursor:pointer;color:var(--mut);display:grid;place-items:center}
.au-pw button:hover{background:var(--bg);color:var(--ink)}
.au-rules{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:3px;font-size:12px;color:var(--mut)}
.au-rules li.ok{color:#1f8a4c}
.au-rules li:before{content:"○ ";}
.au-rules li.ok:before{content:"✓ ";font-weight:700}
.au-bar{display:flex;gap:4px;margin-top:8px;align-items:center;font-size:11.5px;color:var(--mut)}
.au-bar i{flex:none;width:38px;height:5px;border-radius:3px;background:var(--line)}
.au-bar i.on1{background:#d9534f}.au-bar i.on2{background:#e0a030}.au-bar i.on3{background:#1f8a4c}
.au-bar em{font-style:normal;margin-left:6px}

.au-alert{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;background:#fbeceb;border:1px solid #efc9c5;color:#8f3128;border-radius:12px;padding:10px 12px;font-size:13px;margin-bottom:14px}
.au-alert button{border:0;background:none;color:#8f3128;text-decoration:underline;font:inherit;font-weight:500;cursor:pointer;padding:0}
.au-submit{width:100%;min-height:50px;border:0;border-radius:30px;font:500 15px Poppins,sans-serif;color:#fff;cursor:pointer;background:var(--ink);transition:opacity .2s}
.au-submit.a{background:var(--acc)}
.au-submit:disabled{opacity:.65;cursor:default}
.au-forgot{display:flex;justify-content:space-between;align-items:center;margin:-4px 0 14px;font-size:12.5px}
.au-forgot a{color:var(--acc);font-weight:500}
.au-legal{font-size:11.5px;color:var(--mut);text-align:center;margin:12px 0 0}
.au-legal a{text-decoration:underline}
.au-switch{text-align:center;font-size:13px;color:var(--mut);margin:16px 0 0}
.au-switch button{border:0;background:none;color:var(--acc);font:500 13px Poppins;cursor:pointer;padding:0;text-decoration:underline}

@media(max-width:820px){
  .au{grid-template-columns:1fr;border-radius:20px}
  .au-side{padding:16px 20px;flex-direction:row;align-items:center;gap:14px;flex-wrap:wrap}
  .au-side ul,.au-eyebrow{display:none}
  .au-art{margin:0;flex:none}
  .au-art svg{width:54px}
  .au-side h2{font-size:18px;margin:0;flex:1;min-width:180px}
  .au-main{padding:22px 18px 22px}
}
`;

function EyeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

function MobileField({ id, value, onChange, error }) {
  const ok = MOBILE_OK.test(value);
  const hint = error ? error : value.length === 0 ? "10 digit ka number likhein (+91 ki zaroorat nahi)" : ok ? "Number sahi hai" : `${value.length}/10 digit`;
  return (
    <div className={`au-f${error ? " bad" : ""}`}>
      <label htmlFor={id}>Mobile number</label>
      <div className="au-phone">
        <span>+91</span>
        <input
          id={id}
          name="mobile"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={value}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
        />
        {ok && <i className="au-ok" aria-hidden="true">✓</i>}
      </div>
      <small className={error ? "e" : ""}>{hint}</small>
    </div>
  );
}

function PasswordField({ id, value, onChange, autoComplete, label, error, children }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`au-f${error ? " bad" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="au-pw">
        <input id={id} name="password" type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Password chhupayein" : "Password dikhayein"}>
          <EyeIcon off={show} />
        </button>
      </div>
      {error && <small className="e">{error}</small>}
      {children}
    </div>
  );
}

function LoginForm({ next, mobile, setMobile }) {
  const [state, action, busy] = useActionState(buyerLogin, null);
  const [pw, setPw] = useState("");
  const [tried, setTried] = useState(false);
  const mErr = tried && !MOBILE_OK.test(mobile) ? "10 digit ka sahi mobile number likhein" : "";
  const pErr = tried && !pw ? "Password likhein" : "";
  const wa = waLink(`Mera password reset karna hai. Mobile: ${mobile}`);

  return (
    <form action={action} noValidate onSubmit={(e) => { setTried(true); if (!MOBILE_OK.test(mobile) || !pw) e.preventDefault(); }}>
      <h3>Wapas aaye, swagat hai</h3>
      <p className="au-sub">Apna mobile number aur password daalein.</p>
      <input type="hidden" name="next" value={next} />
      {state?.error && <div className="au-alert" role="alert"><span aria-hidden="true">⚠</span><span>{state.error}</span></div>}
      <MobileField id="lm" value={mobile} onChange={setMobile} error={mErr} />
      <PasswordField id="lp" label="Password" value={pw} onChange={setPw} autoComplete="current-password" error={pErr} />
      <div className="au-forgot">
        <span />
        <a href={wa} target="_blank" rel="noopener noreferrer">Password bhool gaye?</a>
      </div>
      <button className="au-submit" disabled={busy}>{busy ? "Ruko..." : "Login karein"}</button>
    </form>
  );
}

function SignupForm({ next, mobile, setMobile, goLogin }) {
  const [state, action, busy] = useActionState(buyerRegister, null);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [tried, setTried] = useState(false);

  const rules = [
    { ok: pw.length >= 8, t: "Kam se kam 8 akshar" },
    { ok: pw.length > 0 && pw !== mobile && !/^(.)\1+$/.test(pw), t: "Aasaan nahi (jaise 11111111 ya apna mobile number)" },
  ];
  const score = pw.length >= 8 ? 1 + (pw.length >= 12 ? 1 : 0) + (/[a-zA-Z]/.test(pw) && /\d/.test(pw) ? 1 : 0) : pw.length ? 1 : 0;
  const label = ["", "Kamzor", "Theek hai", "Mazboot"][Math.min(score, 3)];

  const nErr = tried && name.trim().length < 2 ? "Apna naam likhein" : "";
  const mErr = tried && !MOBILE_OK.test(mobile) ? "10 digit ka sahi mobile number likhein" : "";
  const pErr = tried && !rules.every((r) => r.ok) ? "Neeche ki sharten poori karein" : "";
  const exists = state?.error && /login karein/i.test(state.error);

  return (
    <form action={action} noValidate onSubmit={(e) => { setTried(true); if (name.trim().length < 2 || !MOBILE_OK.test(mobile) || !rules.every((r) => r.ok)) e.preventDefault(); }}>
      <h3>Naya account banayein</h3>
      <p className="au-sub">Sirf 3 cheezein chahiye: naam, mobile aur password.</p>
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <div className="au-alert" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{state.error}</span>
          {exists && <button type="button" onClick={goLogin}>Login par jaayein</button>}
        </div>
      )}
      <div className={`au-f${nErr ? " bad" : ""}`}>
        <label htmlFor="rn">Aapka naam</label>
        <input id="rn" name="name" autoComplete="name" placeholder="Jaise: Priya Sharma" value={name} onChange={(e) => setName(e.target.value)} />
        {nErr && <small className="e">{nErr}</small>}
      </div>
      <MobileField id="rm" value={mobile} onChange={setMobile} error={mErr} />
      <PasswordField id="rp" label="Password banayein" value={pw} onChange={setPw} autoComplete="new-password" error={pErr}>
        <div className="au-bar" aria-hidden="true">
          {[1, 2, 3].map((n) => <i key={n} className={score >= n ? `on${score}` : ""} />)}
          {label && <em>{label}</em>}
        </div>
        <ul className="au-rules">
          {rules.map((r) => <li key={r.t} className={r.ok ? "ok" : ""}>{r.t}</li>)}
        </ul>
      </PasswordField>
      <button className="au-submit a" disabled={busy}>{busy ? "Ruko..." : "Account banayein"}</button>
      <p className="au-legal">Account banakar aap <Link href="/terms">Terms and Conditions</Link> aur <Link href="/privacy">Privacy Policy</Link> se sahmat hote hain.</p>
    </form>
  );
}

export default function Forms({ next = "", initialTab = "login" }) {
  const [tab, setTab] = useState(initialTab);
  const [mobile, setMobile] = useState("");

  return (
    <div className="au">
      <style>{CSS}</style>

      <aside className="au-side">
        <p className="au-eyebrow">{SITE.name}</p>
        <h2>Apna account, aapki khareedari aasaan</h2>
        <div className="au-art"><BagArt main="#b8865b" dark="#8a5d3a" /></div>
        <ul>
          <li><b>✓</b><span>Order ka status aur tracking ek jagah</span></li>
          <li><b>✓</b><span>Address ek baar save, checkout tez</span></li>
          <li><b>✓</b><span>Wishlist aur purane orders hamesha saath</span></li>
        </ul>
      </aside>

      <section className="au-main">
        <div className="au-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "login"} className={tab === "login" ? "on" : ""} onClick={() => setTab("login")}>Login</button>
          <button type="button" role="tab" aria-selected={tab === "signup"} className={tab === "signup" ? "on" : ""} onClick={() => setTab("signup")}>Naya account</button>
        </div>

        {tab === "login" ? (
          <LoginForm next={next} mobile={mobile} setMobile={setMobile} />
        ) : (
          <SignupForm next={next} mobile={mobile} setMobile={setMobile} goLogin={() => setTab("login")} />
        )}

        <p className="au-switch">
          {tab === "login" ? (
            <>Pehli baar aaye hain? <button type="button" onClick={() => setTab("signup")}>Naya account banayein</button></>
          ) : (
            <>Pehle se account hai? <button type="button" onClick={() => setTab("login")}>Login karein</button></>
          )}
        </p>
      </section>
    </div>
  );
}
