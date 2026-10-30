"use server";
import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { verifyPassword, startSession } from "@/lib/auth";
import { clientIp, minutesLocked, recordFail, clearFails, lockMessage } from "@/lib/throttle";

export async function sellerLogin(prev, form) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const acct = `seller:${email}`, ipKey = `ip:${await clientIp()}`;
  const m = Math.max(minutesLocked(acct), minutesLocked(ipKey));
  if (m) return { error: lockMessage(m) };
  const u = one("SELECT * FROM users WHERE email = ? AND role = 'seller'", email);
  if (!u || !verifyPassword(password, u.password_hash)) {
    recordFail(acct, 5);
    recordFail(ipKey, 20);
    return { error: "Email ya password galat hai." };
  }
  clearFails(acct);
  await startSession(u.id);
  redirect("/seller");
}
