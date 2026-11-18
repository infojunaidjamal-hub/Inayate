import { NextResponse } from "next/server";
import { all, one } from "@/lib/db";
import { withCovers } from "@/lib/images";
import { VISIBLE_SQL } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Search suggestions: /api/search?q=ivo  ->  naam, category ya material mein milne wale products (photo ke saath)
export async function GET(request) {
  try {
    const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 60);
    const words = q
      .split(/\s+/)
      .map((w) => w.replace(/[%_]/g, ""))
      .filter(Boolean)
      .slice(0, 5);

    if (q.length < 2 || words.length === 0) {
      return NextResponse.json({ products: [], total: 0 });
    }

    // har shabd name / category / material mein hona chahiye (chhote-bade akshar ka farak nahi)
    const cond = words.map(() => "(name LIKE ? OR category LIKE ? OR material LIKE ?)").join(" AND ");
    const params = words.flatMap((w) => [`%${w}%`, `%${w}%`, `%${w}%`]);
    const where = `status = 'Active' AND ${VISIBLE_SQL} AND ${cond}`;

    const total = one(`SELECT COUNT(*) c FROM products WHERE ${where}`, ...params).c;
    const rows = all(
      `SELECT id, name, category, price, mrp, stock, colour_main, colour_dark
       FROM products WHERE ${where}
       ORDER BY CASE WHEN LOWER(name) LIKE ? THEN 0 ELSE 1 END, id
       LIMIT 6`,
      ...params,
      `${words[0].toLowerCase()}%`
    );

    return NextResponse.json({ products: withCovers(rows), total });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ products: [], total: 0 }, { status: 500 });
  }
}
