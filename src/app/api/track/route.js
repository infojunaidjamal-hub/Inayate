import { all, one } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { STAFF } from "@/lib/perms";
import { readCart } from "@/lib/cart";
import { logEvent, visitorId } from "@/lib/track";

export const dynamic = "force-dynamic";

// Dukaan ke pages se events yahan aate hain (navigator.sendBeacon). Naam, phone, IP kuch save nahi hota.
// Har cheez yahan check hoti hai kyunki ye public POST endpoint hai.
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;
const hits = new Map(); // visitor -> [count, window start]: ek visitor 10 minute mein 300 events se zyada nahi bhej sakta
const okRate = (v, n) => {
  const now = Date.now(), h = hits.get(v);
  if (!h || now - h[1] > 600000) { hits.set(v, [n, now]); if (hits.size > 5000) hits.clear(); return true; }
  h[0] += n;
  return h[0] <= 300;
};
const done = () => new Response(null, { status: 204 });

export async function POST(req) {
  try {
    if (BOT.test(req.headers.get("user-agent") || "")) return done();
    const raw = await req.text();
    if (raw.length > 8000) return done();
    let body;
    try { body = JSON.parse(raw); } catch { return done(); }
    const evs = Array.isArray(body?.events) ? body.events.slice(0, 40) : [];
    if (!evs.length) return done();

    // dukaan ka staff khud dekh raha ho to ginti mein nahi
    const user = await getUser();
    if (user && STAFF.includes(user.role)) return done();

    const visitor = await visitorId({ create: true });
    if (!visitor || !okRate(visitor, evs.length)) return done();

    // sirf sach mein maujood products
    const ids = [...new Set(evs.map((e) => Number(e?.product)).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 40);
    const real = new Set(ids.length ? all(`SELECT id FROM products WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids).map((r) => r.id) : []);

    for (const e of evs) {
      const type = String(e?.type || "");
      const pid = Number(e?.product);
      if ((type === "impression" || type === "product_view") && real.has(pid)) {
        logEvent(type, { product_id: pid, visitor });
      } else if (type === "checkout_started") {
        // ek visit mein ek baar (30 minute ke andar dobara nahi)
        if (one("SELECT 1 x FROM shop_events WHERE event = 'checkout_started' AND visitor = ? AND ts > datetime('now','-30 minutes') LIMIT 1", visitor)) continue;
        logEvent("checkout_started", { visitor });
        for (const it of await readCart()) logEvent("checkout_line", { product_id: it.id, variant_id: it.v || null, visitor });
      } else if (type === "payment_failed" && e?.order) {
        const o = one("SELECT id, total FROM orders WHERE order_no = ?", String(e.order).slice(0, 20));
        if (o) logEvent("payment_failed", { order_id: o.id, value: Math.round(o.total), visitor });
      }
    }
  } catch (err) {
    console.error("api/track:", err);
  }
  return done();
}
