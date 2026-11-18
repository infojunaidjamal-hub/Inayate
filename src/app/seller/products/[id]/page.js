import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { one } from "@/lib/db";
import { imagesOf } from "@/lib/images";
import { categoryTree, variantsOf } from "@/lib/catalog";
import ProductForm from "../ProductForm";
import { duplicateProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params, searchParams }) {
  await requirePerm("products");
  const { id } = await params;
  const { imgerr } = await searchParams;
  const product = one("SELECT * FROM products WHERE id = ?", Number(id));
  if (!product) notFound();
  return (
    <>
      <h2>Edit: {product.name}</h2>
      {imgerr && <p className="err">Product saved, but: {imgerr}</p>}
      <ProductForm product={product} tree={categoryTree()} images={imagesOf(product.id)} variants={variantsOf(product.id)} />
      <form action={duplicateProduct} style={{ margin: "12px 0" }}>
        <input type="hidden" name="id" value={product.id} />
        <button className="btn o">Duplicate product</button>
        <span className="mut" style={{ marginLeft: 10, fontSize: 12 }}>Makes a Draft copy with the same options, prices and photos (stock 0).</span>
      </form>
      <p><Link href="/seller/products">← Back</Link> · <Link href={`/products/${product.id}`}>View in store ↗</Link></p>
    </>
  );
}
