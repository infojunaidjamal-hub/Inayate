import { all } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      return NextResponse.json({ products: [] });
    }

    const searchTerm = `%${q}%`;

    // Database se title aur category dono mein search karein (Case Insensitive)
    const products = all(
      "SELECT id, title, price, images FROM products WHERE status = 'Active' AND (LOWER(title) LIKE ? OR LOWER(category) LIKE ?) LIMIT 5",
      [searchTerm, searchTerm]
    );

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}