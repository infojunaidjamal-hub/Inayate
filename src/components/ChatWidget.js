"use client";
// Phase 9: buyer chatbot. Neeche daayein kone mein chat button (WhatsApp button ke upar). Seller panel mein nahi dikhta.
// Bhasha: buyer jis bhasha mein likhe usi mein jawab (English / Hinglish / हिन्दी / ગુજરાતી). Upar ke chhote menu se bhasha pakki bhi kar sakte hain.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { inr } from "@/lib/money";
import { LANGS, LANG_LABEL, t, chipsFor } from "@/lib/chatStrings";
import "./chat.css";

let uid = 0;
const EN = { inStock: "In stock", outStock: "Out of stock", onlyLeft: "Only {n} left", from: "From {p}" };
const EN_O = { order: "Order", view: "View full order", courier: "Courier", awb: "Tracking ID", eta: "Estimated delivery" };

function Blocks({ blocks, onNav }) {
  return blocks.map((b, i) => {
    if (b.type === "text") return <p key={i}>{b.text}</p>;
    if (b.type === "products") {
      const lb = b.labels || EN;
      return b.items.map((p) => (
        <Link key={p.id} href={p.href} className="cbw-card" onClick={onNav}>
          {p.image ? <img src={p.image} alt="" /> : <span className="cbw-ph" />}
          <span className="cbw-mid">
            <b>{p.name}</b>
            <small>{p.from ? lb.from.replace("{p}", inr(p.price)) : inr(p.price)}{p.mrp > p.price && <s> {inr(p.mrp)}</s>}</small>
          </span>
          <span className={"cbw-tag" + (p.stock === 0 || p.low ? " y" : "")}>{p.stock === 0 ? lb.outStock : p.low ? lb.onlyLeft.replace("{n}", p.stock) : lb.inStock}</span>
        </Link>
      ));
    }
    if (b.type === "orders") {
      const lb = b.labels || EN_O;
      return b.items.map((o) => (
        <div key={o.no} className="cbw-card cbw-order">
          <div className="cbw-top"><b>{lb.order} {o.no}</b><span className={"cbw-tag" + (o.good ? "" : o.bad ? " x" : " y")}>{o.status}</span></div>
          {o.heading && <p className="cbw-head">{o.heading}</p>}
          {o.steps && <div className="cbw-steps">{Array.from({ length: o.steps.total }, (_, k) => <i key={k} className={k < o.steps.done ? "d" : ""} />)}</div>}
          <small>{o.items}</small>
          <small>{inr(o.total)} · {o.pay}</small>
          {o.courier && <small>{lb.courier}: {o.courier}{o.awb ? ` · ${lb.awb}: ${o.awb}` : ""}</small>}
          {o.eta && <small>{lb.eta}: {o.eta}</small>}
          {o.note && <small>{o.note}</small>}
          {o.ret && <small>{o.ret}</small>}
          <Link href={o.href} className="cbw-btn o" onClick={onNav}>{lb.view}</Link>
        </div>
      ));
    }
    if (b.type === "links") {
      return (
        <div key={i} className="cbw-links">
          {b.items.map((l) =>
            l.kind === "wa" || /^https?:/.test(l.href) ? <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={"cbw-btn " + (l.kind === "wa" ? "wa" : "o")}>{l.label}</a>
              : <Link key={l.label} href={l.href} className={"cbw-btn " + (l.kind === "primary" ? "a" : "o")} onClick={onNav}>{l.label}</Link>
          )}
        </div>
      );
    }
    return null;
  });
}

// Browser ki bhasha Hindi / Gujarati ho to chat usi mein shuru
const browserLang = () => {
  const n = (typeof navigator !== "undefined" ? navigator.language || "" : "").slice(0, 2).toLowerCase();
  return n === "hi" ? "hi" : n === "gu" ? "gu" : "en";
};

export default function ChatWidget({ name = "Assistant", brand = "", wa = "" }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [pref, setPref] = useState("auto"); // buyer ka chuna hua bhasha ya "auto"
  const [last, setLast] = useState("en"); // pichhle jawab ki bhasha
  const [chips, setChips] = useState(chipsFor("en", false));
  const [busy, setBusy] = useState(false);
  const [val, setVal] = useState("");
  const end = useRef(null);
  const input = useRef(null);
  const ui = pref !== "auto" ? pref : last; // chat window ke labels ki bhasha

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, open]);
  useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => { if (typeof window !== "undefined" && window.innerWidth <= 480) setOpen(false); }, [path]); // phone par page badalte hi chat band
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  if (path.startsWith("/seller")) return null;

  const hello = (L) => [{ id: ++uid, from: "bot", blocks: [{ type: "text", text: t(L, "greetGuest", { brand: brand || "store" }) }] }];

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !msgs.length) {
      const L = pref !== "auto" ? pref : browserLang();
      setLast(L);
      setMsgs(hello(L));
      setChips(chipsFor(L, false));
    }
  };

  const changeLang = (v) => {
    setPref(v);
    const L = v === "auto" ? last : v;
    if (msgs.length <= 1) { setMsgs(hello(L)); setChips(chipsFor(L, false)); } // abhi tak baat shuru nahi hui: greeting naye bhasha mein
    else setChips(chipsFor(L, false));
  };

  async function send(raw) {
    const message = String(raw || "").trim().slice(0, 300);
    if (!message || busy) return;
    setVal("");
    setChips([]);
    setMsgs((m) => [...m, { id: ++uid, from: "me", text: message }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, lang: pref, hint: last }) });
      const d = await r.json();
      if (!d.blocks) throw new Error("bad");
      if (d.lang) setLast(d.lang);
      setMsgs((m) => [...m, { id: ++uid, from: "bot", blocks: d.blocks }]);
      setChips(d.chips || []);
    } catch {
      setMsgs((m) => [...m, { id: ++uid, from: "bot", blocks: [
        { type: "text", text: t(ui, "fail") },
        { type: "links", items: [{ label: t(ui, "waBtn"), href: `https://wa.me/${wa}`, kind: "wa" }] },
      ] }]);
    }
    setBusy(false);
  }

  const closeOnPhone = () => { if (window.innerWidth <= 480) setOpen(false); };

  return (
    <>
      <button type="button" className="cbw-launch" onClick={toggle} aria-label={open ? "Close chat" : "Chat with us"} aria-expanded={open}>
        {open ? (
          <div style={{ width: "100%", height: "100%", background: "var(--acc)", color: "#fff", display: "grid", placeItems: "center" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </div>
        ) : (
          <img src="/chatbot-icon.AVIF" alt="Chat" />
            
        )}
      </button>

      {open && (
        <section className="cbw" role="dialog" aria-label={`${name} chat`}>
          <div className="cbw-h">
            <span className="cbw-av" aria-hidden="true">{(brand || name).charAt(0).toUpperCase()}</span>
            <div><b>{name}</b><small>{t(ui, "sub")}</small></div>
            <select className="cbw-lang" value={pref} onChange={(e) => changeLang(e.target.value)} aria-label="Language">
              <option value="auto">{t(ui, "langAuto")}</option>
              {LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
            </select>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="cbw-m" aria-live="polite">
            {msgs.map((m) => m.from === "me"
              ? <div key={m.id} className="cbw-msg me">{m.text}</div>
              : <div key={m.id} className="cbw-msg bot"><Blocks blocks={m.blocks} onNav={closeOnPhone} /></div>)}
            {busy && <div className="cbw-msg bot cbw-typing" aria-label="Typing"><i /><i /><i /></div>}
            <div ref={end} />
          </div>
          {chips.length > 0 && <div className="cbw-chips">{chips.map((c) => <button key={c} type="button" onClick={() => send(c)}>{c}</button>)}</div>}
          <form className="cbw-f" onSubmit={(e) => { e.preventDefault(); send(val); }}>
            <input ref={input} value={val} onChange={(e) => setVal(e.target.value)} placeholder={t(ui, "placeholder")} maxLength={300} autoComplete="off" aria-label="Your message" />
            <button type="submit" disabled={busy || !val.trim()} aria-label="Send">➤</button>
          </form>
          <p className="cbw-note">{t(ui, "note")}</p>
        </section>
      )}
    </>
  );
}