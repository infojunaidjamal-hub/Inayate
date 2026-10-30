import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { imagesOf } from "@/lib/images";
import SellerNav from "@/components/SellerNav";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params, searchParams }) {
  await requireSeller();
  const { id } = await params;
  const { imgerr } = await searchParams;
  const product = one("SELECT * FROM products WHERE id = ?", Number(id));
  if (!product) notFound();
  const categories = all("SELECT DISTINCT category FROM products ORDER BY category").map((r) => r.category);
  return (
    <>
      <SellerNav />
      <h2>Edit: {product.name}</h2>
      {imgerr && <p className="err">Product save ho gaya, par: {imgerr}</p>}
      <ProductForm product={product} categories={categories} images={imagesOf(product.id)} />
      <p><Link href="/seller/products">← Wapas</Link> · <Link href={`/products/${product.id}`}>Store par dekhein ↗</Link></p>
    </>
  );
}
