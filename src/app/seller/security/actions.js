"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run, transaction } from "@/lib/db";
import { requireStaff, verifyPassword, hashPassword, checkPassword, startSession } from "@/lib/auth";
import { otpRequired } from "@/lib/perms";
import { minutesLocked, recordFail, clearFails, lockMessage } from "@/lib/throttle";
import { makeBackupCodes, hashBackup } from "@/lib/totp";
import { logAct } from "@/lib/activity";

async function me() {
  const u = await requireStaff({ allowSetup: true });
  return one("SELECT * FROM users WHERE id = ?", u.id);
}
// password galat ho to 5 baar ke baad 15 minute rok
function checkPw(u, pw) {
  const key = `pw:${u.id}`, m = minutesLocked(key);
  if (m) return lockMessage(m);
  if (!verifyPassword(pw, u.password_hash)) { recordFail(key, 5); return "Apna password galat hai."; }
  clearFails(key);
  return "";
}

export async function changePassword(prev, form) {
  const u = await me();
  const cur = String(form.get("current") || ""), nw = String(form.get("new") || ""), conf = String(form.get("confirm") || "");
  const bad = checkPw(u, cur) || checkPassword(nw, u.mobile || "") || (nw !== conf ? "Dono naye password same nahi hain." : "");
  if (bad) return { error: bad };
  if (nw === cur) return { error: "Naya password purane se alag rakhein." };
  run("UPDATE users SET password_hash = ?, must_change = 0 WHERE id = ?", hashPassword(nw), u.id);
  await startSession(u.id, 8); // baaki sab devices se logout, is device ka login chalta rahe
  logAct(u, "Password badla");
  revalidatePath("/seller", "layout");
  return { ok: "Password badal gaya. Baaki devices se logout ho gaye." };
}

export async function disableOtp(prev, form) {
  const u = await me();
  if (otpRequired(u.role)) return { error: "Aapke role ke liye OTP zaroori hai, band nahi ho sakta." };
  const bad = checkPw(u, String(form.get("password") || ""));
  if (bad) return { error: bad };
  transaction(() => {
    run("UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_last = 0 WHERE id = ?", u.id);
    run("DELETE FROM backup_codes WHERE user_id = ?", u.id);
  });
  logAct(u, "OTP band kiya");
  revalidatePath("/seller", "layout");
  return { ok: "OTP band ho gaya." };
}

export async function newBackupCodes(prev, form) {
  const u = await me();
  if (!u.totp_secret) return { error: "Pehle OTP chalu karein." };
  const bad = checkPw(u, String(form.get("password") || ""));
  if (bad) return { error: bad };
  const codes = makeBackupCodes(8);
  transaction(() => {
    run("DELETE FROM backup_codes WHERE user_id = ?", u.id);
    for (const c of codes) run("INSERT INTO backup_codes (user_id, hash) VALUES (?, ?)", u.id, hashBackup(c));
  });
  logAct(u, "Naye backup codes banaye");
  return { ok: "Naye backup codes ban gaye. Purane ab nahi chalenge.", codes };
}
