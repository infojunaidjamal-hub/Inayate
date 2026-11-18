import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { categoryTree } from "@/lib/catalog";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProduct() {
  await requirePerm("products");
  return (
    <>
      <h2>New product</h2>
      <ProductForm tree={categoryTree()} />
      <p><Link href="/seller/products">← Back</Link></p>
    </>
  );
}
