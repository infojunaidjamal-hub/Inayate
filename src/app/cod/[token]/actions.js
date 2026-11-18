"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, transaction } from "@/lib/db";
import { confirmCod, moveOrder, CANCEL_REASONS } from "@/lib/orderFlow";

const getOrder = (token) => (/^[a-f0-9]{32}$/.test(token) ? one("SELECT * FROM orders WHERE cod_token = ?", token) : null);

export async function codConfirm(form) {
  const token = String(form.get("token") || "");
  const o = getOrder(token);
  if (o && ["On Hold", "Confirmed", "Packed", "Ready to ship"].includes(o.status)) confirmCod(o);
  revalidatePath("/", "layout");
  redirect(`/cod/${token}`);
}

export async function codCancel(form) {
  const token = String(form.get("token") || "");
  const o = getOrder(token);
  const reason = CANCEL_REASONS.includes(String(form.get("reason"))) ? String(form.get("reason")) : "Cancelled from COD confirm link";
  if (o && ["On Hold", "Confirmed", "Packed", "Ready to ship"].includes(o.status)) {
    transaction(() => moveOrder(o, "Cancelled", { who: "buyer", force: true, note: reason }));
  }
  revalidatePath("/", "layout");
  redirect(`/cod/${token}`);
}
