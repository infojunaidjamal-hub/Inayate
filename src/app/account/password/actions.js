"use server";
import { redirect } from "next/navigation";
import { one, run } from "@/lib/db";
import { getUser, verifyPassword, hashPassword, checkPassword, startSession } from "@/lib/auth";
import { minutesLocked, recordFail, clearFails, lockMessage } from "@/lib/throttle";

export async function changePassword(prev, form) {
  const user = await getUser();
  if (!user) redirect("/login");
  const cur = String(form.get("current") || ""), nw = String(form.get("new") || ""), conf = String(form.get("confirm") || "");
  const key = `pw:${user.id}`;
  const m = minutesLocked(key);
  if (m) return { error: lockMessage(m) };

  const row = one("SELECT password_hash FROM users WHERE id = ?", user.id);
  if (!verifyPassword(cur, row?.password_hash)) { recordFail(key); return { error: "Purana password galat hai." }; }
  const bad = checkPassword(nw, user.mobile);
  if (bad) return { error: bad };
  if (nw !== conf) return { error: "Dono naye password same nahi hain." };

  run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(nw), user.id);
  clearFails(key);
  await startSession(user.id); // is device ka login naye password ke saath chalta rahe
  return { ok: "Password badal gaya. Baaki sabhi devices se logout ho gaye." };
}
