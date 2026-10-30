import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { all } from "@/lib/db";
import { withCovers } from "@/lib/images";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: `Products – ${SITE.name}` };

export default async function Products({ searchParams }) {
  const { cat = "All", q = "" } = await searchParams;
  const term = String(q).trim().slice(0, 60);
  const cats = ["All", ...all("SELECT DISTINCT category FROM products WHERE status = 'Active' ORDER BY category").map((r) => r.category)];

  let sql = "SELECT * FROM products WHERE status = 'Active'";
  const params = [];
  if (cat !== "All") {
    sql += " AND category = ?";
    params.push(cat);
  }
  if (term) {
    sql += " AND (name LIKE ? OR category LIKE ? OR material LIKE ? OR description LIKE ?)";
    const like = `%${term}%`;
    params.push(like, like, like, like);
  }
  sql += " ORDER BY id";
  const list = withCovers(all(sql, ...params));

  return (
    <>
      <h2>{term ? `Results for "${term}"` : "Our Bags"}</h2>
      {term && (
        <p className="mut" style={{ marginTop: -8 }}>
          {list.length} {list.length === 1 ? "product" : "products"} found.{" "}
          <Link href="/products" style={{ textDecoration: "underline" }}>Clear search</Link>
        </p>
      )}
      <div className="tabs">
        {cats.map((c) => (
          <Link key={c} href={c === "All" ? "/products" : `/products?cat=${encodeURIComponent(c)}`} className={c === cat ? "on" : ""}>{c}</Link>
        ))}
      </div>
      <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {list.length === 0 && (
        <p className="mut">
          {term ? "Is naam ka koi product nahi mila. Kuch aur shabd try karein." : "Is category mein abhi koi product nahi hai."}
        </p>
      )}
    </>
  );
}
