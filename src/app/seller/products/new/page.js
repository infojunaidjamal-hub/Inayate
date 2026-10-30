import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { all } from "@/lib/db";
import SellerNav from "@/components/SellerNav";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProduct() {
  await requireSeller();
  const categories = all("SELECT DISTINCT category FROM products ORDER BY category").map((r) => r.category);
  return (
    <>
      <SellerNav />
      <h2>Naya product</h2>
      <ProductForm categories={categories} />
      <p><Link href="/seller/products">← Wapas</Link></p>
    </>
  );
}
