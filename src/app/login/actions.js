"use server";
import { redirect } from "next/navigation";
import { one, run } from "@/lib/db";
import { hashPassword, verifyPassword, startSession, checkPassword } from "@/lib/auth";
import { clientIp, minutesLocked, recordFail, clearFails, lockMessage } from "@/lib/throttle";

// sirf apni website ke andar ka raasta allow karte hain
function safeNext(v) {
  v = String(v || "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/account";
}

export async function buyerLogin(prev, form) {
  const mobile = String(form.get("mobile") || "").trim();
  const password = String(form.get("password") || "");
  const acct = `buyer:${mobile}`, ipKey = `ip:${await clientIp()}`;
  const m = Math.max(minutesLocked(acct), minutesLocked(ipKey));
  if (m) return { error: lockMessage(m) };
  const u = one("SELECT * FROM users WHERE mobile = ? AND role = 'buyer'", mobile);
  if (!u || !verifyPassword(password, u.password_hash)) {
    recordFail(acct, 5);
    recordFail(ipKey, 20);
    return { error: "Mobile number ya password galat hai." };
  }
  clearFails(acct);
  await startSession(u.id);
  redirect(safeNext(form.get("next")));
}

export async function buyerRegister(prev, form) {
  const name = String(form.get("name") || "").trim();
  const mobile = String(form.get("mobile") || "").trim();
  const password = String(form.get("password") || "");
  if (name.length < 2) return { error: "Apna naam likhein." };
  if (!/^[6-9]\d{9}$/.test(mobile)) return { error: "10 digit ka sahi mobile number daalein." };
  const bad = checkPassword(password, mobile);
  if (bad) return { error: bad };
  if (one("SELECT id FROM users WHERE mobile = ?", mobile)) {
    return { error: "Ye mobile number pehle se registered hai. Login karein." };
  }
  const r = run(
    "INSERT INTO users (name, mobile, password_hash, role) VALUES (?, ?, ?, 'buyer')",
    name, mobile, hashPassword(password)
  );
  await startSession(Number(r.lastInsertRowid));
  redirect(safeNext(form.get("next")));
}
