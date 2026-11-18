"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { saveBusiness, GSTIN_RE } from "@/lib/invoices";

const back = (k, m) => redirect(`/seller/settings?${k}=${encodeURIComponent(m)}`);

export async function saveBusinessSettings(form) {
  const me = await requirePerm("settings");
  const g = (k, max = 200) => String(form.get(k) || "").replace(/\s+/g, " ").trim().slice(0, max);
  const v = {
    name: g("name", 80), legal: g("legal", 100), gstin: g("gstin", 15).toUpperCase(), address: g("address", 250),
    state: g("state", 40), prefix: g("prefix", 6).toUpperCase(), defaultHsn: g("defaultHsn", 8).replace(/\D/g, ""),
  };
  if (v.name.length < 2) back("err", "Store ka naam likhein.");
  if (v.legal.length < 2) back("err", "Business ka poora (legal) naam likhein.");
  if (v.gstin && !GSTIN_RE.test(v.gstin)) back("err", "GSTIN sahi format mein nahi hai (15 akshar, jaise 24ABCDE1234F1Z5). Abhi nahi hai to khali chhod dein.");
  if (v.address.length < 8) back("err", "Poora pata likhein.");
  if (!v.state) back("err", "State chuniye. Isi se CGST + SGST ya IGST tay hota hai.");
  if (!/^[A-Z0-9]{2,6}$/.test(v.prefix)) back("err", "Invoice prefix 2 se 6 akshar / ank ka hona chahiye (jaise INB).");
  if (![4, 6, 8].includes(v.defaultHsn.length)) back("err", "Default HSN 4, 6 ya 8 ank ka hona chahiye (bags ke liye aam taur par 4202).");
  saveBusiness(v);
  logAct(me, "Business settings badle", `GSTIN ${v.gstin || "-"}, state ${v.state}, prefix ${v.prefix}`);
  revalidatePath("/seller/invoices");
  back("ok", "Settings save ho gayi. Naye invoice isi se banenge. Jo invoice ban chuke hain unka number aur rakam nahi badalti.");
}
