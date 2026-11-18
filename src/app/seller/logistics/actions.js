"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { logAct } from "@/lib/activity";
import { readTable } from "@/lib/xlsxread";
import { refundOrder } from "@/lib/refunds";
import { advanceRto, rtoQc } from "@/lib/orderFlow";
import {
  savePartner, saveRates, loadSamplePincodes, importPincodes, bookShipment, markPickedUp, simulateEvent, refreshTracking,
  reattempt, changeAddress, servedBy,
} from "@/lib/logistics";
import { LOGI, ZONES } from "@/lib/shipMath";

const done = () => revalidatePath("/seller", "layout");

/* ---------- Courier partners ---------- */
export async function partnerSave(prev, form) {
  const me = await requirePerm("logistics");
  const id = Number(form.get("id") || 0);
  const r = savePartner(id, {
    name: form.get("name"), cod_fee: form.get("cod_fee"), rto_charge: form.get("rto_charge"), extra_pct: form.get("extra_pct"),
    ndr_attempts: form.get("ndr_attempts"), express: form.get("express") === "1", flat: form.get("flat") === "1", no_cod: form.get("no_cod") === "1",
  });
  if (r.error) return { error: r.error };
  logAct(me, id ? "Courier partner badla" : "Courier partner jodha", String(form.get("name") || ""));
  done();
  return { ok: true, id: r.id };
}

export async function ratesSave(prev, form) {
  const me = await requirePerm("logistics");
  const id = Number(form.get("id"));
  if (!one("SELECT id FROM couriers WHERE id = ?", id)) return { error: "Partner nahi mila." };
  const rows = {};
  for (const z of Object.keys(ZONES)) rows[z] = { first: form.get(`first_${z}`), extra: form.get(`extra_${z}`), dmin: form.get(`dmin_${z}`), dmax: form.get(`dmax_${z}`) };
  saveRates(id, rows);
  const p = await partnerSave(null, form); // COD fee, RTO charge, attempts, express (naam wahi rehta hai)
  if (p.error) return p;
  logAct(me, "Rate card save kiya", `Partner #${id}`);
  done();
  return { ok: "Rate card save ho gaya." };
}

export async function partnerToggle(form) {
  const me = await requirePerm("logistics");
  const id = Number(form.get("id"));
  run("UPDATE couriers SET active = 1 - active WHERE id = ?", id);
  logAct(me, "Courier partner on/off", `Partner #${id}`);
  done();
}

export async function pincodesUpload(prev, form) {
  const me = await requirePerm("logistics");
  const id = Number(form.get("id"));
  if (!one("SELECT id FROM couriers WHERE id = ?", id)) return { error: "Partner nahi mila." };
  const file = form.get("file");
  if (!file || typeof file === "string" || !file.size) return { error: "Pehle Excel (.xlsx) ya CSV file chuniye." };
  if (file.size > 6_000_000) return { error: "File 6 MB se badi hai." };
  let rows;
  try { rows = readTable(Buffer.from(await file.arrayBuffer()), file.name); } catch (e) { return { error: e?.message || "File padh nahi payi." }; }
  const r = importPincodes(id, rows);
  if (r.error) return r;
  logAct(me, "Pincodes upload kiye", `Partner #${id}: ${r.added} naye, ${r.updated} update`);
  done();
  return { ok: `${r.added} naye, ${r.updated} update.${r.bad.length ? ` Galat rows chhod di: ${r.bad.join("; ")}` : ""}` };
}

export async function samplePincodes() {
  const me = await requirePerm("logistics");
  const n = loadSamplePincodes();
  logAct(me, "Sample pincodes load kiye", `${n} rows`);
  done();
}

// Pincode checker (Courier partners page)
export async function pincodeCheck(courierId, pin) {
  await requirePerm("logistics");
  const p = String(pin || "").trim();
  if (!/^\d{6}$/.test(p)) return { bad: "Enter 6 digits" };
  const row = one("SELECT * FROM courier_pincodes WHERE courier_id = ? AND pincode = ?", Number(courierId), p);
  const c = one("SELECT name FROM couriers WHERE id = ?", Number(courierId));
  if (!row) return { bad: `${p} is not in ${c?.name || "this"} list` };
  const rate = one("SELECT * FROM courier_rates WHERE courier_id = ? AND zone = ?", Number(courierId), row.zone);
  if (!rate) return { bad: `${p} · ${c.name} does not serve zone ${row.zone}` };
  return { ok: `${p} · Zone ${row.zone} (${row.city || "-"}) · COD ${row.cod ? "yes" : "no"} · Prepaid ${row.prepaid ? "yes" : "no"} · ${rate.dmin === rate.dmax ? rate.dmax : rate.dmin + " to " + rate.dmax} day(s)` };
}

/* ---------- Shipment ---------- */
function orderFor(no) { return one("SELECT * FROM orders WHERE order_no = ?", String(no || "")); }

export async function shipmentBook(prev, form) {
  const me = await requirePerm("ship");
  const o = orderFor(form.get("order_no"));
  if (!o) return { error: "Order nahi mila." };
  const r = bookShipment(o, {
    courierId: form.get("courier_id"), zone: form.get("zone"), weight_g: form.get("weight_g"), l: form.get("l"), w: form.get("w"), h: form.get("h"),
    awb: form.get("awb"), pickup: form.get("pickup"), override: form.get("override"),
  }, me);
  if (r.error) return r;
  logAct(me, "Shipment book kiya", o.order_no);
  done();
  redirect(`/seller/orders/${o.order_no}?ok=${encodeURIComponent("Shipment save ho gaya")}`);
}

export async function pickedUp(form) {
  const me = await requirePerm("ship");
  const o = orderFor(form.get("order_no"));
  if (!o) redirect("/seller/orders");
  const r = markPickedUp(o, me);
  if (!r.error) logAct(me, "Picked up mark kiya", o.order_no);
  done();
  redirect(`/seller/orders/${o.order_no}?${r.error ? "err=" + encodeURIComponent(r.error) : "ok=" + encodeURIComponent("Picked up mark ho gaya")}`);
}

/* ---------- Tracking ---------- */
export async function trackingRefresh(prev, form) {
  await requirePerm("ship");
  const id = Number(form.get("id") || 0);
  refreshTracking(id ? [id] : null);
  done();
  return { ok: "No new update from the courier (manual partners)" };
}

export async function trackingSimulate(prev, form) {
  const me = await requirePerm("ship");
  const o = orderFor(form.get("order_no"));
  if (!o) return { error: "Order nahi mila." };
  const key = String(form.get("event") || "");
  if ((key === "delivered") && !(await import("@/lib/perms")).can(me.role, "deliver")) return { error: "Delivered mark karne ki ijazat aapke role ko nahi hai." };
  const r = simulateEvent(o, key, form.get("reason"), me);
  if (r.error) return r;
  logAct(me, "Courier event (simulate)", `${o.order_no}: ${key}`);
  done();
  const n = orderFor(o.order_no);
  return { ok: key === "failed" ? "NDR case ban gaya. Message NDR page par taiyaar hai." : key === "rto_received" ? "RTO received: order cancel ho gaya, stock quality check ke baad." : "Event add ho gaya.", status: n.status };
}

/* ---------- NDR ---------- */
export async function ndrReattempt(form) {
  const me = await requirePerm("ship");
  const o = orderFor(form.get("order_no"));
  let msg = "";
  if (o) { const r = reattempt(o, me); msg = r.error ? "err=" + encodeURIComponent(r.error) : "ok=" + encodeURIComponent("Re-attempt book ho gaya"); if (!r.error) logAct(me, "NDR re-attempt", o.order_no); }
  done();
  redirect(`/seller/ndr?${msg}`);
}

export async function ndrAddress(prev, form) {
  const me = await requirePerm("ship");
  const o = orderFor(form.get("order_no"));
  if (!o) return { error: "Order nahi mila." };
  const r = changeAddress(o, form.get("line"), form.get("pin"), me);
  if (r.error) return r;
  logAct(me, "NDR address badla", o.order_no);
  done();
  return { ok: "Address badal gaya." };
}

/* ---------- RTO ---------- */
export async function rtoNext(form) {
  const me = await requirePerm("ship");
  const o = orderFor(form.get("order_no"));
  let msg = "";
  if (o) {
    const r = advanceRto(o, me);
    if (r.error) msg = "err=" + encodeURIComponent(r.error);
    else {
      logAct(me, "RTO step", `${o.order_no}: ${r.label}`);
      msg = "ok=" + encodeURIComponent(r.label);
      if (r.received) {
        // Prepaid order: refund apne aap shuru (Razorpay keys ho to asli refund, nahi to "Refund baaki" mein rehta hai)
        const fresh = orderFor(o.order_no);
        if (fresh.pay_status === "Refund Initiated" && fresh.pay_method !== "COD") {
          const rf = await refundOrder(fresh, "Automatic: RTO received");
          msg = "ok=" + encodeURIComponent(rf.error ? `Order cancel ho gaya. Refund abhi automatic nahi hua (${rf.error}). Returns > Refunds mein baaki dikhega.` : "Order cancel ho gaya aur refund shuru ho gaya.");
        } else msg = "ok=" + encodeURIComponent("Order cancel ho gaya (COD: koi refund nahi).");
      }
    }
  }
  done();
  redirect(`/seller/returns?tab=rto&${msg}`);
}

export async function rtoQcDecide(form) {
  const me = await requirePerm("ship");
  const o = orderFor(form.get("order_no"));
  let msg = "err=" + encodeURIComponent("Order nahi mila");
  if (o) {
    const r = rtoQc(o, String(form.get("result")), form.get("note"), me);
    msg = r.error ? "err=" + encodeURIComponent(r.error) : "ok=" + encodeURIComponent(form.get("result") === "good" ? "Stock wapas jud gaya." : "Write off ho gaya.");
    if (!r.error) logAct(me, "RTO quality check", `${o.order_no}: ${form.get("result")}`);
  }
  done();
  redirect(`/seller/returns?tab=rto&${msg}`);
}
