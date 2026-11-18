// Phase 4: shipping ka hisaab. PURE code (database nahi), isliye browser aur server dono yahi use karte hain.
// Dummy numbers badalne ho to seller panel mein Courier partners page par badlo. Rules yahan hain.
export const LOGI = {
  promiseDays: 5,     // delivery ka vaada: itne din (partner ke zyada se zyada din isse kam ho)
  packDays: 1,        // + 1 din packing
  expressFee: 199,    // Express ka flat paisa (buyer se)
  defaultZone: "D",   // pincode list na ho to
  divisor: 5000,      // volumetric weight = L x W x H / 5000
  flatMaxKg: 3,       // flat rate wale partner ki limit
};

export const ZONES = {
  A: ["Local", "Surat"],
  B: ["Within state", "Gujarat"],
  C: ["Metro", "Mumbai, Delhi, Pune"],
  D: ["Rest of India", "Other states"],
  E: ["Far zone", "North-East, J&K"],
};

// Charged weight (kg): actual aur volumetric mein se bada, 500 g ke upar round, kam se kam 0.5 kg
export function chargedKg(weightG, l, w, h) {
  const act = (Number(weightG) || 0) / 1000;
  const vol = ((Number(l) || 0) * (Number(w) || 0) * (Number(h) || 0)) / LOGI.divisor;
  const ch = Math.max(act, vol);
  return Math.max(0.5, Math.ceil(ch / 0.5 - 1e-9) * 0.5);
}

// Ek partner ka freight (rupaye). null = nahi ho sakta (flat rate wale par 3 kg se upar)
export function freightFor(partner, rate, kg) {
  if (!rate) return null;
  let base;
  if (partner.flat) { if (kg > LOGI.flatMaxKg) return null; base = rate.first; }
  else base = rate.first + (Math.round(kg / 0.5) - 1) * rate.extra;
  return Math.round(base * (1 + (Number(partner.extraPct) || 0) / 100));
}

// partners: [{ id, name, exp, codFee, noCod, flat, extraPct, ndr, rates: { A: {first,extra,dmin,dmax} } }]
// served: optional { [id]: { zone, cod, prepaid } }  (pincode list ke hisaab se). Na ho to zone se chalta hai.
// Wapas: rows (har partner ke liye) + rec (recommended id ya null)
export function rankPartners({ partners, zone, kg, cod = false, express = false, served = null }) {
  const rows = partners.map((p) => {
    const sv = served ? served[p.id] : null;
    const z = sv?.zone || zone;
    const rate = p.rates?.[z] || null;
    let why = "";
    if (served && !sv) why = "Does not serve";
    else if (!rate) why = "Does not serve";
    else if (cod && (p.noCod || (sv && !sv.cod))) why = "No COD here";
    else if (served && sv && !sv.prepaid) why = "Does not serve";
    else if (express && !p.exp) why = "No express";
    const fr = !why ? freightFor(p, rate, kg) : null;
    if (!why && fr === null) why = "Over 3 kg";
    const ok = !why;
    const cf = ok && cod ? p.codFee || 0 : 0;
    return { id: p.id, name: p.name, ok, why, zone: z, fr, cod: ok ? cf : null, total: ok ? fr + cf : null, dmin: rate?.dmin ?? null, dmax: rate?.dmax ?? null, meets: ok && rate.dmax <= LOGI.promiseDays, p };
  });
  const good = rows.filter((r) => r.ok);
  let rec = null;
  if (good.length) {
    if (express) rec = good.slice().sort((a, b) => a.dmax - b.dmax || a.total - b.total)[0];
    else {
      const m = good.filter((r) => r.meets);
      rec = (m.length ? m : good).slice().sort((a, b) => a.total - b.total || a.dmax - b.dmax)[0];
    }
  }
  return { rows, rec: rec ? rec.id : null };
}

// Aaj + din (Sunday chhodkar)
export function addWorkDays(from, n) {
  const d = new Date(from);
  while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); if (new Date(d.getTime() + 330 * 60000).getUTCDay() !== 0) n--; }
  return d;
}
export const fmtShort = (d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
export const daysText = (r) => (!r ? "-" : r.dmin === r.dmax ? String(r.dmax) : `${r.dmin} to ${r.dmax}`);
