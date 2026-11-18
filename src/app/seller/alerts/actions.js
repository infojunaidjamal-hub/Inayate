"use server";
import { revalidatePath } from "next/cache";
import { run } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export async function markDone(form) {
  await requirePerm("products");
  run("UPDATE stock_alerts SET status = 'done' WHERE id = ?", Number(form.get("id")));
  revalidatePath("/seller/alerts");
}

export async function markProductDone(form) {
  await requirePerm("products");
  run("UPDATE stock_alerts SET status = 'done' WHERE product_id = ? AND status = 'waiting'", Number(form.get("id")));
  revalidatePath("/seller/alerts");
}
