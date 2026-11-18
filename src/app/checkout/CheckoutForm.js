"use client";
import { useState, useEffect, useActionState, useTransition } from "react";
import Link from "next/link";
import BagArt from "@/components/BagArt";
import { placeOrder, applyCoupon } from "./actions";
import { checkDelivery } from "@/app/delivery-actions";
import { useCart } from "@/components/CartProvider";
import { CHECKOUT, shipOptions, findCoupon, priceOrder, rupees } from "@/lib/checkout";
import { SITE } from "@/lib/site";

const Clip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="6" y="5" width="12" height="16" rx="2" /><path d="M9 5V4h6v1M9 11h6M9 15h6" />
  </svg>
);

export default function CheckoutForm({ addresses, initial, userName, userMobile }) {
  // cart yahin se badal sakte hain: price aur stock server se turant check hote hain
  const { cart: live, changeQty, removeItem, refresh, busy: cartBusy } = useCart();
  useEffect(() => { if (!live.loaded) refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const view = live.loaded ? live : initial;
  const items = view.items;
  const subtotal = view.subtotal;
  const hasSoldOut = items.some((i) => i.soldOut);
  const def = addresses.find((a) => a.is_default) || addresses[0];
  const [choice, setChoice] = useState(def ? String(def.id) : "new");
  const [ship, setShip] = useState(shipOptions()[0].id);
  const [pay, setPay] = useState("online");
  const [applied, setApplied] = useState("");
  const [cInput, setCInput] = useState("");
  const [cMsg, setCMsg] = useState("");
  const [applying, startApply] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [gift, setGift] = useState(false);
  const [f, setF] = useState({ name: userName || "", line: "", city: "", state: "Gujarat", pincode: "" });
  const [local, setLocal] = useState({});
  const [state, action, busy] = useActionState(placeOrder, null);
  const [q, setQ] = useState(null); // pincode check ka jawab (delivery date, Express, COD)

  // jis pincode par bhejna hai uski delivery check
  const pinNow = choice === "new" ? f.pincode.trim() : String(addresses.find((a) => String(a.id) === choice)?.pincode || "");
  const itemsKey = items.map((i) => `${i.key}:${i.qty}`).join(",");
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pinNow)) { setQ(null); return; }
    let off = false;
    checkDelivery(pinNow).then((r) => { if (!off) setQ(r); }).catch(() => {});
    return () => { off = true; };
  }, [pinNow, itemsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const noDeliver = q?.deliverable === false;
  const codOff = q?.deliverable && q.cod === false;
  const expressOk = !!q?.express;
  useEffect(() => { if (ship === "express" && !expressOk) setShip("standard"); }, [expressOk, ship]);
  useEffect(() => { if (pay === "cod" && codOff) setPay("online"); }, [codOff, pay]);

  const coupon = applied ? findCoupon(applied) : null;
  const price = priceOrder({ subtotal, ship, pay, coupon });
  const sel = shipOptions().find((o) => o.id === price.shipId);
  const need = SITE.freeShippingAbove - subtotal;

  // errors: first the ones found in the browser, then the one the server sent back
  const err = (k) => local[k] || (state?.field === k ? state.error : "");
  const E = (k) => (err(k) ? <p className="err" id={`ck-${k}-err`} role="alert">{err(k)}</p> : null);
  const formErr = state?.error && (!state.field || state.field === "cart") ? state.error : "";

  const setField = (k, fix) => (e) => {
    const v = fix ? fix(e.target.value) : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    if (local[k]) setLocal((p) => ({ ...p, [k]: "" }));
  };
  const pinOk = (v) => /^\d{6}$/.test(v.trim());

  function validate() {
    const e = {};
    if (choice === "new") {
      if (f.name.trim().length < 2) e.name = "Enter your full name.";
      if (f.line.trim().length < 5) e.line = "Enter the full address (house, society, area).";
      if (!f.city.trim()) e.city = "Enter your city.";
      if (!f.state.trim()) e.state = "Enter your state.";
      if (!pinOk(f.pincode)) e.pincode = "Enter a valid 6-digit pincode.";
    }
    return e;
  }

  function onSubmit(ev) {
    const e = validate();
    setLocal(e);
    const first = Object.keys(e)[0];
    if (first) {
      ev.preventDefault();
      document.getElementById(`ck-${first}`)?.focus();
    }
  }

  function doApply() {
    if (applying) return;
    startApply(async () => {
      const r = await applyCoupon(cInput);
      if (r.error) setCMsg(r.error);
      else { setApplied(r.code); setCInput(""); setCMsg(""); }
    });
  }

  if (!items.length) {
    return (
      <div className="card pad ck-card">
        <h3>Your cart is empty</h3>
        <p className="ck-sub">Add something you like and come back here.</p>
        <Link href="/products" className="btn a">Continue shopping</Link>
      </div>
    );
  }
  const blocked = busy || cartBusy || hasSoldOut || noDeliver;
  const payLabel = busy
    ? "Please wait..."
    : hasSoldOut ? "Remove sold-out items to continue"
    : noDeliver ? "We do not deliver to this pincode yet"
    : pay === "online" ? `Pay ${rupees(price.total)} securely` : `Place order (COD) · ${rupees(price.total)}`;


  return (
    <form action={action} onSubmit={onSubmit} className="ck-grid" noValidate>
      <div>
        {/* ---------- Delivery address ---------- */}
        <section className="card pad ck-card">
          <h3>Delivery address</h3>
          {addresses.map((a) => {
            const on = choice === String(a.id);
            return (
              <label key={a.id} className={`ck-opt${on ? " on" : ""}`}>
                <input type="radio" name="address" value={a.id} checked={on} onChange={() => setChoice(String(a.id))} />
                <span className="ck-body">
                  <b>{a.label}</b>{a.is_default ? <span className="ck-tag">Default</span> : null}
                  <span className="ck-sub ck-ink">{a.name}, {a.line}, {a.city}, {a.state} {a.pincode}</span>
                  <span className="ck-sub">Delivery contact: {userMobile}</span>
                </span>
              </label>
            );
          })}
          <label className={`ck-opt${choice === "new" ? " on" : ""}`}>
            <input type="radio" name="address" value="new" checked={choice === "new"} onChange={() => setChoice("new")} />
            <span className="ck-body"><b>+ Add a new address</b></span>
          </label>
          {E("address")}
          {addresses.length > 0 && <Link href="/account/addresses" className="ck-link">Manage saved addresses</Link>}

          {choice === "new" && (
            <div className="ck-new">
              <label htmlFor="ck-name">Full name</label>
              <input id="ck-name" name="name" value={f.name} onChange={setField("name")} autoComplete="name" aria-invalid={!!err("name")} aria-describedby={err("name") ? "ck-name-err" : undefined} />
              {E("name")}
              <label htmlFor="ck-line">House / society / area</label>
              <input id="ck-line" name="line" value={f.line} onChange={setField("line")} autoComplete="street-address" aria-invalid={!!err("line")} aria-describedby={err("line") ? "ck-line-err" : undefined} />
              {E("line")}
              <div className="three">
                <div>
                  <label htmlFor="ck-city">City</label>
                  <input id="ck-city" name="city" value={f.city} onChange={setField("city")} autoComplete="address-level2" aria-invalid={!!err("city")} />
                  {E("city")}
                </div>
                <div>
                  <label htmlFor="ck-state">State</label>
                  <input id="ck-state" name="state" value={f.state} onChange={setField("state")} autoComplete="address-level1" aria-invalid={!!err("state")} />
                  {E("state")}
                </div>
                <div>
                  <label htmlFor="ck-pincode">Pincode</label>
                  <input
                    id="ck-pincode" name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code"
                    value={f.pincode} onChange={setField("pincode", (v) => v.replace(/\D/g, "").slice(0, 6))}
                    onBlur={() => f.pincode && !pinOk(f.pincode) && setLocal((p) => ({ ...p, pincode: "Enter a valid 6-digit pincode." }))}
                    aria-invalid={!!err("pincode")} aria-describedby={err("pincode") ? "ck-pincode-err" : undefined}
                  />
                  {E("pincode")}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ---------- Shipping method ---------- */}
        <section className="card pad ck-card">
          <h3>Shipping method</h3>
          {noDeliver && <p className="err" role="alert">We do not deliver to {pinNow} yet. Please choose another address.</p>}
          {shipOptions().filter((o) => o.id !== "express" || expressOk).map((o) => {
            const fee = priceOrder({ subtotal, ship: o.id, pay }).shipping;
            const by = o.id === "express" ? q?.express?.by : q?.standard?.by;
            const on = ship === o.id;
            return (
              <label key={o.id} className={`ck-opt${on ? " on" : ""}`}>
                <input type="radio" name="ship" value={o.id} checked={on} onChange={() => setShip(o.id)} />
                <span className="ck-body">
                  <b>{o.name}</b>
                  <span className="ck-sub">{by ? `Delivery by ${by}` : `Arrives in ${o.id === "standard" ? o.days : "less time"}`}</span>
                </span>
                <b className={fee === 0 ? "ck-free" : ""}>{fee === 0 ? "FREE" : rupees(fee)}</b>
              </label>
            );
          })}
          {E("ship")}
        </section>

        {/* ---------- Payment ---------- */}
        <section className="card pad ck-card">
          <h3>Payment method</h3>
          <label className={`ck-opt${pay === "online" ? " on" : ""}`}>
            <input type="radio" name="pay" value="online" checked={pay === "online"} onChange={() => setPay("online")} />
            <span className="ck-body">
              <b>Online payment</b>
              {CHECKOUT.onlineDiscountPercent > 0 && <span className="ck-tag">Save {CHECKOUT.onlineDiscountPercent}%</span>}
              <span className="ck-sub">UPI, Cards, Netbanking. Secured by Razorpay.</span>
            </span>
          </label>
          <label className={`ck-opt${pay === "cod" ? " on" : ""}`} style={codOff ? { opacity: 0.5 } : undefined}>
            <input type="radio" name="pay" value="cod" checked={pay === "cod"} disabled={codOff} onChange={() => setPay("cod")} />
            <span className="ck-body">
              <b>Cash on Delivery</b>
              {CHECKOUT.codFee > 0 && <span className="ck-tag w">+{rupees(CHECKOUT.codFee)} COD fee</span>}
              <span className="ck-sub">Pay in cash when your order arrives.</span>
            </span>
          </label>
          {codOff && <p className="err" role="status">Cash on Delivery is not available for this pincode. Please pay online.</p>}
          {E("pay")}
        </section>

        {/* ---------- Order note ---------- */}
        <section className="card pad ck-card">
          <button type="button" className="ck-ghost ck-tip" data-tip="Add order note" aria-expanded={noteOpen} aria-controls="ck-notebox" onClick={() => setNoteOpen((v) => !v)}>
            <Clip />{note || gift ? "Edit order note" : "Add order note"}
          </button>
          <div id="ck-notebox" hidden={!noteOpen} className="ck-notebox">
            <label className="ck-check">
              <input type="checkbox" name="gift" checked={gift} onChange={(e) => setGift(e.target.checked)} />
              This is a gift
            </label>
            <label htmlFor="ck-note">Gift message or delivery note (optional)</label>
            <textarea id="ck-note" name="note" rows={3} maxLength={CHECKOUT.noteMax} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Happy birthday! / Please call before delivery" />
            <span className="ck-sub ck-count">{note.length}/{CHECKOUT.noteMax}</span>
          </div>
        </section>
      </div>

      {/* ---------- Order summary ---------- */}
      <aside className="ck-sum">
        <div className="card pad ck-card">
          <h3>Order summary</h3>
          {items.map((i) => (
            <div className={`ck-item${i.soldOut ? " out" : ""}`} key={i.key}>
              <div className="ck-thumb">{i.image ? <img src={i.image} alt="" loading="lazy" /> : <BagArt main={i.colourMain} dark={i.colourDark} />}</div>
              <div className="ck-body">
                <b>{i.name}</b>
                {i.soldOut ? (
                  <>
                    <span className="ck-soldout" role="alert"><b>Sold out.</b> You cannot check out with this item.</span>
                    <span className="ck-actions">
                      <button type="button" className="ck-ghost" onClick={() => removeItem(i.key)}>Remove</button>
                      <Link href={`/products/${i.id}#notify`} className="ck-ghost">Notify me when back</Link>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="ck-qty" role="group" aria-label={`Quantity of ${i.name}`}>
                      <button type="button" onClick={() => changeQty(i.key, -1)} disabled={i.qty <= 1} aria-label={`Decrease quantity of ${i.name}`}>−</button>
                      <b aria-live="polite">{i.qty}</b>
                      <button type="button" onClick={() => changeQty(i.key, 1)} disabled={i.qty >= i.max} aria-label={`Increase quantity of ${i.name}`}>+</button>
                      <button type="button" className="ck-rm" onClick={() => removeItem(i.key)}>Remove</button>
                    </span>
                    {i.qty >= i.max && <span className="ck-sub">{i.stock <= 10 ? `Only ${i.stock} available` : "Maximum quantity for one order"}</span>}
                  </>
                )}
              </div>
              <b>{i.soldOut ? "—" : rupees(i.line)}</b>
            </div>
          ))}

          <div className="ck-coupon">
            <input type="hidden" name="coupon" value={applied} />
            {applied ? (
              <>
              <div className="ck-applied">
                <span><b>{applied}</b> applied{coupon?.label ? ` · ${coupon.label}` : ""}</span>
                <button type="button" className="ck-x" onClick={() => setApplied("")}>Remove</button>
              </div>
              {coupon && subtotal < (coupon.min || 0) && <p className="ck-sub" role="status">Add {rupees(coupon.min - subtotal)} more to use this coupon.</p>}
              </>
            ) : (
              <div className="ck-crow">
                <input
                  value={cInput} onChange={(e) => { setCInput(e.target.value.toUpperCase()); setCMsg(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doApply(); } }}
                  placeholder="Coupon code" aria-label="Coupon code" autoComplete="off" maxLength={20}
                />
                <button type="button" className="ck-ghost" onClick={doApply} disabled={applying || !cInput.trim()}>{applying ? "..." : "Apply"}</button>
              </div>
            )}
            {(cMsg || err("coupon")) && <p className="err" role="alert">{cMsg || err("coupon")}</p>}
          </div>

          <div className="row"><span>Subtotal</span><span>{rupees(subtotal)}</span></div>
          <div className="row"><span>Shipping</span><span className={price.shipping === 0 ? "ck-free" : ""}>{price.shipping === 0 ? "FREE" : rupees(price.shipping)}</span></div>
          {price.codFee > 0 && <div className="row"><span>COD fee</span><span>{rupees(price.codFee)}</span></div>}
          {price.couponDiscount > 0 && <div className="row"><span>Coupon ({applied})</span><span className="ck-free">−{rupees(price.couponDiscount)}</span></div>}
          {price.onlineDiscount > 0 && <div className="row"><span>Online payment discount ({CHECKOUT.onlineDiscountPercent}%)</span><span className="ck-free">−{rupees(price.onlineDiscount)}</span></div>}
          <div className="row ck-total"><b>Total</b><b>{rupees(price.total)}</b></div>

          {sel?.fee == null && (
            need > 0 ? (
              <div className="ck-nudge">
                Add {rupees(need)} more for free shipping
                <i><u style={{ width: `${Math.min(100, Math.round((subtotal / SITE.freeShippingAbove) * 100))}%` }} /></i>
              </div>
            ) : (
              <div className="ck-nudge ok">You have unlocked free shipping on this order.</div>
            )
          )}

          {formErr && <p className="err" role="alert">{formErr}</p>}
          <button className="btn a ck-pay ck-paydesk" disabled={blocked}>{payLabel}</button>
          <p className="ck-trust">Secured by Razorpay · UPI, Cards, Netbanking</p>
          <p className="ck-trust">{q?.standard ? `Delivery by ${(ship === "express" && q.express ? q.express : q.standard).by}` : `Delivery in ${sel?.days}`} · {SITE.returnDays}-day easy returns</p>
          <p className="ck-trust"><Link href="/cart" className="ck-link">Edit cart</Link></p>
        </div>
      </aside>

      {/* mobile: sticky pay bar */}
      <div className="ck-bar">
        <div><small>Total</small><b>{rupees(price.total)}</b></div>
        <button className="btn a ck-pay" disabled={blocked}>{busy ? "Please wait..." : hasSoldOut ? "Remove sold-out items" : pay === "online" ? "Pay securely" : "Place order"}</button>
      </div>
    </form>
  );
}
