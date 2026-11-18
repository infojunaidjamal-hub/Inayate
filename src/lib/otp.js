// Mobile / email badalne ke liye verification code (OTP). Server only.
//
// ABHI: TEST MODE. Asli SMS / email nahi jata. Code terminal mein chhapta hai aur
//       screen par bhi dikhta hai, taaki aap flow test kar sako.
// BAAD MEIN: sendCode() mein email ya SMS service jodni hai, aur .env mein OTP_MODE=live likhna hai.
//
// Test mode kab chalu hota hai:
//   - npm run dev mein apne aap (jab tak OTP_MODE=live na likha ho)
//   - asli server (production) par SIRF tab, jab .env mein OTP_MODE=test likha ho
//   - production par kuch na likha ho to code bheja hi nahi jata (suraksha ke liye)
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { one, run } from "@/lib/db";

export const TTL_MS = 10 * 60 * 1000; // code 10 minute chalta hai
export const MAX_TRIES = 5;           // galat code ki koshish
const MAX_SENDS_PER_HOUR = 5;

export const testMode = () =>
  process.env.OTP_MODE === "test" || (process.env.NODE_ENV !== "production" && process.env.OTP_MODE !== "live");

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET set karna zaroori hai");
  return "maison-dev-secret-change-me";
}
const hashOf = (userId, kind, target, code) => createHmac("sha256", secret()).update(`${userId}|${kind}|${target}|${code}`).digest("hex");

// Yahan baad mein asli email / SMS bhejna jodna hai. channel = "mobile" ya "email"
async function sendCode(channel, to, code) {
  if (testMode()) {
    console.log(`\n[TEST OTP] ${channel} ${to}  ->  code ${code}\n`);
    return { test: true };
  }
  // Example (baad mein): if (channel === "email") await sendEmail(to, ...); else await sendSms(to, ...);
  throw new Error("OTP_NOT_CONFIGURED");
}

// Naya code banata hai aur bhejta hai. Return: { error } ya { ok, devCode? }
export async function startOtp(userId, kind, target) {
  const now = Date.now();
  const sent = one("SELECT COUNT(*) c FROM otp_codes WHERE user_id = ? AND created_at > ?", userId, now - 60 * 60 * 1000).c;
  if (sent >= MAX_SENDS_PER_HOUR) return { error: "Bahut baar code manga liya. Thodi der baad dobara try karein." };
  const code = String(randomInt(100000, 1000000));
  try {
    await sendCode(kind, target, code);
  } catch (e) {
    if (String(e.message) === "OTP_NOT_CONFIGURED") return { error: "Code bhejne ki service abhi chalu nahi hai. Number ya email badalne ke liye humein WhatsApp par likhein." };
    throw e;
  }
  // purane codes rehne dete hain (sirf sabse naya chalta hai) taaki "ghante mein 5 code" ki ginti sahi rahe
  run("DELETE FROM otp_codes WHERE created_at < ?", now - 24 * 60 * 60 * 1000);
  run("INSERT INTO otp_codes (user_id, kind, target, code_hash, expires_at, created_at) VALUES (?,?,?,?,?,?)", userId, kind, target, hashOf(userId, kind, target, code), now + TTL_MS, now);
  return { ok: true, devCode: testMode() ? code : undefined };
}

// Code check karta hai. Return: { error } ya { target }
export function checkOtp(userId, kind, code) {
  const row = one("SELECT * FROM otp_codes WHERE user_id = ? AND kind = ? ORDER BY id DESC LIMIT 1", userId, kind);
  if (!row || row.expires_at < Date.now()) return { error: "Code ki samay seema khatam ho gayi. Naya code mangwayein." };
  if (row.attempts >= MAX_TRIES) return { error: "Bahut galat koshish hui. Naya code mangwayein." };
  run("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?", row.id);
  const a = Buffer.from(hashOf(userId, kind, row.target, String(code || "").trim()), "hex");
  const b = Buffer.from(row.code_hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: "Code galat hai. Dobara dekhein." };
  run("DELETE FROM otp_codes WHERE user_id = ? AND kind = ?", userId, kind);
  return { target: row.target };
}
