"use server";
import { all } from "@/lib/db";
import { withCovers } from "@/lib/images";
import { withRatings } from "@/lib/ratings";

// Recently viewed: browser product ids bhejta hai, yahan se unka chhota data milta hai
export async function recentProducts(ids) {
  const clean = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 12);
  if (!clean.length) return [];
  const rows = withRatings(withCovers(all(`SELECT * FROM products WHERE status = 'Active' AND id IN (${clean.map(() => "?").join(",")})`, ...clean)));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return clean.map((id) => byId.get(id)).filter(Boolean).map((p) => ({
    id: p.id, name: p.name, price: p.price, mrp: p.mrp, image: p.image, rating: p.rating, colour_main: p.colour_main, colour_dark: p.colour_dark,
  }));
}
