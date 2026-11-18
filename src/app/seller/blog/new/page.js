import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { siteUrl } from "@/lib/seo";
import { allBlogCategories, productPickerList } from "@/lib/blog";
import BlogForm from "../BlogForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Naya post – Seller Panel" };

export default async function NewPost() {
  await requirePerm("blog");
  return (
    <>
      <h2>Naya blog post</h2>
      <BlogForm categories={allBlogCategories()} products={productPickerList()} siteUrl={siteUrl()} />
      <p><Link href="/seller/blog">← Wapas</Link></p>
    </>
  );
}
