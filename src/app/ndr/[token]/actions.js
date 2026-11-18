"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ndrCaseOf, applyNdrReply } from "@/lib/logistics";

export async function ndrReply(prev, form) {
  const token = String(form.get("token") || "");
  const c = ndrCaseOf(token);
  if (!c) return { error: "Ye link sahi nahi hai." };
  const r = applyNdrReply(c, {
    same: form.get("same") !== "0",
    line: form.get("line"), pin: form.get("pin"),
    date: form.get("date"), phone: form.get("phone"),
  });
  if (r.error) return { error: r.error };
  revalidatePath("/", "layout");
  redirect(`/ndr/${token}?done=1`);
}
