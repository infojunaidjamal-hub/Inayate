// Phase 3: order ka flow, hold rules, 1-din ka SLA timer, history (order_events), buyer ko message. SIRF SERVER par chalta hai.
//
// Flow:  Placed (andar ka) -> On Hold (agar koi rule pakde) ya Confirmed
//        Confirmed -> Packed -> Ready to ship -> Picked up -> In transit -> Out for delivery -> Delivered
//        Out for delivery -> NDR (delivery fail) -> wapas Out for delivery ya RTO
// Kuch badalna ho (limit, ghante, pincode) to sirf neeche FLOW mein badlo.
import { randomBytes } from "node:crypto";
import { all, one, run, transaction, inr } from "@/lib/db";
import { giveStock } from "@/lib/catalog";
import { ensureInvoice, issueCreditNote } from "@/lib/invoices";
import { queueMessage } from "@/lib/outbox";
import { shipOption } from "@/lib/checkout";
import { SITE } from "@/lib/site";
import { logEvent } from "@/lib/track";
import { abs } from "@/lib/seo";
import { NEXT_STATUS, CANCEL_REASONS, RETURN_REASONS } from "@/lib/format";
import { pincodeOf } from "@/lib/address";

export const FLOW = {
  codRiskyAbove: 3000,    // COD order is rupaye ya usse upar ho to "risky COD" (0 = off)
  codNewBuyerAbove: 1500, // naye buyer (pehle koi delivered order nahi) ka COD is rupaye se upar ho to bhi risky (0 = off)
  minAddressLen: 25,      // isse chhota poora address "incomplete" maana jayega
  cancelsLimit: 2,        // pichle cancelsDays din mein buyer ne itne order khud cancel kiye hon to hold
  cancelsDays: 60,
  unserviceable: [],      // jin pincode (ya shuruaat ke ank) par delivery nahi hoti, jaise ["79", "744101"]. Courier partners Phase 4 mein aayenge.
  verifyHours: 24,        // On Hold order ko verify karne ka samay
  shipHours: 24,          // Confirmed se pickup tak: ship within 1 day
  soonHours: 8,           // itne ghante ya kam bache to timer amber
  codConfirmHours: 24,    // COD buyer itne ghante mein confirm kare, nahi to order On Hold
  autoCancelHours: 24,    // sirf "COD confirm nahi hua" wala hold itne ghante baad apne aap cancel
  autoCancel: true,       // false karne par auto-cancel band (order On Hold hi rahega)
  ndrMax: 3,              // delivery ki zyada se zyada koshish
};

export const HOLD_LABEL = {
  risky_cod: "Risky COD",
  pincode: "Pincode not serviceable",
  address: "Address incomplete",
  cancels: "Past cancels",
  cod_unconfirmed: "COD not confirmed by buyer",
};

export { CANCEL_REASONS, RETURN_REASONS };

/* ---------- chhote helpers ---------- */
export const ts = (s) => {
  if (!s) return null;
  const t = new Date(String(s).replace(" ", "T") + "Z").getTime();
  return Number.isFinite(t) ? t : null;
};
const maxNum = (s) => { const n = String(s || "").match(/\d+/g); return n ? Math.max(...n.map(Number)) : 0; };
const firstName = (o) => String(o.ship_name || "there").trim().split(/\s+/)[0] || "there";
// Is order ki delivery ki zyada se zyada koshish (courier partner se aati hai)
export const ndrMaxOf = (o) => Number(o?.ndr_max) || FLOW.ndrMax;
export const parseList = (s) => { try { const a = JSON.parse(s || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };

/* ---------- history (order_events) ---------- */
export function addEvent(orderId, { kind = "status", code, label, detail = "", by = null, who = "", created_at = null }) {
  const name = by?.name || (who === "buyer" ? "Buyer" : who === "seller" ? "Seller" : "System");
  if (created_at) {
    run("INSERT INTO order_events (order_id, kind, code, label, detail, by_id, by_name, created_at) VALUES (?,?,?,?,?,?,?,?)",
      orderId, kind, code, label, detail || null, by?.id ?? null, name, created_at);
  } else {
    run("INSERT INTO order_events (order_id, kind, code, label, detail, by_id, by_name) VALUES (?,?,?,?,?,?,?)",
      orderId, kind, code, label, detail || null, by?.id ?? null, name);
  }
}
export const eventsOf = (orderId) => all("SELECT * FROM order_events WHERE order_id = ? ORDER BY id", orderId);

/* ---------- hold rules ---------- */

// Saare rules ek ek karke: [{ code, label, flag, detail }]
export function checkRules(o) {
  const out = [];
  const total = Number(o.total) || 0;
  let risky = false, why = "COD limit ke andar hai";
  if (o.pay_method !== "COD") why = "Online payment, COD nahi";
  else {
    const first = one("SELECT COUNT(*) c FROM orders WHERE user_id = ? AND id <> ? AND status IN ('Delivered','Return Requested','Return Approved','Return Rejected','Refunded')", o.user_id, o.id).c === 0;
    if (FLOW.codRiskyAbove && total >= FLOW.codRiskyAbove) { risky = true; why = `COD ${inr(total)} (limit ${inr(FLOW.codRiskyAbove)})`; }
    else if (FLOW.codNewBuyerAbove && first && total >= FLOW.codNewBuyerAbove) { risky = true; why = `Naya buyer, COD ${inr(total)} (limit ${inr(FLOW.codNewBuyerAbove)})`; }
  }
  out.push({ code: "risky_cod", label: HOLD_LABEL.risky_cod, flag: risky, detail: why });

  const pin = pincodeOf(o);
  const blocked = pin && FLOW.unserviceable.some((p) => pin.startsWith(String(p)));
  out.push({ code: "pincode", label: HOLD_LABEL.pincode, flag: !!blocked, detail: blocked ? `${pin} par delivery nahi hoti` : pin ? `${pin} covered hai` : "Pincode nahi mila" });

  const short = String(o.ship_address || "").length < FLOW.minAddressLen;
  out.push({ code: "address", label: HOLD_LABEL.address, flag: !pin || short, detail: !pin ? "Address mein 6 ank ka pincode nahi" : short ? "Address bahut chhota hai" : "Address poora hai" });

  const n = one(
    "SELECT COUNT(*) c FROM orders WHERE user_id = ? AND id <> ? AND status = 'Cancelled' AND cancelled_by = 'buyer' AND created_at >= datetime('now', ?)",
    o.user_id, o.id, `-${FLOW.cancelsDays} days`).c;
  out.push({ code: "cancels", label: HOLD_LABEL.cancels, flag: FLOW.cancelsLimit > 0 && n >= FLOW.cancelsLimit, detail: `Pichle ${FLOW.cancelsDays} din mein ${n} cancel` });
  return out;
}
export const evaluateHold = (o) => checkRules(o).filter((r) => r.flag);

/* ---------- buyer ko message (outbox mein save) ---------- */
function contactOf(o) {
  const u = o.user_id ? one("SELECT email, mobile FROM users WHERE id = ?", o.user_id) : null;
  if (u?.email) return { channel: "email", to: u.email };
  return { channel: "sms", to: u?.mobile || o.ship_mobile || null };
}

const track = (o) => abs(`/order/${o.order_no}`);
const MSG = {
  Confirmed: (o) => ["Your order is confirmed", `Hi ${firstName(o)}, your order ${o.order_no} is confirmed. We will pack and ship it within 1 working day. Track it here: ${track(o)}`],
  "On Hold": (o) => ["Your order is on hold", `Hi ${firstName(o)}, your order ${o.order_no} is on hold for a quick check. We will update you soon. Details: ${track(o)}`],
  Packed: (o) => ["Your order is packed", `Hi ${firstName(o)}, your order ${o.order_no} is packed and will be handed to the courier soon. ${track(o)}`],
  "Picked up": (o) => ["Your order has been picked up", `Hi ${firstName(o)}, your order ${o.order_no} is picked up by ${o.courier || "the courier"}${o.awb ? ` (tracking ID ${o.awb})` : ""}. Track it here: ${track(o)}`],
  "Out for delivery": (o) => ["Out for delivery today", `Hi ${firstName(o)}, your order ${o.order_no} is out for delivery today.${o.pay_method === "COD" ? ` Please keep ${inr(o.total)} ready.` : ""} ${track(o)}`],
  Delivered: (o) => ["Your order is delivered", `Hi ${firstName(o)}, your order ${o.order_no} is delivered. Thank you for shopping with ${SITE.name}! You can return it within ${SITE.returnDays} days: ${track(o)}`],
  Cancelled: (o) => ["Your order is cancelled", `Hi ${firstName(o)}, your order ${o.order_no} is cancelled${o.cancel_reason ? ` (${o.cancel_reason})` : ""}.${o.pay_status === "Refund Initiated" ? ` Your refund will reach you in ${SITE.refundDays}.` : ""} ${track(o)}`],
  NDR: (o) => ["We could not deliver your order", `Hi ${firstName(o)}, delivery of order ${o.order_no} failed${o.ndr_reason ? ` (${o.ndr_reason})` : ""}. We will try again. Please keep your phone on. ${track(o)}`],
  RTO: (o) => ["Your order is returning to us", `Hi ${firstName(o)}, we could not deliver order ${o.order_no} after ${o.ndr_attempts || "several"} attempts, so it is coming back to us.${o.pay_status === "Refund Initiated" ? ` Your refund will be processed in ${SITE.refundDays}.` : ""} ${track(o)}`],
};

function notify(o, to, extra = "") {
  const f = MSG[to];
  if (!f) return;
  try {
    const [subject, body] = f(o);
    const c = contactOf(o);
    queueMessage({ channel: c.channel, to: c.to, subject, body: extra ? `${body}\n\n${extra}` : body, kind: "order_" + to.toLowerCase().replace(/\s+/g, "_"), ref: o.order_no });
  } catch (e) {
    console.error("notify:", e.message);
  }
}

// Return / refund ke message (seller actions se)
export function notifyReturn(order, subject, text) {
  try {
    const c = contactOf(order);
    queueMessage({ channel: c.channel, to: c.to, subject, body: `Hi ${firstName(order)}, ${text} ${track(order)}`, kind: "return", ref: order.order_no });
  } catch (e) {
    console.error("notifyReturn:", e.message);
  }
}

/* ---------- status badalna (sab jagah yahin se) ---------- */
const EVENT_LABEL = {
  Confirmed: "Order confirmed", "On Hold": "Put on hold", Packed: "Packed", "Ready to ship": "Ready to ship",
  "Picked up": "Picked up by courier", "In transit": "In transit", "Out for delivery": "Out for delivery", Delivered: "Delivered",
  Cancelled: "Cancelled", NDR: "Delivery attempt failed", RTO: "Return to seller started",
};

// o = orders ki row. ctx: { by (staff user), who: "seller"|"buyer"|"system", note, courier, awb, force, holdReasons, extra, detail }
// Transaction ke andar bulao (khud transaction nahi kholta). Wapas: { ok: true, order } ya { error }
export function moveOrder(o, to, ctx = {}) {
  const who = ctx.who || (ctx.by ? "seller" : "system");
  const note = String(ctx.note || "").trim();
  if (!ctx.force && !(NEXT_STATUS[o.status] || []).includes(to)) return { error: `"${o.status}" se "${to}" nahi ho sakta.` };
  const cour = ctx.courier || o.courier, awb = ctx.awb || o.awb;
  if (to === "Ready to ship" && (!String(cour || "").trim() || !String(awb || "").trim())) return { error: "Ready to ship ke liye courier ka naam aur tracking ID dono chahiye." };
  if ((to === "Cancelled" || to === "NDR") && !note) return { error: to === "NDR" ? "Delivery fail hone ki wajah likhein." : "Cancel karne ki wajah likhein." };
  const nmax = ndrMaxOf(o);
  if (to === "NDR" && (o.ndr_attempts || 0) >= nmax) return { error: `${nmax} koshish ho chuki hain.` };
  if (o.status === "NDR" && to === "Out for delivery" && (o.ndr_attempts || 0) >= nmax) return { error: `${nmax} koshish ho chuki hain. Ab RTO karein.` };

  const sets = ["status = ?"], vals = [to];
  const set = (c, v) => { sets.push(`${c} = ?`); vals.push(v); };
  const now = (c) => sets.push(`${c} = datetime('now')`);
  if (ctx.courier || ctx.awb) { set("courier", cour || null); set("awb", awb || null); }

  switch (to) {
    case "Confirmed":
      now("confirmed_at"); set("hold_reasons", null); set("hold_at", null);
      if (o.status === "On Hold" && o.pay_method === "COD" && !o.cod_confirmed_at && who === "seller") now("cod_confirmed_at"); // seller ne verify kiya
      break;
    case "On Hold":
      now("hold_at"); set("hold_reasons", JSON.stringify(ctx.holdReasons || []));
      break;
    case "Packed": now("packed_at"); break;
    case "Ready to ship": now("ready_at"); break;
    case "Picked up": now("picked_at"); break;
    case "NDR": sets.push("ndr_attempts = COALESCE(ndr_attempts, 0) + 1"); set("ndr_reason", note); break;
    case "RTO": set("rto_stage", "initiated"); break;
    case "Delivered":
      now("delivered_at");
      set("pay_status", o.pay_method === "COD" ? "Paid" : o.pay_status); // COD ka paisa delivery par milta hai
      if (o.pay_method === "COD") run("UPDATE order_costs SET cod_fee = COALESCE((SELECT cod_fee FROM shipments WHERE order_id = ?), 0), updated_at = datetime('now') WHERE order_id = ?", o.id, o.id); // COD fee ab lagti hai
      break;
    case "Cancelled":
      for (const i of all("SELECT * FROM order_items WHERE order_id = ?", o.id)) if (i.product_id) giveStock(i.product_id, i.variant_id, i.qty);
      set("pay_status", o.pay_status === "Paid" ? "Refund Initiated" : "Cancelled");
      set("cancel_reason", note); set("cancelled_by", who); now("cancelled_at"); set("hold_reasons", null);
      break;
  }
  run(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`, ...vals, o.id);

  const detail = ctx.detail || (to === "Cancelled" || to === "NDR" ? note : "") || (to === "Picked up" && (cour || awb) ? `${cour || ""} ${awb || ""}`.trim() : "");
  addEvent(o.id, { code: to, label: EVENT_LABEL[to] || to, detail, by: ctx.by, who });
  // GST: pack hote hi invoice banta hai; pack ke baad cancel ho to credit note (galti hone par order ka kaam nahi rukta)
  try {
    if (to === "Packed") ensureInvoice(o.id);
    if (to === "Cancelled") issueCreditNote({ orderId: o.id, kind: "cancel", reason: note || "Order cancelled" });
  } catch (e) {
    console.error("invoice hook:", e.message);
  }
  let n = one("SELECT * FROM orders WHERE id = ?", o.id);
  let extra = ctx.extra;
  let caseId = null;
  if (to === "NDR") {
    // Buyer ko bhejne ke liye link (seller khud WhatsApp / SMS se bhejta hai) aur NDR case
    const token = randomBytes(12).toString("hex");
    const nm = ndrMaxOf(n);
    const link = abs(`/ndr/${token}`);
    const text = `Hi ${firstName(n)}, we tried to deliver your order ${n.order_no} but could not (${note}). This was attempt ${n.ndr_attempts} of ${nm}. Please confirm your address and a delivery date here: ${link}`;
    caseId = Number(run("INSERT INTO ndr_cases (order_id, attempt, max_attempts, reason, token, message) VALUES (?,?,?,?,?,?)", n.id, n.ndr_attempts, nm, note, token, text).lastInsertRowid);
    extra = `Please confirm your address and a delivery date here: ${link}`;
  }
  if (to === "RTO") rtoStartEvent(n.id, ctx.by);
  notify(n, to, extra);
  if (to === "NDR" && n.ndr_attempts >= ndrMaxOf(n)) {
    // Aakhri koshish bhi fail: RTO apne aap shuru
    const r2 = moveOrder(n, "RTO", { who: "system", detail: `All ${ndrMaxOf(n)} delivery attempts failed` });
    if (r2.ok) { run("UPDATE ndr_cases SET status = 'rto' WHERE id = ?", caseId); n = r2.order; }
  }
  return { ok: true, order: n };
}

// Naya order (COD placed ya online payment hua): rules dekho, On Hold ya Confirmed karo, COD ka confirm link banao.
export function routeNewOrder(orderId) {
  try {
    const o = one("SELECT * FROM orders WHERE id = ?", orderId);
    if (!o || o.status !== "Placed") return; // dobara chalne par kuch nahi karta
    logEvent("purchase", { order_id: o.id, value: Math.round(o.total) }); // Insights ke liye
    transaction(() => {
      addEvent(o.id, { code: "Placed", label: "Order placed", who: "buyer", created_at: o.created_at });
      const flags = evaluateHold(o);
      let extra = "";
      if (o.pay_method === "COD") {
        const token = randomBytes(16).toString("hex");
        run("UPDATE orders SET cod_token = ?, cod_sent_at = datetime('now') WHERE id = ?", token, o.id);
        extra = `Cash on delivery: please confirm your order within ${FLOW.codConfirmHours} hours: ${abs(`/cod/${token}`)}`;
        addEvent(o.id, { kind: "note", code: "cod_link", label: "COD confirm link sent", detail: "Message outbox mein hai", who: "system" });
      }
      if (flags.length) {
        const r = moveOrder(o, "On Hold", { force: true, who: "system", holdReasons: flags.map((f) => f.code), detail: flags.map((f) => `${f.label}: ${f.detail}`).join(" · "), extra });
        if (r.error) throw new Error(r.error);
      } else {
        const r = moveOrder(o, "Confirmed", { who: "system", extra });
        if (r.error) throw new Error(r.error);
      }
    });
  } catch (e) {
    console.error("routeNewOrder:", e);
  }
}

// COD buyer ne link se confirm kiya
export function confirmCod(o) {
  if (o.cod_confirmed_at) return { ok: true, already: true };
  const reasons = parseList(o.hold_reasons).filter((r) => r !== "cod_unconfirmed");
  let out = { ok: true };
  transaction(() => {
    run("UPDATE orders SET cod_confirmed_at = datetime('now'), hold_reasons = ? WHERE id = ?", o.status === "On Hold" ? JSON.stringify(reasons) : o.hold_reasons, o.id);
    addEvent(o.id, { code: "cod_confirmed", label: "COD confirmed by buyer", who: "buyer" });
    if (o.status === "On Hold" && reasons.length === 0) {
      const fresh = one("SELECT * FROM orders WHERE id = ?", o.id);
      const r = moveOrder(fresh, "Confirmed", { who: "buyer", detail: "COD confirmed by buyer" });
      if (r.error) out = r;
    }
  });
  return out;
}

/* ---------- Timer (SLA) ---------- */
// { tone: "ok" | "soon" | "late", label }  (sirf jahan seller ko jaldi karni hai)
export function slaOf(o, now = Date.now()) {
  let start, hours = FLOW.shipHours;
  if (o.status === "On Hold" || o.status === "Placed") { start = ts(o.hold_at) || ts(o.created_at); hours = FLOW.verifyHours; }
  else if (["Confirmed", "Packed", "Ready to ship"].includes(o.status)) start = ts(o.confirmed_at) || ts(o.created_at);
  else return null;
  if (!start) return null;
  const left = start + hours * 3600e3 - now;
  const a = Math.abs(left), h = Math.floor(a / 3600e3), m = Math.floor((a % 3600e3) / 60e3);
  const t = h > 0 ? `${h}h` : `${m}m`;
  if (left <= 0) return { tone: "late", label: `Overdue ${t}` };
  return { tone: left <= FLOW.soonHours * 3600e3 ? "soon" : "ok", label: `${t} left` };
}

// Delivery ka andaza (Sunday chhodkar): confirm ke baad dispatch + delivery ke zyada se zyada din
export function estimateDelivery(o) {
  if (o.promised_by) { const d = new Date(o.promised_by + "T12:00:00Z"); if (!isNaN(d)) return d; }
  const start = ts(o.confirmed_at) || ts(o.created_at) || Date.now();
  let days = maxNum(SITE.dispatchDays) + maxNum(shipOption(o.ship_method)?.days || SITE.deliveryDays);
  const d = new Date(start);
  while (days > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 0) days--; }
  return d;
}

/* ---------- Timeline (buyer ke liye) ---------- */
export const FWD = [
  ["Confirmed", "Order confirmed"], ["Packed", "Packed"], ["Ready to ship", "Ready to ship"], ["Picked up", "Picked up by courier"],
  ["In transit", "In transit"], ["Out for delivery", "Out for delivery"], ["Delivered", "Delivered"],
];
export const CR_STEPS = [
  ["requested", "Return requested"], ["accepted", "Accepted by seller"], ["pickup", "Pickup scheduled"], ["picked", "Picked up by courier"],
  ["transit", "In transit back to seller"], ["received", "Received by seller"], ["qc", "Quality check"], ["refunded", "Refund issued"],
];
export const RTO_STEPS = [
  ["initiated", "Return to seller started"], ["transit", "In transit back to seller"], ["received", "Received by seller"],
  ["qc", "Quality check"], ["restocked", "Restocked"],
];

const lastAt = (events, kind, code) => { for (let i = events.length - 1; i >= 0; i--) if (events[i].kind === kind && events[i].code === code) return events[i].created_at; return null; };

// defs = [[code, label]], hi = ab tak pahunchha hua sabse aage ka step (index), at = (code) => date
function progress(defs, hi, at, extra = null) {
  const steps = defs.map(([code, name], i) => ({ code, name, date: i <= hi ? at(code) : null, state: i < hi ? "done" : i === hi ? (i === defs.length - 1 ? "done" : "now") : "next" }));
  if (extra) steps.push(extra);
  return steps;
}

// Seedha (forward) timeline
export function forwardSteps(o, events) {
  const idx = FWD.findIndex(([s]) => s === o.status);
  let hi = idx;
  if (["Awaiting Payment", "Placed", "On Hold", "Cancelled"].includes(o.status)) hi = -1;
  else if (["NDR", "RTO", "RTO Done"].includes(o.status)) hi = 5;
  else if (idx < 0) hi = 6; // Return * / Refunded: delivered ho chuka tha
  const steps = FWD.map(([code, name], i) => ({ code, name, date: i <= hi ? lastAt(events, "status", code) : null, state: i < hi ? "done" : i === hi ? (i === FWD.length - 1 ? "done" : "now") : "next" }));
  if (o.status === "NDR") {
    steps[5].state = "done";
    steps.push({ code: "ndr", name: `Delivery attempt ${o.ndr_attempts || 1} of ${ndrMaxOf(o)} failed`, date: lastAt(events, "status", "NDR"), state: "fail", note: o.ndr_reason || "" });
  } else if (["RTO", "RTO Done"].includes(o.status)) {
    steps[5].state = "done";
    steps.push({ code: "ndr", name: `Delivery failed after ${o.ndr_attempts || 1} attempt${(o.ndr_attempts || 1) > 1 ? "s" : ""}`, date: lastAt(events, "status", "NDR"), state: "fail", note: o.ndr_reason || "" });
  }
  return steps;
}

// Return (CR) ka timeline: returns row + events
export function returnSteps(ret, events) {
  if (!ret) return [];
  const at = (c) => lastAt(events, "return", c);
  if (ret.stage === "rejected" || ret.status === "Rejected") {
    return [{ code: "requested", name: "Return requested", date: at("requested") || ret.created_at, state: "done" }, { code: "rejected", name: "Not accepted by seller", date: at("rejected"), state: "fail" }];
  }
  let hi = CR_STEPS.findIndex(([c]) => c === ret.stage);
  if (ret.status === "Refunded") hi = CR_STEPS.length - 1;
  if (hi < 0) hi = ret.status === "Approved" ? 1 : 0;
  return progress(CR_STEPS, hi, at);
}

// RTO (delivery fail hokar wapas) ka timeline
export function rtoSteps(o, events) {
  const hi = RTO_STEPS.findIndex(([c]) => c === o.rto_stage);
  if (hi < 0) return [];
  const at = (c) => lastAt(events, "rto", c);
  const defs = RTO_STEPS.map(([c, n]) => [c, c === "received" ? "Received by seller (order cancelled)" : c === "restocked" ? (o.rto_qc === "damaged" ? "Written off (damaged)" : "Restocked") : n]);
  return progress(defs, hi, at);
}

/* ---------- Sweeper: COD confirm nahi hua to hold, phir cancel ---------- */
export function sweepOrders() {
  const g = globalThis;
  if (Date.now() - (g.__maisonSweepAt || 0) < 60000) return; // minute mein ek baar
  g.__maisonSweepAt = Date.now();
  try {
    const late = all(
      `SELECT * FROM orders WHERE cod_token IS NOT NULL AND cod_confirmed_at IS NULL AND status IN ('Confirmed','Packed','Ready to ship')
         AND cod_sent_at < datetime('now', ?)`, `-${FLOW.codConfirmHours} hours`);
    for (const o of late) {
      transaction(() => moveOrder(o, "On Hold", { force: true, who: "system", holdReasons: ["cod_unconfirmed"], detail: `COD not confirmed within ${FLOW.codConfirmHours} hours` }));
    }
    if (FLOW.autoCancel) {
      const stale = all(
        `SELECT * FROM orders WHERE status = 'On Hold' AND hold_reasons = ? AND cod_confirmed_at IS NULL AND hold_at < datetime('now', ?)`,
        JSON.stringify(["cod_unconfirmed"]), `-${FLOW.autoCancelHours} hours`);
      for (const o of stale) {
        transaction(() => moveOrder(o, "Cancelled", { who: "system", note: "COD not confirmed by buyer in time" }));
      }
    }
  } catch (e) {
    console.error("sweepOrders:", e);
  }
}

/* ---------- RTO ke steps (seller) ---------- */
// initiated -> transit -> received (order cancel, prepaid refund shuru) -> qc -> restocked / written off.
// "qc" ke baad seller Good ya Damaged chunta hai (rtoQc). Stock sirf quality check ke baad wapas aata hai.
export function advanceRto(o, by) {
  const i = RTO_STEPS.findIndex(([c]) => c === o.rto_stage);
  if (!o.rto_stage || i < 0) return { error: "Is order mein RTO ka agla step nahi hai." };
  if (o.rto_stage === "qc" || o.rto_stage === "restocked") return { error: o.rto_stage === "qc" ? "Quality check ka result chuniye (Good ya Damaged)." : "RTO poora ho chuka hai." };
  const [code, label] = RTO_STEPS[i + 1];
  transaction(() => {
    run("UPDATE orders SET rto_stage = ? WHERE id = ?", code, o.id);
    addEvent(o.id, { kind: "rto", code, label, by, who: "seller" });
    if (code === "received") {
      // Parcel wapas aa gaya: order cancel. Prepaid hai to refund shuru, COD mein kuch refund nahi. Stock abhi nahi (quality check ke baad).
      run(
        `UPDATE orders SET status = 'Cancelled', pay_status = ?, cancel_reason = 'Delivery failed: returned to seller (RTO)', cancelled_by = 'system',
           cancelled_at = datetime('now'), rto_received_at = datetime('now') WHERE id = ?`,
        o.pay_status === "Paid" ? "Refund Initiated" : "Cancelled", o.id
      );
      addEvent(o.id, { code: "Cancelled", label: "Order cancelled (RTO received)", detail: o.pay_status === "Paid" ? "Refund started" : "", by, who: "system" });
      try { issueCreditNote({ orderId: o.id, kind: "rto", reason: "Delivery failed: returned to seller (RTO)" }); } catch (e) { console.error("credit note:", e.message); }
      const sh = one("SELECT s.freight, c.rto_charge FROM shipments s LEFT JOIN couriers c ON c.id = s.courier_id WHERE s.order_id = ?", o.id);
      if (sh) {
        run("INSERT OR IGNORE INTO order_costs (order_id, freight) VALUES (?, ?)", o.id, sh.freight || 0);
        run("UPDATE order_costs SET return_freight = ?, rto_charge = ?, updated_at = datetime('now') WHERE order_id = ?", sh.freight || 0, sh.rto_charge || 0, o.id);
      }
      notify(one("SELECT * FROM orders WHERE id = ?", o.id), "RTO");
    }
  });
  return { ok: true, label, received: code === "received" };
}

// Quality check ka result: "good" = stock wapas, "damaged" = write off (note zaroori)
export function rtoQc(o, result, note, by) {
  if (o.rto_stage !== "qc") return { error: "Pehle quality check wale step tak aayein." };
  const n = String(note || "").trim();
  if (result === "damaged" && n.length < 3) return { error: "Damaged hai to note likhein." };
  if (!["good", "damaged"].includes(result)) return { error: "Good ya Damaged chuniye." };
  transaction(() => {
    if (result === "good") for (const it of all("SELECT * FROM order_items WHERE order_id = ?", o.id)) if (it.product_id) giveStock(it.product_id, it.variant_id, it.qty);
    run("UPDATE orders SET rto_stage = 'restocked', rto_qc = ?, rto_note = ? WHERE id = ?", result, n || null, o.id);
    addEvent(o.id, { kind: "rto", code: "restocked", label: result === "good" ? "Restocked" : "Written off (damaged)", detail: n, by, who: "seller" });
    run("INSERT OR IGNORE INTO order_costs (order_id) VALUES (?)", o.id);
    run("UPDATE order_costs SET note = ?, updated_at = datetime('now') WHERE order_id = ?", result === "good" ? "Restocked" : `Written off: ${n}`, o.id);
  });
  return { ok: true };
}
// RTO ki shuruaat ke event ke saath (moveOrder "RTO" ke baad)
export function rtoStartEvent(orderId, by) {
  if (one("SELECT 1 x FROM order_events WHERE order_id = ? AND kind = 'rto' AND code = 'initiated'", orderId)) return;
  addEvent(orderId, { kind: "rto", code: "initiated", label: RTO_STEPS[0][1], by, who: "seller" });
}
