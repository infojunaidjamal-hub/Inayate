import { all } from "@/lib/db";

// Products ki list mein rating (jaise "4.1") aur ratings ki ginti jodta hai.
// Seller ki "starting rating" aur asli buyers ki ratings milkar:  (start x startCount + asli ratings ka jod) / (startCount + asli ginti)
export function combineRating(p, realAvg = 0, realCount = 0) {
  const s = Number(p.rating_start) || 0;
  const c = Math.max(0, Math.round(Number(p.rating_start_count) || 0));
  const useStart = s > 0 && c > 0;
  const n = realCount + (useStart ? c : 0);
  if (!n) return { rating: null, rating_count: 0, rating_initial: false };
  const sum = realAvg * realCount + (useStart ? s * c : 0);
  return { rating: (Math.round((sum / n) * 10) / 10).toFixed(1), rating_count: n, rating_initial: useStart };
}

export function withRatings(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const rs = all(
    `SELECT product_id, AVG(rating) a, COUNT(*) c FROM reviews WHERE product_id IN (${ids.map(() => "?").join(",")}) GROUP BY product_id`,
    ...ids
  );
  const m = new Map(rs.map((r) => [r.product_id, r]));
  return rows.map((r) => {
    if (r.show_rating === 0) return { ...r, rating: null, rating_count: 0, rating_initial: false };
    const x = m.get(r.id);
    return { ...r, ...combineRating(r, x ? x.a : 0, x ? x.c : 0) };
  });
}
