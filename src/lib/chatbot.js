// Phase 9: chatbot ka dimaag. SIRF SERVER par chalta hai. Ye AI model nahi, saaf rules hain:
// jawab hamesha store ki asli settings (SITE), products, seller ke sikhaye jawab aur buyer ke apne orders se aate hain.
// Kuch pata na ho to ye kabhi andaza nahi lagata, seedha WhatsApp par bhej deta hai.
// Buyer jis bhasha mein likhta hai (English, Hinglish, Hindi, Gujarati) usi mein jawab milta hai (shabd: lib/chatStrings.js).
import { all, one, run, inr } from "@/lib/db";
import { SITE } from "@/lib/site";
import { VISIBLE_SQL, withVariantInfo, LOW_STOCK_AT } from "@/lib/catalog";
import { withCovers } from "@/lib/images";
import { FWD, estimateDelivery } from "@/lib/orderFlow";
import { EXPIRY_MIN, returnWindowOpen } from "@/lib/orders";
import { detectIntent, extractOrderNo, budgetOf, searchWords, norm, bestScore, FUZZY } from "@/lib/chatbotIntent";
import { POLICY, customAnswer } from "@/lib/faq";
import { t, dur, hoursText, resolveLang, chipsFor, STATUS, dateLocale } from "@/lib/chatStrings";
import { waLink } from "@/lib/whatsapp";

const text = (s) => ({ type: "text", text: s });
const links = (items) => ({ type: "links", items });
export const waUrl = (msg) => waLink(String(msg).slice(0, 400));

// "Pata nahi" par: buyer ka sawaal WhatsApp message mein pehle se likha hua (hamari team ke liye English mein)
export function handoverBlocks(L, question, intro, orderNo = "") {
  const msg = `Hi ${SITE.name}! I was chatting on your website.${orderNo ? ` Order: ${orderNo}.` : ""} ${question ? `My question: ${question}` : "I need help."}`;
  return [
    text(intro || t(L, "handoverIntro")),
    links([{ label: t(L, "waBtn"), href: waUrl(msg), kind: "wa" }]),
    text(t(L, "hours", { hours: hoursText(L, SITE.hours) })),
  ];
}

/* ---------------- Products ---------------- */
function findProducts(message) {
  const words = searchWords(message);
  const max = budgetOf(message);
  const base = `status = 'Active' AND ${VISIBLE_SQL}` + (max ? " AND price <= ?" : "");
  const bp = max ? [max] : [];
  const cols = ["name", "category", "subcategory", "material", "colours"];
  const one1 = "(" + cols.map((c) => `${c} LIKE ?`).join(" OR ") + ")";
  const like = (w) => cols.map(() => `%${w.replace(/[%_]/g, "")}%`);
  const order = "ORDER BY (stock > 0) DESC, id DESC LIMIT 4";
  let rows = [], exact = true;
  if (words.length) {
    rows = all(`SELECT * FROM products WHERE ${base} AND ${words.map(() => one1).join(" AND ")} ${order}`, ...bp, ...words.flatMap(like));
    if (!rows.length && words.length > 1) {
      exact = false;
      rows = all(`SELECT * FROM products WHERE ${base} AND (${words.map(() => one1).join(" OR ")}) ${order}`, ...bp, ...words.flatMap(like));
    }
  } else {
    rows = all(`SELECT * FROM products WHERE ${base} ${order}`, ...bp);
  }
  const items = withVariantInfo(withCovers(rows)).map((p) => ({
    id: p.id, name: p.name, price: p.price, mrp: p.mrp, from: !!(p.has_variants && p.price_max > p.price),
    stock: p.stock, low: p.stock > 0 && p.stock < LOW_STOCK_AT, image: p.image || null, href: `/products/${p.id}`,
  }));
  return { items, exact, words, max };
}

/* ---------------- Orders (sirf padhna, sirf buyer ke apne) ---------------- */
const ETA_FOR = ["Confirmed", "Packed", "Ready to ship", "Picked up", "In transit", "Out for delivery", "NDR", "Shipped"];

// Return ki aakhri tarikh, buyer ki bhasha ke tarike se (orders.js ke returnLastDate jaisa hi hisaab)
function returnLast(o, L) {
  if (!o.delivered_at) return "";
  const d = new Date(String(o.delivered_at).replace(" ", "T") + "Z");
  d.setDate(d.getDate() + SITE.returnDays);
  return d.toLocaleDateString(dateLocale(L), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function noteFor(o, L) {
  if (o.status === "Awaiting Payment") return t(L, "noteAwaitPay", { min: EXPIRY_MIN });
  if (o.status === "On Hold") return t(L, "noteHold");
  if (o.status === "NDR") return t(L, "noteNdr");
  if (o.status === "Delivered") {
    if (!returnWindowOpen(o)) return t(L, "noteRetClosed");
    const last = returnLast(o, L);
    return last ? t(L, "noteRetUntil", { date: last }) : t(L, "noteRetDays", { days: SITE.returnDays });
  }
  if (o.status === "Cancelled" && o.pay_method !== "COD" && o.pay_status === "Paid") return t(L, "noteCancelRefund", { days: dur(L, SITE.refundDays) });
  return "";
}

function orderCard(o, L) {
  const items = all("SELECT name, qty, variant_label FROM order_items WHERE order_id = ?", o.id);
  const names = items.slice(0, 2).map((i) => `${i.name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.qty}`).join(", ") + (items.length > 2 ? ` +${items.length - 2}` : "");
  const idx = o.status === "NDR" ? 5 : FWD.findIndex(([c]) => c === o.status);
  const ret = one("SELECT status FROM returns WHERE order_id = ?", o.id);
  const eta = ETA_FOR.includes(o.status) ? estimateDelivery(o).toLocaleDateString(dateLocale(L), { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";
  const names2 = STATUS[L] || STATUS.en;
  return {
    no: o.order_no,
    status: L === "en" ? o.status : names2[o.status] || o.status, // tag
    heading: L === "en" ? STATUS.en[o.status] || o.status : "", // doosri bhasha mein tag hi poora jumla hai
    good: ["Delivered", "Refunded", "Return Approved"].includes(o.status),
    bad: ["Cancelled", "NDR", "RTO", "RTO Done", "Return Rejected"].includes(o.status),
    steps: idx >= 0 ? { done: idx + 1, total: FWD.length } : null,
    items: names,
    total: o.total,
    pay: o.pay_method === "COD" ? t(L, "payCod") : o.pay_status === "Paid" ? t(L, "payPaid") : t(L, "payOnline"),
    courier: o.courier || "",
    awb: o.awb || "",
    eta,
    note: noteFor(o, L),
    ret: ret ? t(L, "retReq", { s: ret.status }) : "",
    href: o.status === "Awaiting Payment" ? `/pay/${o.order_no}` : `/order/${o.order_no}`,
  };
}
const orderLabels = (L) => ({ order: t(L, "cOrder"), view: t(L, "cView"), courier: t(L, "cCourier"), awb: t(L, "cAwb"), eta: t(L, "cEta") });

function orderAnswer(q, user, L) {
  if (!user) {
    return {
      blocks: [
        text(t(L, "loginNeeded")),
        links([{ label: t(L, "loginBtn"), href: `/login?next=${encodeURIComponent("/account/orders")}`, kind: "primary" }]),
        text(t(L, "loginPrivacy")),
      ],
    };
  }
  const no = extractOrderNo(q);
  if (no) {
    const o = one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", no, user.id); // sirf apna order
    if (!o) return { handover: true, blocks: [text(t(L, "orderNotFound", { no })), ...handoverBlocks(L, q, t(L, "teamLook"), no).slice(1)] };
    return { blocks: [text(t(L, "hereOrder")), { type: "orders", labels: orderLabels(L), items: [orderCard(o, L)] }] };
  }
  const rows = all("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 3", user.id);
  if (!rows.length) return { blocks: [text(t(L, "noOrders")), links([{ label: t(L, "shopNow"), href: "/products", kind: "primary" }])] };
  return {
    blocks: [
      text(t(L, rows.length === 1 ? "hereOrder1" : "hereOrders")),
      { type: "orders", labels: orderLabels(L), items: rows.map((o) => orderCard(o, L)) },
      links([{ label: t(L, "allOrders"), href: "/account/orders", kind: "link" }]),
    ],
  };
}

/* ---------------- Seller ke sikhaye hue jawab ---------------- */
// Pehle se likha hua sawaal bilkul wahi ho to hamesha chalega (built-in jawab se bhi pehle). Milta-julta sawaal sirf tab
// chalega jab bot ko woh samajh hi nahi aaya tha (intent khali), taaki "how to cancel order" jaise sawaal galat jawab na paayein.
function taughtAnswer(q, intent) {
  let rows;
  try { rows = all("SELECT * FROM chat_answers WHERE active = 1"); } catch { return null; }
  let best = null, top = 0;
  for (const r of rows) {
    const s = bestScore(q, [r.question, ...String(r.phrases || "").split("\n")].filter(Boolean));
    if (s > top) { top = s; best = r; }
  }
  return best && top >= (intent ? 0.999 : FUZZY) ? best : null;
}

// Buyer ki bhasha mein jawab likha ho to wahi, nahi to seller ka main (English) jawab
function taughtBlocks(r, L) {
  const body = (L !== "en" && String(r["answer_" + L] || "").trim()) || r.answer;
  const out = String(body).split(/\n+/).map((x) => x.trim()).filter(Boolean).slice(0, 8).map(text);
  if (r.link_url && r.link_label) out.push(links([{ label: r.link_label, href: r.link_url, kind: /wa\.me/.test(r.link_url) ? "wa" : "link" }]));
  return out;
}

/* ---------------- Main ---------------- */
// lang: chat window ke bhasha-chunav se (en/hl/hi/gu ya "auto"); hint: pichhli bhasha
export function answer({ message, user, lang, hint }) {
  const q = String(message || "").trim().slice(0, 300);
  const L = resolveLang(q, lang, hint);
  const t0 = norm(q);
  const out = (intent, blocks, extra = {}) => ({ intent, lang: L, answered: true, handover: false, chips: extra.handover ? [] : chipsFor(L, !!user), blocks, ...extra });
  if (!t0) return out("empty", [text(t(L, "empty"))]);

  const intent = detectIntent(q);
  const orderNo = extractOrderNo(q);

  if (intent === "human") return out(intent, handoverBlocks(L, "", t(L, "humanIntro")), { handover: true });
  if (intent === "complaint") return out(intent, [text(t(L, "complaint")), ...handoverBlocks(L, q, "", orderNo).slice(1)], { handover: true });
  if (intent === "order") { const r = orderAnswer(q, user, L); return out("order", r.blocks, { handover: !!r.handover }); }

  const taught = taughtAnswer(t0, intent);
  if (taught) {
    try { run("UPDATE chat_answers SET uses = uses + 1 WHERE id = ?", taught.id); } catch {}
    return out("taught", taughtBlocks(taught, L));
  }

  const custom = customAnswer(t0);
  if (custom) return out("faq", [...custom.text.map(text), ...(custom.links.length ? [links(custom.links)] : [])]);

  if (POLICY[intent]) {
    const p = POLICY[intent](L);
    return out(intent, [...p.text.map(text), ...(p.links.length ? [links(p.links)] : [])]);
  }
  if (intent === "thanks") return out(intent, [text(t(L, "thanks"))]);
  if (intent === "bye") return out(intent, [text(t(L, "bye", { brand: SITE.name }))]);
  if (intent === "greet") return out(intent, [text(t(L, user ? "greetUser" : "greetGuest", { brand: SITE.name }))]);

  // product ya samajh na aaya: products mein dhoondho
  const f = findProducts(q);
  const useful = f.items.length && (intent === "product" || (f.exact && f.words.length));
  if (useful) {
    const lead = !f.exact ? t(L, "close") : f.max ? t(L, "foundUnder", { max: inr(f.max) }) : t(L, "found");
    const shopQ = f.words.join(" ");
    const labels = { inStock: t(L, "inStock"), outStock: t(L, "outStock"), onlyLeft: t(L, "onlyLeft", { n: "{n}" }), from: t(L, "fromPrice", { p: "{p}" }) };
    return out("product", [text(lead), { type: "products", labels, items: f.items }, links([{ label: t(L, "seeAll"), href: "/products" + (shopQ ? `?q=${encodeURIComponent(shopQ)}` : ""), kind: "link" }])]);
  }
  if (intent === "product") {
    return out("product", [text(f.max ? t(L, "noMatchUnder", { max: inr(f.max) }) : t(L, "noMatch")), links([{ label: t(L, "browse"), href: "/products", kind: "primary" }]), ...handoverBlocks(L, q, t(L, "askTeam")).slice(0, 2)], { handover: true });
  }

  // samajh nahi aaya: andaza nahi, seedha insaan ke paas
  return { intent: intent || "unknown", lang: L, answered: false, handover: true, chips: [], blocks: handoverBlocks(L, q) };
}

// Kuch bigad jaye to bhi buyer ko rasta mile
export const fallbackReply = (q, L = "en") => ({ intent: "error", lang: L, answered: false, handover: true, chips: [], blocks: handoverBlocks(L, q, t(L, "errorIntro")) });

/* ---------------- Log (seller ke "Chatbot log" page ke liye) ---------------- */
export function logChat({ userId, question, intent, answered, handover, lang }) {
  if (SITE.chatbot?.log === false) return;
  try {
    const q = String(question || "").replace(/\d{9,}/g, "••••").slice(0, 300); // mobile / card jaise lambe number chhupa do
    run("INSERT INTO chat_logs (user_id, question, intent, answered, handover, lang) VALUES (?,?,?,?,?,?)", userId || null, q, intent || null, answered ? 1 : 0, handover ? 1 : 0, lang || null);
    const g = globalThis, day = new Date().toISOString().slice(0, 10);
    if (g.__chatPruned !== day) { run("DELETE FROM chat_logs WHERE created_at < datetime('now', '-90 days')"); g.__chatPruned = day; } // 90 din se purane hata do
  } catch (e) {
    console.error("logChat:", e);
  }
}
