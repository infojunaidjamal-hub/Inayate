// Phase 4: courier partners, pincode check, shipment (booking), tracking (simulate), NDR buyer reply. SIRF SERVER par chalta hai.
import { all, one, run, transaction } from "@/lib/db";
import { moveOrder, addEvent, ndrMaxOf, advanceRto } from "@/lib/orderFlow";
import { LOGI, ZONES, chargedKg, rankPartners, addWorkDays, fmtShort } from "@/lib/shipMath";
import { pincodeOf } from "@/lib/address";

/* ---------- partners ---------- */
const shape = (c, rates) => ({
  id: c.id, name: c.name, active: !!c.active, exp: !!c.express, codFee: c.cod_fee, noCod: !!c.no_cod, flat: !!c.flat, extraPct: c.extra_pct,
  ndr: c.ndr_attempts, rtoCharge: c.rto_charge, mode: c.mode,
  rates: Object.fromEntries(rates.filter((r) => r.courier_id === c.id).map((r) => [r.zone, { first: r.first, extra: r.extra, dmin: r.dmin, dmax: r.dmax }])),
});
export function loadPartners(activeOnly = true) {
  const rates = all("SELECT * FROM courier_rates");
  return all(`SELECT * FROM couriers ${activeOnly ? "WHERE active = 1" : ""} ORDER BY position, id`).map((c) => shape(c, rates));
}
export const pincodeListExists = () => !!one("SELECT 1 x FROM courier_pincodes LIMIT 1");

// Is pincode ko kaun kaun sa partner deta hai: { [courierId]: { zone, cod, prepaid } }
export function servedBy(pin) {
  const m = {};
  for (const r of all("SELECT p.* FROM courier_pincodes p JOIN couriers c ON c.id = p.courier_id WHERE p.pincode = ? AND c.active = 1", String(pin))) m[r.courier_id] = { zone: r.zone, cod: !!r.cod, prepaid: !!r.prepaid, city: r.city };
  return m;
}

/* ---------- parcel (weight aur box) ---------- */
// items: [{ product_id, qty }]. Missing weight = 500 g. Box: sabse lamba L aur W, height jodte hain.
export function parcelOfItems(items) {
  let weight = 0, l = 0, w = 0, h = 0, missing = false;
  for (const it of items) {
    const p = it.product_id ? one("SELECT weight_g, box_l, box_w, box_h FROM products WHERE id = ?", it.product_id) : null;
    const q = Number(it.qty) || 1;
    if (!p || !p.weight_g) missing = true;
    weight += (p?.weight_g || 500) * q;
    if (!p?.box_l || !p?.box_w || !p?.box_h) missing = true;
    l = Math.max(l, p?.box_l || 0); w = Math.max(w, p?.box_w || 0); h += (p?.box_h || 0) * q;
  }
  return { weight_g: weight, l, w, h, missing };
}

/* ---------- buyer: pincode check, date aur shipping method ---------- */
const isoDay = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
const when = (days) => { const d = addWorkDays(Date.now(), days + LOGI.packDays); return { by: fmtShort(d), iso: isoDay(d) }; };

// Wapas: { bad } | { deliverable:false } | { deliverable:true, cod, prepaidOnly, standard:{by,iso}, express:{by,iso,fee}|null, open }
export function quote(pin, { cod = false, kg = 0.5 } = {}) {
  pin = String(pin || "").trim();
  if (!/^[1-9]\d{5}$/.test(pin)) return { bad: true };
  if (!pincodeListExists()) {
    // Pincode list abhi upload nahi hui: sab jagah delivery maani jati hai (purana behaviour)
    return { deliverable: true, cod: true, open: true, standard: when(LOGI.promiseDays), express: null };
  }
  const served = servedBy(pin);
  const partners = loadPartners();
  const prepaid = rankPartners({ partners, zone: LOGI.defaultZone, kg, cod: false, served });
  if (!prepaid.rec) return { deliverable: false };
  const codRank = rankPartners({ partners, zone: LOGI.defaultZone, kg, cod: true, served });
  const rec = (r) => r.rows.find((x) => x.id === r.rec);
  const std = rec(cod && codRank.rec ? codRank : prepaid);
  const ex = rankPartners({ partners, zone: LOGI.defaultZone, kg, cod: cod && !!codRank.rec, express: true, served });
  const er = ex.rec ? rec(ex) : null;
  return {
    deliverable: true, cod: !!codRank.rec, prepaidOnly: !codRank.rec, open: false,
    standard: when(std.dmax),
    express: er ? { ...when(er.dmax), fee: LOGI.expressFee } : null,
  };
}

/* ---------- seller: shipment book karna ---------- */
const clean = (v, max = 60) => String(v ?? "").replace(/[\u0000-\u001F]/g, "").trim().slice(0, max);

export function shipmentOf(orderId) { return one("SELECT * FROM shipments WHERE order_id = ?", orderId); }
export const shipEvents = (shipmentId) => all("SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY id", shipmentId);
export function addShipEvent(shipmentId, orderId, code, label, detail = "") {
  run("INSERT INTO shipment_events (shipment_id, order_id, code, label, detail) VALUES (?,?,?,?,?)", shipmentId, orderId, code, label, detail || null);
}

// input: { courierId, zone, weight_g, l, w, h, awb, pickup, override }  (kharcha server par dobara nikalta hai, browser ka bheja number nahi manta)
export function bookShipment(o, input, me) {
  if (!["Packed", "Ready to ship"].includes(o.status)) return { error: "Shipment sirf Packed ya Ready to ship order ka ban sakta hai." };
  const partners = loadPartners();
  const chosen = partners.find((p) => p.id === Number(input.courierId));
  if (!chosen) return { error: "Courier partner chuniye." };
  const num = (v) => Math.max(0, Math.round(Number(v) || 0));
  const weight_g = num(input.weight_g), l = num(input.l), w = num(input.w), h = num(input.h);
  if (weight_g < 1) return { error: "Weight (gram) likhein." };
  const awb = clean(input.awb, 40);
  if (awb.length < 3) return { error: "Tracking ID (AWB) likhein." };
  const kg = chargedKg(weight_g, l, w, h);
  const cod = o.pay_method === "COD";
  const express = o.ship_method === "express";
  const pin = pincodeOf(o);
  const served = pincodeListExists() ? servedBy(pin) : null;
  const zone = ZONES[input.zone] ? input.zone : LOGI.defaultZone;
  const rank = rankPartners({ partners, zone, kg, cod, express, served });
  const row = rank.rows.find((r) => r.id === chosen.id);
  if (!row?.ok) return { error: `${chosen.name}: ${row?.why || "nahi ho sakta"}.` };
  const override = clean(input.override, 120);
  if (rank.rec && rank.rec !== chosen.id && !override) return { error: "Aapne recommended partner se alag partner chuna hai. Wajah chuniye." };
  const pickup = clean(input.pickup, 20) || null;

  transaction(() => {
    const had = shipmentOf(o.id);
    run(
      `INSERT INTO shipments (order_id, courier_id, courier_name, awb, zone, pickup_date, weight_g, box_l, box_w, box_h, charged_kg, freight, cod_fee, recommended_id, override_reason, ndr_max)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(order_id) DO UPDATE SET courier_id=excluded.courier_id, courier_name=excluded.courier_name, awb=excluded.awb, zone=excluded.zone, pickup_date=excluded.pickup_date,
         weight_g=excluded.weight_g, box_l=excluded.box_l, box_w=excluded.box_w, box_h=excluded.box_h, charged_kg=excluded.charged_kg, freight=excluded.freight, cod_fee=excluded.cod_fee,
         recommended_id=excluded.recommended_id, override_reason=excluded.override_reason, ndr_max=excluded.ndr_max`,
      o.id, chosen.id, chosen.name, awb, row.zone, pickup, weight_g, l, w, h, kg, row.fr, cod ? chosen.codFee : 0, rank.rec, override || null, chosen.ndr
    );
    const sh = shipmentOf(o.id);
    run("UPDATE orders SET ndr_max = ? WHERE id = ?", chosen.ndr, o.id);
    run("INSERT OR IGNORE INTO order_costs (order_id) VALUES (?)", o.id);
    run("UPDATE order_costs SET freight = ?, updated_at = datetime('now') WHERE order_id = ?", row.fr, o.id);
    if (o.status === "Packed") {
      const r = moveOrder(o, "Ready to ship", { by: me, courier: chosen.name, awb });
      if (r.error) throw new Error(r.error);
    } else {
      run("UPDATE orders SET courier = ?, awb = ? WHERE id = ?", chosen.name, awb, o.id);
    }
    if (override) addEvent(o.id, { kind: "note", code: "override", label: "Partner chosen by seller", detail: `${chosen.name}: ${override}`, by: me, who: "seller" });
    addShipEvent(sh.id, o.id, had ? "updated" : "booked", had ? "Shipment updated" : "Shipment booked", `${chosen.name} · ${awb}`);
  });
  return { ok: true };
}

export function markPickedUp(o, me) {
  if (o.status !== "Ready to ship") return { error: "Pehle shipment book karke Ready to ship karein." };
  const sh = shipmentOf(o.id);
  let err = null;
  transaction(() => {
    const r = moveOrder(o, "Picked up", { by: me });
    if (r.error) { err = r.error; return; }
    if (sh) addShipEvent(sh.id, o.id, "picked", "Picked up", "Marked by seller");
  });
  return err ? { error: err } : { ok: true };
}

/* ---------- tracking: Refresh aur Simulate (localhost) ---------- */
export const SIM = {
  picked: ["Picked up", "Picked up"], transit: ["In transit", "In transit"], ofd: ["Out for delivery", "Out for delivery"],
  delivered: ["Delivered", "Delivered"], failed: ["NDR", "Delivery failed (NDR)"], rto_received: ["RTO", "RTO received"],
};
const CHAIN = ["Ready to ship", "Picked up", "In transit", "Out for delivery", "Delivered"];

export function refreshTracking(ids) {
  const list = ids?.length ? ids : all("SELECT id FROM shipments").map((r) => r.id);
  for (const id of list) run("UPDATE shipments SET refreshed_at = datetime('now') WHERE id = ?", id);
  return list.length;
}

// Courier ka event nakal karna. Beech ke steps apne aap ho jate hain (jaise Ready to ship se seedha Delivered).
export function simulateEvent(o, key, reason, me) {
  const sh = shipmentOf(o.id);
  if (!sh) return { error: "Is order ka shipment abhi book nahi hua." };
  if (!SIM[key]) return { error: "Ye event nahi pata." };
  let err = null;
  transaction(() => {
    let cur = o;
    const step = (to, extra = {}) => {
      const r = moveOrder(cur, to, { by: me, ...extra });
      if (r.error) { err = r.error; return false; }
      cur = r.order;
      addShipEvent(sh.id, o.id, to, SIM[Object.keys(SIM).find((k) => SIM[k][0] === to)]?.[1] || to, "Courier update (simulated)");
      return true;
    };
    if (key === "failed") {
      if (cur.status === "NDR") { err = "Is order par pehle se delivery fail darj hai. Re-attempt karein."; return; }
      let i = CHAIN.indexOf(cur.status);
      if (i < 0) { err = `Order "${cur.status}" par hai, yahan se delivery fail nahi ho sakta.`; return; }
      while (CHAIN[i] !== "Out for delivery") { i++; if (!step(CHAIN[i])) return; }
      const reasonText = clean(reason, 80) || "Customer not available";
      const r = moveOrder(cur, "NDR", { by: me, note: reasonText });
      if (r.error) { err = r.error; return; }
      addShipEvent(sh.id, o.id, "NDR", `Delivery failed (NDR): ${reasonText}`, `Attempt ${r.order.ndr_attempts} of ${ndrMaxOf(r.order)}`);
      if (r.order.status === "RTO") addShipEvent(sh.id, o.id, "RTO", "RTO initiated", "All attempts failed");
      return;
    }
    if (key === "rto_received") {
      if (cur.status === "NDR") { if (!step("RTO")) return; addShipEvent(sh.id, o.id, "RTO", "RTO initiated", "Marked by seller"); cur = one("SELECT * FROM orders WHERE id = ?", o.id); }
      if (cur.rto_stage == null) { err = "RTO tabhi hota hai jab delivery fail ho chuki ho."; return; }
      let guard = 0;
      while (cur.rto_stage && !["received", "qc", "restocked"].includes(cur.rto_stage) && guard++ < 4) {
        const a = advanceRto(cur, me); if (a.error) { err = a.error; return; }
        cur = one("SELECT * FROM orders WHERE id = ?", o.id);
      }
      addShipEvent(sh.id, o.id, "RTO", "RTO received", "Order cancelled automatically");
      return;
    }
    const target = SIM[key][0];
    const from = CHAIN.indexOf(cur.status), to = CHAIN.indexOf(target);
    if (cur.status === "NDR" && target === "Out for delivery") { if (step("Out for delivery")) return; return; }
    if (from < 0) { err = `Order "${cur.status}" par hai, isliye ye event nahi ho sakta.`; return; }
    if (to <= from) { err = `Order pehle se "${cur.status}" par hai.`; return; }
    for (let i = from + 1; i <= to; i++) if (!step(CHAIN[i])) return;
  });
  return err ? { error: err } : { ok: true };
}

/* ---------- NDR ---------- */
export function reattempt(o, me) {
  if (o.status !== "NDR") return { error: "Ye order NDR par nahi hai." };
  let err = null;
  transaction(() => {
    const r = moveOrder(o, "Out for delivery", { by: me, detail: `Re-attempt ${o.ndr_attempts + 1} of ${ndrMaxOf(o)} booked` });
    if (r.error) { err = r.error; return; }
    const sh = shipmentOf(o.id);
    if (sh) addShipEvent(sh.id, o.id, "reattempt", "Re-attempt booked", `Attempt ${o.ndr_attempts + 1} of ${ndrMaxOf(o)}`);
    run("UPDATE ndr_cases SET status = 'reattempt' WHERE order_id = ? AND status IN ('open','replied')", o.id);
  });
  return err ? { error: err } : { ok: true };
}

// Seller ne apne taraf se address badla (NDR page)
export function changeAddress(o, line, pin, me) {
  line = clean(line, 200); pin = clean(pin, 6);
  if (line.length < 5) return { error: "Poora address likhein." };
  if (!/^[1-9]\d{5}$/.test(pin)) return { error: "6 ank ka pincode likhein." };
  const addr = `${line.replace(/[,\s]+$/, "")}, ${pin}`;
  run("UPDATE orders SET ship_address = ? WHERE id = ?", addr, o.id);
  addEvent(o.id, { kind: "note", code: "address", label: "Delivery address changed", detail: addr, by: me, who: "seller" });
  return { ok: true };
}

export const ndrCaseOf = (token) => (/^[a-f0-9]{24}$/.test(String(token)) ? one("SELECT * FROM ndr_cases WHERE token = ?", token) : null);

// Buyer ne link se jawab diya. reply: { same: bool, line, pin, date (YYYY-MM-DD), phone }
export function applyNdrReply(c, reply) {
  const o = one("SELECT * FROM orders WHERE id = ?", c.order_id);
  if (!o || o.status !== "NDR" || c.status !== "open") return { error: "Is order par ab jawab ki zaroorat nahi hai." };
  const today = isoDay(new Date());
  const max = isoDay(new Date(Date.now() + 8 * 864e5));
  const date = String(reply.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > max) return { error: "Agle 7 din mein se ek tareekh chuniye." };
  const phone = String(reply.phone || "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: "Sahi 10 ank ka mobile number likhein." };
  let newAddr = null;
  if (!reply.same) {
    const line = clean(reply.line, 200), pin = clean(reply.pin, 6);
    if (line.length < 5) return { error: "Naya poora address likhein." };
    if (!/^[1-9]\d{5}$/.test(pin)) return { error: "Naya pincode 6 ank ka hona chahiye." };
    const q = quote(pin, { cod: o.pay_method === "COD" });
    if (q.deliverable === false) return { error: "Is pincode par hum abhi delivery nahi karte." };
    if (o.pay_method === "COD" && q.cod === false) return { error: "Is pincode par Cash on Delivery nahi hai." };
    newAddr = `${line.replace(/[,\s]+$/, "")}, ${pin}`;
  }
  transaction(() => {
    if (newAddr) run("UPDATE orders SET ship_address = ? WHERE id = ?", newAddr, o.id);
    if (phone !== String(o.ship_mobile || "").replace(/\D/g, "").slice(-10)) run("UPDATE orders SET ship_mobile = ? WHERE id = ?", phone, o.id);
    run("UPDATE ndr_cases SET status = 'replied', reply = ?, replied_at = datetime('now') WHERE id = ?", JSON.stringify({ same: !newAddr, address: newAddr, date, phone }), c.id);
    addEvent(o.id, { kind: "note", code: "ndr_reply", label: "Buyer replied to delivery failure", detail: `${newAddr ? "New address. " : "Same address. "}Try again on ${date}`, who: "buyer" });
  });
  return { ok: true, date };
}

/* ---------- Partners: seller ke badlav ---------- */
export function savePartner(id, f) {
  const n = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));
  const name = clean(f.name, 60);
  if (name.length < 2) return { error: "Partner ka naam likhein." };
  const vals = [name, n(f.cod_fee, 0, 1000), n(f.rto_charge, 0, 5000), Math.min(50, Math.max(0, Number(f.extra_pct) || 0)), n(f.ndr_attempts, 1, 5), f.express ? 1 : 0, f.flat ? 1 : 0, f.no_cod ? 1 : 0];
  if (id) run("UPDATE couriers SET name=?, cod_fee=?, rto_charge=?, extra_pct=?, ndr_attempts=?, express=?, flat=?, no_cod=? WHERE id=?", ...vals, id);
  else id = Number(run("INSERT INTO couriers (name, cod_fee, rto_charge, extra_pct, ndr_attempts, express, flat, no_cod, position) VALUES (?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(position),0)+1 FROM couriers))", ...vals).lastInsertRowid);
  return { ok: true, id };
}
export function saveRates(courierId, rows) {
  transaction(() => {
    run("DELETE FROM courier_rates WHERE courier_id = ?", courierId);
    for (const z of Object.keys(ZONES)) {
      const r = rows?.[z];
      if (!r || r.first === "" || r.first == null) continue;
      const first = Math.max(0, Math.round(Number(r.first) || 0));
      const dmin = Math.max(1, Math.round(Number(r.dmin) || 1));
      const dmax = Math.max(dmin, Math.round(Number(r.dmax) || dmin));
      run("INSERT INTO courier_rates (courier_id, zone, first, extra, dmin, dmax) VALUES (?,?,?,?,?,?)", courierId, z, first, Math.max(0, Math.round(Number(r.extra) || 0)), dmin, dmax);
    }
  });
}

export const SAMPLE_PINS = [["395009", "Surat (Adajan)", "A"], ["395007", "Surat (Vesu)", "A"], ["380001", "Ahmedabad", "B"], ["390001", "Vadodara", "B"], ["400001", "Mumbai", "C"], ["110001", "New Delhi", "C"], ["411001", "Pune", "C"], ["560001", "Bengaluru", "D"], ["700001", "Kolkata", "D"], ["781001", "Guwahati", "E"], ["190001", "Srinagar", "E"]];
// Sirf testing ke liye: dummy pincodes, har partner ko jahan uski rate hai
export function loadSamplePincodes() {
  let n = 0;
  transaction(() => {
    for (const c of all("SELECT id, no_cod FROM couriers")) {
      const zones = new Set(all("SELECT zone FROM courier_rates WHERE courier_id = ?", c.id).map((r) => r.zone));
      for (const [pin, city, zone] of SAMPLE_PINS) {
        if (!zones.has(zone)) continue;
        run("INSERT OR IGNORE INTO courier_pincodes (courier_id, pincode, city, zone, cod, prepaid) VALUES (?,?,?,?,?,1)", c.id, pin, city, zone, c.no_cod ? 0 : 1);
        n++;
      }
    }
  });
  return n;
}

// Excel / CSV se aayi rows (Pincode, City, Zone, COD, Prepaid). Purani rows update hoti hain, kuch delete nahi hota.
export function importPincodes(courierId, table) {
  const rows = Array.isArray(table) ? table : [];
  if (rows.length < 2) return { error: "File khali hai." };
  const head = rows[0].map((h) => String(h || "").trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const iP = col("pincode"), iC = col("city"), iZ = col("zone"), iCod = col("cod"), iPre = col("prepaid");
  if (iP < 0 || iZ < 0) return { error: "Columns chahiye: Pincode, City, Zone, COD, Prepaid." };
  const yn = (v, d) => (v == null || String(v).trim() === "" ? d : /^(y|yes|1|true|haan)/i.test(String(v).trim()) ? 1 : 0);
  let added = 0, updated = 0; const bad = [];
  if (rows.length > 60001) return { error: "Ek baar mein 60,000 se zyada rows nahi." };
  transaction(() => {
    rows.slice(1).forEach((r, k) => {
      const pin = String(r[iP] ?? "").trim().replace(/\.0$/, "");
      const zone = String(r[iZ] ?? "").trim().toUpperCase();
      if (!pin && !zone) return;
      if (!/^[1-9]\d{5}$/.test(pin) || !ZONES[zone]) { if (bad.length < 10) bad.push(`Row ${k + 2}: ${pin || "?"} / ${zone || "?"}`); return; }
      const ex = one("SELECT 1 x FROM courier_pincodes WHERE courier_id = ? AND pincode = ?", courierId, pin);
      run("INSERT INTO courier_pincodes (courier_id, pincode, city, zone, cod, prepaid) VALUES (?,?,?,?,?,?) ON CONFLICT(courier_id, pincode) DO UPDATE SET city=excluded.city, zone=excluded.zone, cod=excluded.cod, prepaid=excluded.prepaid",
        courierId, pin, iC >= 0 ? clean(r[iC], 60) : null, zone, yn(iCod >= 0 ? r[iCod] : null, 1), yn(iPre >= 0 ? r[iPre] : null, 1));
      if (ex) updated++; else added++;
    });
  });
  return { ok: true, added, updated, bad };
}

/* ---------- costs ---------- */
export function costRecord(orderId) {
  const c = one("SELECT * FROM order_costs WHERE order_id = ?", orderId);
  if (!c) return null;
  return { ...c, total: (c.freight || 0) + (c.cod_fee || 0) + (c.return_freight || 0) + (c.rto_charge || 0) };
}
