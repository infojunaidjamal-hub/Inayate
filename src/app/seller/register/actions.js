"use server";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { one, run } from "@/lib/db";
import { hashPassword, startSession, checkPassword } from "@/lib/auth";
import { clientIp, minutesLocked, recordFail, lockMessage } from "@/lib/throttle";

const sha = (s) => createHash("sha256").update(String(s)).digest();

export async function sellerRegister(prev, form) {
  // Seller panel mein saare orders aur customers ka data hota hai,
  // isliye register karne ke liye owner ka diya hua secret code zaroori hai.
  const required = process.env.SELLER_SIGNUP_CODE;
  if (!required) return { error: "Seller registration abhi band hai. Store owner se sampark karein." };

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const mobile = String(form.get("mobile") || "").trim();
  const password = String(form.get("password") || "");
  const code = String(form.get("code") || "");

  if (name.length < 2) return { error: "Apna naam likhein." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Sahi email daalein." };
  if (!/^[6-9]\d{9}$/.test(mobile)) return { error: "10 digit ka sahi mobile number daalein." };
  const bad = checkPassword(password, mobile);
  if (bad) return { error: bad };
  const codeKey = `sellercode:${await clientIp()}`;
  const m = minutesLocked(codeKey);
  if (m) return { error: lockMessage(m) };
  if (!timingSafeEqual(sha(code), sha(required))) { recordFail(codeKey, 5); return { error: "Seller code galat hai." }; }

  if (one("SELECT id FROM users WHERE email = ?", email)) {
    return { error: "Ye email pehle se registered hai. Login karein." };
  }
  if (one("SELECT id FROM users WHERE mobile = ?", mobile)) {
    return { error: "Ye mobile number pehle se registered hai." };
  }

  const r = run(
    "INSERT INTO users (name, mobile, email, password_hash, role) VALUES (?, ?, ?, ?, 'seller')",
    name, mobile, email, hashPassword(password)
  );
  await startSession(Number(r.lastInsertRowid));
  redirect("/seller");
}
