// "Watch The Style Story": seller ki chhoti vertical videos jo home page par dikhti hain. SIRF SERVER par chalta hai.
import { all } from "@/lib/db";
import { SITE } from "@/lib/site";
import { VISIBLE_SQL, withVariantInfo } from "@/lib/catalog";
import { withCovers } from "@/lib/images";
import { withRatings } from "@/lib/ratings";
import { inr } from "@/lib/money";

export const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_SEC = 8;
export const MAX_SEC = 20;
export const MAX_LIVE = 6;    // home page par ek saath kitni videos
export const MAX_TOTAL = 30;  // kul kitni videos save ho sakti hain
export const LINE_MAX = 24;   // caption line ke akshar

// Video ka shape (chaurai : unchai). Sirf yahin badlo: abhi 3:4 (seedhi / portrait). Chaudi video ke liye { w: 4, h: 3 }, lambi reel ke liye { w: 9, h: 16 }.
// Home ke card, fullscreen viewer, upload ki jaanch aur seller page sab isi se chalte hain.
export const RATIO = { w: 3, h: 4 };
export const RATIO_LABEL = `${RATIO.w}:${RATIO.h}`;
export const RATIO_TOL = 0.1; // 10% tak ka farak chalega (1080x1440, 960x1280, 720x960, 480x640 sab 3:4 hain)
export const RATIO_HINT = { "3:4": "For example 1080×1440 or 480×640.", "4:3": "For example 1440×1080 or 640×480.", "9:16": "For example 1080×1920." }[`${RATIO.w}:${RATIO.h}`] || "";
export const ratioOk = (w, h) => w > 0 && h > 0 && Math.abs(w / h - RATIO.w / RATIO.h) / (RATIO.w / RATIO.h) <= RATIO_TOL;

export const cleanLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, LINE_MAX);

// Home page ke liye: sirf wahi videos jinka product dikhne layak hai (Active, stock mein, category chhupi nahi).
// Price, MRP, % off aur rating hamesha product se taaza padhte hain, isliye purane nahi hote.
export function homeVideos() {
  try {
    const vids = all(
      `SELECT v.id, v.file, v.poster, v.line1, v.line2, v.product_id
       FROM style_videos v JOIN products p ON p.id = v.product_id
       WHERE v.live = 1 AND p.status = 'Active' AND p.stock > 0 AND ${VISIBLE_SQL}
       ORDER BY v.position, v.id LIMIT ${MAX_LIVE}`
    );
    if (!vids.length) return [];
    const ids = [...new Set(vids.map((v) => v.product_id))];
    const rows = withRatings(withVariantInfo(withCovers(all(`SELECT * FROM products WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids))));
    const byId = new Map(rows.map((p) => [p.id, p]));
    return vids.map((v) => {
      const p = byId.get(v.product_id);
      const desc = String(p.description || "").replace(/\s+/g, " ").trim();
      return {
        id: v.id, src: v.file, poster: v.poster || null, line1: v.line1, line2: v.line2,
        product: {
          id: p.id, name: p.name, price: p.price, mrp: p.mrp, off: p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
          image: p.image || null, rating: p.rating || null, count: p.rating_count || 0, hasVariants: !!p.has_variants,
          desc: desc.length > 160 ? desc.slice(0, 157) + "…" : desc, href: `/products/${p.id}`,
        },
      };
    });
  } catch (e) {
    console.error("homeVideos:", e.message); // table abhi nahi bani ho to home page na toote
    return [];
  }
}

// "Free shipping" wali line SITE ki setting se (Phase 4: freeShippingAbove = 0 matlab har order par free)
export const shipNote = () => (SITE.freeShippingAbove > 0 ? `Free shipping above ${inr(SITE.freeShippingAbove)}` : "Free shipping on every order");
