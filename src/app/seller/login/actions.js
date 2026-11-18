"use server";
import { redirect } from "next/navigation";
import { one, run, transaction } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { otpRequired } from "@/lib/perms";
import { clientIp, minutesLocked, recordFail, clearFails, lockMessage } from "@/lib/throttle";
import { verifyTotp, openSecret, sealSecret, hashBackup, makeBackupCodes } from "@/lib/totp";
import { setPre, getPre, clearPre, setTrusted, isTrusted, completeLogin, getActor, staffRow } from "@/lib/staffauth";
import { logAct } from "@/lib/activity";

// Step 1: email ya mobile + password
export async function staffLogin(prev, form) {
  const id = String(form.get("id") || "").trim().toLowerCase();
  const pw = String(form.get("password") || "");
  const remember = form.get("remember") === "on";
  const acct = `staff:${id}`, ipKey = `ip:${await clientIp()}`;
  const m = Math.max(minutesLocked(acct), minutesLocked(ipKey));
  if (m) return { error: lockMessage(m) };

  const u = id ? one("SELECT * FROM users WHERE (lower(email) = ? OR mobile = ?) AND role IN ('seller','manager','operator')", id, id) : null;
  if (!u || u.disabled || !verifyPassword(pw, u.password_hash)) {
    recordFail(acct, 5);
    recordFail(ipKey, 20);
    return { error: "Email ya mobile, ya password galat hai." }; // kaunsa galat hai ye jaanbujhkar nahi batate
  }
  clearFails(acct);

  if (u.totp_secret) {
    if (await isTrusted(u)) { await completeLogin(u, remember); redirect("/seller"); }
    await setPre(u.id, remember);
    redirect("/seller/login/verify");
  }
  if (otpRequired(u.role)) { await setPre(u.id, remember); redirect("/seller/login/setup"); }
  await completeLogin(u, remember);
  redirect("/seller");
}

// Step 2: authenticator ka 6 digit code (ya backup code)
export async function verifyOtp(prev, form) {
  const pre = await getPre();
  if (!pre) redirect("/seller/login");
  const u = pre.user, key = `otp:${u.id}`;
  const m = minutesLocked(key);
  if (m) return { error: lockMessage(m) };

  const code = String(form.get("code") || "").trim();
  const digits = code.replace(/\s/g, "");
  let ok = false;
  if (/^\d{6}$/.test(digits)) {
    const step = u.totp_secret ? verifyTotp(openSecret(u.totp_secret), digits, u.totp_last || 0) : null;
    if (step) { run("UPDATE users SET totp_last = ? WHERE id = ?", step, u.id); ok = true; }
  } else if (code.length >= 8) {
    const row = one("SELECT id FROM backup_codes WHERE user_id = ? AND hash = ? AND used_at IS NULL", u.id, hashBackup(code));
    if (row) { run("UPDATE backup_codes SET used_at = datetime('now') WHERE id = ?", row.id); logAct(u, "Backup code use kiya"); ok = true; }
  }
  if (!ok) { recordFail(key, 5); return { error: "Code galat hai. App mein naya code dekhein (har 30 second mein badalta hai)." }; }

  clearFails(key);
  if (form.get("trust") === "on") await setTrusted(u);
  await completeLogin(u, pre.remember);
  redirect("/seller");
}

export async function backToLogin() {
  await clearPre();
  redirect("/seller/login");
}

// OTP setup (login ke beech ya Security page se): app ka code sahi ho to OTP chalu aur 8 backup codes
export async function confirmSetup(prev, form) {
  const a = await getActor();
  if (!a) redirect("/seller/login");
  const u = a.user, key = `otpsetup:${u.id}`;
  const m = minutesLocked(key);
  if (m) return { error: lockMessage(m) };
  if (u.totp_secret) return { error: "OTP pehle se chalu hai." };
  let pending = null;
  try { pending = u.totp_pending ? openSecret(u.totp_pending) : null; } catch {}
  if (!pending) return { error: "Page dobara kholein." };

  const step = verifyTotp(pending, String(form.get("code") || ""), 0);
  if (!step) { recordFail(key, 5); return { error: "Code galat hai. App mein dikha abhi ka code daalein." }; }
  clearFails(key);

  const codes = makeBackupCodes(8);
  transaction(() => {
    run("UPDATE users SET totp_secret = totp_pending, totp_pending = NULL, totp_last = ? WHERE id = ?", step, u.id);
    run("DELETE FROM backup_codes WHERE user_id = ?", u.id);
    for (const c of codes) run("INSERT INTO backup_codes (user_id, hash) VALUES (?, ?)", u.id, hashBackup(c));
  });
  logAct(u, "OTP chalu kiya");
  return { ok: true, codes };
}

export async function finishSetup() {
  const a = await getActor();
  if (!a) redirect("/seller/login");
  if (a.viaPre) { await completeLogin(staffRow(a.user.id), a.remember); redirect("/seller"); }
  redirect("/seller/security");
}
