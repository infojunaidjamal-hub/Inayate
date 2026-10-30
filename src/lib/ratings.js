import { all } from "@/lib/db";

// Products ki list mein rating (jaise "4.3") aur reviews ki ginti jodta hai
export function withRatings(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const rs = all(
    `SELECT product_id, AVG(rating) a, COUNT(*) c FROM reviews WHERE product_id IN (${ids.map(() => "?").join(",")}) GROUP BY product_id`,
    ...ids
  );
  const m = new Map(rs.map((r) => [r.product_id, r]));
  return rows.map((r) => {
    const x = m.get(r.id);
    return { ...r, rating: x ? (Math.round(x.a * 10) / 10).toFixed(1) : null, rating_count: x ? x.c : 0 };
  });
}
