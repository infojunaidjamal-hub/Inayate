import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { withCovers } from "@/lib/images";
import ProductCard from "@/components/ProductCard";
import { toggleWishlist } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist – Inayate Bags" };

export default async function Wishlist() {
  const user = await getUser();
  if (!user) redirect("/login");
  const list = withCovers(all(
    `SELECT p.* FROM wishlist w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = ? AND p.status = 'Active' ORDER BY p.id`, user.id));
  return (
    <>
      <h2>My Wishlist</h2>
      {list.length === 0 && <p className="mut">Wishlist khali hai. Kisi product ke page par "♡ Wishlist" dabayein. <Link href="/products" style={{ textDecoration: "underline" }}>Products dekhein</Link></p>}
      <div className="grid">
        {list.map((p) => (
          <div key={p.id}>
            <ProductCard p={p} />
            <form action={toggleWishlist} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn o s" style={{ width: "100%" }}>Wishlist se hatayein</button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
