import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { siteUrl } from "@/lib/seo";
import { allBlogCategories, getPostById, linkedProductIds, productPickerList, isLive } from "@/lib/blog";
import { deleteBlog } from "../actions";
import BlogForm from "../BlogForm";
import DeleteButton from "../DeleteButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post edit – Seller Panel" };

export default async function EditPost({ params, searchParams }) {
  await requirePerm("blog");
  const { id } = await params;
  const { saved } = await searchParams;
  const post = getPostById(id);
  if (!post) notFound();
  return (
    <>
      <h2>Edit: {post.title}</h2>
      {saved && <p className="bf-ok" role="status">Post save ho gaya.</p>}
      <BlogForm key={post.updated_at} post={post} linked={linkedProductIds(post.id)} categories={allBlogCategories()} products={productPickerList()} siteUrl={siteUrl()} />
      <p>
        <Link href="/seller/blog">← Wapas</Link> · <Link href={`/blog/${post.slug}`} target="_blank">{isLive(post) ? "Shop par dekhein ↗" : "Preview ↗"}</Link>
      </p>
      <form action={deleteBlog} style={{ marginTop: 18 }}>
        <input type="hidden" name="id" value={post.id} />
        <DeleteButton />
      </form>
    </>
  );
}
